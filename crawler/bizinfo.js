import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const API_URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20260101`;

  try {
    console.log(`📡 [1/3] 중기부 리스트 1~5페이지 확보 중...`);
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

    console.log(`📡 [2/3] API 데이터 대조 및 상세 날짜 정밀 수집...`);
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
          
          // 🔍 정밀 날짜 추출 로직: 모든 태그 제거 후 텍스트만 추출
          const plainText = detailHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

          // 패턴 1: 0000-00-00 ~ 0000-00-00 (가장 일반적)
          const pattern1 = /신청기간\s*(\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2})/;
          // 패턴 2: 연월일 형식 (0000.00.00 ~ 0000.00.00)
          const pattern2 = /신청기간\s*(\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2})/;
          // 패턴 3: 글자 사이 공백 무시
          const pattern3 = /(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/;

          const match1 = plainText.match(pattern1);
          const match2 = plainText.match(pattern2);
          const match3 = plainText.match(pattern3);

          if (match1) deadline = match1[1].trim();
          else if (match2) deadline = match2[1].replace(/\./g, '-').trim();
          else if (match3) deadline = `${match3[1]} ~ ${match3[2]}`;

          if (deadline !== "상세참조") {
            console.log(`✅ [날짜추출] ${deadline} | ${title.substring(0, 15)}...`);
          } else {
            console.log(`⚠️ [날짜미발견] ${title.substring(0, 15)}...`);
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
    console.log(`\n✨ [최종완료] 총 ${filteredPolicies.length}건 업데이트 완료.`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
