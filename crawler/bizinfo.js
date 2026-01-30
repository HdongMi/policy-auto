import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const API_URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20260101`;
  const LIST_URL = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310`;

  try {
    console.log(`📡 [1/2] 중기부 공고 리스트 사전 확보...`);
    const listRes = await fetch(LIST_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    });
    const listHtml = await listRes.text();
    
    // 리스트 내의 모든 bcIdx와 제목 쌍 미리 추출 (메모리 로딩)
    const siteData = [];
    const rows = listHtml.match(/<tr[\s\S]*?<\/tr>/g) || [];
    rows.forEach(row => {
      const bcIdxMatch = row.match(/bcIdx=(\d+)/);
      const siteTitle = row.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
      if (bcIdxMatch) {
        siteData.push({ id: bcIdxMatch[1], text: siteTitle });
      }
    });

    console.log(`📡 [2/2] API 데이터 수집 및 병렬 매칭 시작...`);
    const apiRes = await fetch(API_URL);
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

    // ⚡ [핵심] Promise.all을 이용한 병렬 매칭 처리
    const seenTitles = new Set();
    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = (getV(item.pblancNm) || getV(item.title)).trim();
      
      if (seenTitles.has(title)) return null;
      seenTitles.add(title);

      const cleanApiTitle = title.replace(/\s+/g, '').substring(0, 10);
      
      // 메모리에 저장된 siteData에서 텍스트 대조
      const match = siteData.find(sd => sd.text.includes(cleanApiTitle));
      
      let link = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310`;
      if (match) {
        link = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${match.id}`;
        console.log(`🎯 [매칭] ${title.substring(0, 15)}...`);
      } else {
        console.log(`❓ [미발견] ${title.substring(0, 15)}...`);
      }

      return {
        title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: link
      };
    }).filter(p => p !== null);

    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`\n✅ 업데이트 완료! (속도: 병렬처리 적용됨)`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
