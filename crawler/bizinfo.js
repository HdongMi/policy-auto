import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const API_URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20260101`;

  try {
    console.log(`📡 [1/2] 중기부 리스트 1~5페이지 확보 중...`);
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

    console.log(`📡 [2/2] 상세 날짜 정밀 수집 시작 (시작일만 있는 케이스 포함)...`);
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
          const detailRes = await fetch(finalLink, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
          });
          const detailHtml = await detailRes.text();
          
          // 🔍 모든 태그를 제거하고 공백을 최소화한 텍스트로 변환
          const cleanText = detailHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, '');

          // 🔥 개선된 정규식: "신청기간" 뒤에 오는 날짜와 기호를 최대한 많이 긁어옴
          // YYYY-MM-DD 형식 뒤에 ~가 오고 그 뒤에 날짜가 오거나 안 오거나 모두 허용
          const dateRegex = /신청기간(\d{4}-\d{2}-\d{2}(?:\s*~\s*(?:\d{4}-\d{2}-\d{2})?)?)/;
          const dateMatch = cleanText.match(dateRegex);

          if (dateMatch && dateMatch[1]) {
            deadline = dateMatch[1].trim();
            // 끝에 ~만 남은 경우 "상시" 또는 그대로 표시
            if (deadline.endsWith('~')) deadline += " 예산 소진 시";
            console.log(`✅ [성공] ${deadline} | ${title.substring(0, 15)}`);
          } else {
            console.log(`⚠️ [미발견] ${title.substring(0, 15)}`);
          }
        } catch (e) {
          console.log(`❌ 접속실패: ${title.substring(0, 10)}`);
        }
      }

      return {
        title,
        region: getV(item.areaNm) || "전국",
        deadline,
        source: "중소벤처기업부",
        link: finalLink
      };
    }));

    const filteredPolicies = newPolicies.filter(p => p !== null);
    fs.writeFileSync(filePath, JSON.stringify(filteredPolicies, null, 2), "utf8");
    console.log(`\n✨ 업데이트 완료!`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
