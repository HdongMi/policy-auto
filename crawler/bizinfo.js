import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const fetchWithTimeout = (url, options = {}, timeout = 8000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]);
};

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101";
  
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 중기부 데이터 정밀 수집 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    const newPolicies = await Promise.all(itemsArray.map(async (item) => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = getV(item.title || item.pblancNm).trim();
      let deadline = "상세참조"; 
      let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=ALL&searchKeyword=${encodeURIComponent(title)}`;

      try {
        const searchRes = await fetchWithTimeout(finalLink);
        const html = await searchRes.text();
        const match = html.match(/bcIdx=(\d+)/);

        if (match && match[1]) {
          const bcIdx = match[1];
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${bcIdx}`;
          
          const detailRes = await fetchWithTimeout(finalLink);
          const detailHtml = await detailRes.text();

          // 🔍 정규식 강화: "신청기간" 단어와 날짜 사이의 모든 노이즈 무시
          // 날짜 형식 0000-00-00 ~ 0000-00-00 추출
          const datePattern = /신청기간.*?(\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2})/;
          const dateMatch = detailHtml.replace(/\s+/g, ' ').match(datePattern);
          
          if (dateMatch && dateMatch[1]) {
            deadline = dateMatch[1].trim();
            console.log(`✅ 수집성공: ${deadline} | ${title}`);
          }
        }
      } catch (e) {
        console.log(`❌ 수집실패(${title}): ${e.message}`);
      }

      return {
        title,
        region: getV(item.areaNm) || "전국",
        deadline,
        source: "중소벤처기업부",
        link: finalLink
      };
    }));

    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 업데이트 완료!`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
