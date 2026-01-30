import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101";
  
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 중기부 상세 데이터 정밀 수집 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    const newPolicies = [];

    for (const item of itemsArray) {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = getV(item.title || item.pblancNm).trim();
      let deadline = getV(item.pblancEnddt) || "상세참조"; // API 기본값
      
      let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=ALL&searchKeyword=${encodeURIComponent(title)}`;

      try {
        const searchRes = await fetch(finalLink);
        const html = await searchRes.text();
        
        // 1. 게시물 번호(bcIdx) 추출
        const match = html.match(/bcIdx=(\d+)/);
        if (match && match[1]) {
          const bcIdx = match[1];
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${bcIdx}`;
          
          // 2. 🔍 상세 페이지에 직접 접속해서 "신청기간" 긁어오기
          const detailRes = await fetch(finalLink);
          const detailHtml = await detailRes.text();
          
          // HTML 내에서 "신청기간" 뒤에 오는 날짜 패턴(0000-00-00 ~ 0000-00-00)을 찾습니다.
          const datePattern = /신청기간\s*[:\s]*(\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2})/;
          const dateMatch = detailHtml.match(datePattern);
          
          if (dateMatch && dateMatch[1]) {
            deadline = dateMatch[1].trim(); // 예: "2026-02-11 ~ 2026-03-03"
            console.log(`✅ 날짜 확보: ${deadline} | ${title}`);
          }
        }
      } catch (e) {
        console.log(`⚠️ 상세 데이터 추출 중 오류: ${title}`);
      }

      newPolicies.push({
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: deadline,
        source: "중소벤처기업부",
        link: finalLink
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 총 ${newPolicies.length}건 정밀 업데이트 완료!`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
