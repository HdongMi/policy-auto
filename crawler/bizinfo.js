import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  // 2026년 데이터 수집
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20260101`;

  try {
    console.log(`🚀 [성공예감] 중기부 데이터 정밀 매칭 및 동기화 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else {
      const jsonData = JSON.parse(text);
      itemsArray = jsonData.response?.body?.items || [];
    }

    const finalPolicies = [];
    const seenTitles = new Set(); // 중복 공고 방지

    for (const item of itemsArray) {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const rawTitle = (getV(item.pblancNm) || getV(item.title)).trim();
      
      // 1. 중복 데이터 스킵 (창업성공패키지 등 중복 방지)
      if (seenTitles.has(rawTitle)) continue;
      seenTitles.add(rawTitle);

      // 2. 검색 시도 (제목 앞 15자만 사용하여 매칭률 향상)
      const searchKeyword = rawTitle.substring(0, 15);
      const searchUrl = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=TITLE&searchKeyword=${encodeURIComponent(searchKeyword)}`;
      let finalLink = searchUrl;

      try {
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
        });
        const html = await res.text();

        // 3. 행 단위 정밀 대조
        const rows = html.match(/<tr[\s\S]*?<\/tr>/g) || [];
        let foundBcIdx = null;

        for (const row of rows) {
          const rowText = row.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
          const cleanTitle = rawTitle.replace(/\s+/g, '').substring(0, 10);

          if (rowText.includes(cleanTitle)) {
            const bcIdxMatch = row.match(/bcIdx=(\d+)/);
            if (bcIdxMatch) {
              foundBcIdx = bcIdxMatch[1];
              break; 
            }
          }
        }

        if (foundBcIdx) {
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${foundBcIdx}`;
          console.log(`✅ 매칭성공: ${foundBcIdx} | ${rawTitle.substring(0, 20)}`);
        } else {
          console.log(`⚠️ 상세주소 미발견(리스트 유지): ${rawTitle.substring(0, 15)}`);
        }
      } catch (e) {
        console.log(`❌ 접속지연: ${rawTitle.substring(0, 10)}`);
      }

      finalPolicies.push({
        title: rawTitle,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: finalLink
      });

      await new Promise(r => setTimeout(r, 100)); 
    }

    fs.writeFileSync(filePath, JSON.stringify(finalPolicies, null, 2), "utf8");
    console.log(`\n✨ [완료] 총 ${finalPolicies.length}건의 공고가 정렬되었습니다!`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
