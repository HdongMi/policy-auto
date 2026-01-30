import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const API_URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=20260101`;

  try {
    console.log(`📡 [1/3] 중기부 리스트 광역 확보 (1~5페이지)...`);
    const pageIndices = [1, 2, 3, 4, 5];
    const pageRequests = pageIndices.map(page => 
      fetch(`https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&pageIndex=${page}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
      }).then(res => res.text())
    );
    const pagesHtml = await Promise.all(pageRequests);
    
    const siteData = [];
    pagesHtml.forEach(listHtml => {
      const rows = listHtml.match(/<tr[\s\S]*?<\/tr>/g) || [];
      rows.forEach(row => {
        const bcIdxMatch = row.match(/bcIdx=(\d+)/);
        const siteTitle = row.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
        if (bcIdxMatch) siteData.push({ id: bcIdxMatch[1], text: siteTitle });
      });
    });

    console.log(`📡 [2/3] API 데이터 수집 및 상세 페이지 접속 중...`);
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

    const seenTitles = new Set();
    
    // ⚡ [핵심] 상세 페이지 내용을 긁어오는 병렬 처리 로직
    const newPolicies = await Promise.all(itemsArray.map(async (item) => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = (getV(item.pblancNm) || getV(item.title)).trim();
      
      if (seenTitles.has(title)) return null;
      seenTitles.add(title);

      const cleanApiTitle = title.replace(/\s+/g, '').substring(0, 8);
      const match = siteData.find(sd => sd.text.includes(cleanApiTitle));
      
      let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310`;
      let deadline = "상세참조";

      if (match) {
        finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${match.id}`;
        
        try {
          // 🔍 상세 페이지에서 날짜(신청기간) 추출
          const detailRes = await fetch(finalLink, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
          });
          const detailHtml = await detailRes.text();
          
          // "신청기간" 텍스트 이후의 날짜 패턴 추출
          const datePattern = /신청기간.*?(\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d.2}-\d{2})/;
          const dateMatch = detailHtml.replace(/\s+/g, ' ').match(datePattern);
          
          if (dateMatch && dateMatch[1]) {
            deadline = dateMatch[1].trim();
            console.log(`✅ 날짜확정: [${deadline}] ${title.substring(0, 15)}...`);
          } else {
            console.log(`🎯 매칭완료(날짜미발견): ${title.substring(0, 15)}...`);
          }
        } catch (e) {
          console.log(`⚠️ 상세페이지 접속 실패: ${title.substring(0, 10)}`);
        }
      } else {
        console.log(`❓ 미발견: ${title.substring(0, 15)}...`);
      }

      return {
        title,
        region: getV(item.areaNm) || "전국",
        deadline: deadline,
        source: "중소벤처기업부",
        link: finalLink
      };
    }));

    const filteredPolicies = newPolicies.filter(p => p !== null);
    fs.writeFileSync(filePath, JSON.stringify(filteredPolicies, null, 2), "utf8");
    console.log(`\n✨ [복구완료] 총 ${filteredPolicies.length}건 저장 (날짜 포함)`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
