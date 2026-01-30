import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

// 타임아웃 기능 (페이지가 안 열리면 5초 후 포기하고 다음으로)
const fetchWithTimeout = (url, options = {}, timeout = 5000) => {
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
    console.log(`📡 초고속 병렬 크롤링 모드 가동...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    // 🚀 [핵심] 모든 공고를 동시에 처리하기 (Promise.all)
    const newPolicies = await Promise.all(itemsArray.map(async (item) => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = getV(item.title || item.pblancNm).trim();
      let deadline = getV(item.pblancEnddt) || "상세참조";
      let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=ALL&searchKeyword=${encodeURIComponent(title)}`;

      try {
        // 리스트 페이지 호출 (5초 타임아웃)
        const searchRes = await fetchWithTimeout(finalLink);
        const html = await searchRes.text();
        const match = html.match(/bcIdx=(\d+)/);

        if (match && match[1]) {
          const bcIdx = match[1];
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${bcIdx}`;
          
          // 상세 페이지 호출 (5초 타임아웃)
          const detailRes = await fetchWithTimeout(finalLink);
          const detailHtml = await detailRes.text();
          const datePattern = /신청기간\s*[:\s]*(\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2})/;
          const dateMatch = detailHtml.match(datePattern);
          
          if (dateMatch && dateMatch[1]) {
            deadline = dateMatch[1].trim();
          }
        }
      } catch (e) {
        // 에러 나면 기본 정보만 유지하고 패스
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
    console.log(`✅ 총 ${newPolicies.length}건, 초고속 수집 완료!`);

  } catch (error) {
    console.error("❌ 치명적 오류:", error.message);
  }
}

run();
