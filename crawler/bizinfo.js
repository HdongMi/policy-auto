import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

// ── 딜레이 유틸 ──────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── 재시도 fetch (최대 3회) ──────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9",
          ...(options.headers || {})
        },
        timeout: 15000,
      });
      return res;
    } catch (e) {
      const isLast = i === retries - 1;
      console.log(`  ⚠️ 요청 실패 (${i + 1}/${retries}): ${e.message}`);
      if (isLast) throw e;
      console.log(`  ⏳ ${delay / 1000}초 후 재시도...`);
      await sleep(delay);
      delay *= 1.5; // 재시도마다 딜레이 증가
    }
  }
}

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const API_URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20260101`;

  try {
    console.log(`📡 [1/2] 중기부 리스트 1~5페이지 순차 수집 중...`);

    // ── 핵심 수정: 동시 요청 → 순차 요청 + 딜레이 ──────────
    const siteData = [];
    for (let page = 1; page <= 5; page++) {
      console.log(`  📄 ${page}페이지 요청 중...`);
      try {
        const res = await fetchWithRetry(
          `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&pageIndex=${page}`
        );
        const listHtml = await res.text();

        const rows = listHtml.match(/<tr[\s\S]*?<\/tr>/g) || [];
        rows.forEach(row => {
          const bcIdxMatch = row.match(/bcIdx=(\d+)/);
          const siteTitle = row.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
          if (bcIdxMatch) siteData.push({ id: bcIdxMatch[1], text: siteTitle });
        });

        console.log(`  ✅ ${page}페이지 완료 (누적 ${siteData.length}개)`);
      } catch (e) {
        console.log(`  ❌ ${page}페이지 실패: ${e.message} → 건너뜀`);
      }

      // 페이지 간 딜레이 (1.5초)
      if (page < 5) await sleep(1500);
    }

    console.log(`\n📡 [2/2] API 데이터 수집 중...`);
    const apiRes = await fetchWithRetry(API_URL);
    const apiText = await apiRes.text();

    let itemsArray = [];
    if (apiText.includes("<item>")) {
      const xmlData = await parseStringPromise(apiText);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else {
      const jsonData = JSON.parse(apiText);
      itemsArray = jsonData.response?.body?.items || [];
    }

    console.log(`\n📋 총 ${itemsArray.length}개 항목 처리 시작...\n`);

    const seenTitles = new Set();
    const filteredPolicies = [];

    // ── 핵심 수정: Promise.all → 순차 처리 + 딜레이 ────────
    for (const item of itemsArray) {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = (getV(item.pblancNm) || getV(item.title)).trim();

      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      const cleanApiTitle = title.replace(/\s+/g, '').substring(0, 8);
      const match = siteData.find(sd => sd.text.includes(cleanApiTitle));

      let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310`;
      let deadline = "상세참조";

      if (match) {
        finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${match.id}`;

        try {
          const detailRes = await fetchWithRetry(finalLink);
          const detailHtml = await detailRes.text();

          const cleanText = detailHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
          const dateRegex = /신청기간(\d{4}-\d{2}-\d{2}(?:\s*~\s*(?:\d{4}-\d{2}-\d{2})?)?)/;
          const dateMatch = cleanText.match(dateRegex);

          if (dateMatch && dateMatch[1]) {
            deadline = dateMatch[1].trim();
            if (deadline.endsWith('~')) deadline += " 예산 소진 시";
            console.log(`✅ [성공] ${deadline} | ${title.substring(0, 15)}`);
          } else {
            console.log(`⚠️ [미발견] ${title.substring(0, 15)}`);
          }
        } catch (e) {
          console.log(`❌ 접속실패: ${title.substring(0, 10)}`);
        }

        // 상세 페이지 간 딜레이 (1초)
        await sleep(1000);
      }

      filteredPolicies.push({
        title,
        region: getV(item.areaNm) || "전국",
        deadline,
        source: "중소벤처기업부",
        link: finalLink
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(filteredPolicies, null, 2), "utf8");
    console.log(`\n✨ 업데이트 완료! 총 ${filteredPolicies.length}개 저장`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
    process.exit(1);
  }
}

run();
