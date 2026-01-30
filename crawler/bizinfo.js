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
    console.log(`📡 기업마당 데이터 수집 및 링크 안정화 작업 중...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else if (text.startsWith("{") || text.includes('"response"')) {
      const data = JSON.parse(text);
      itemsArray = data.response?.body?.items || [];
    }

    if (itemsArray.length === 0) return;

    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      const title = getV(item.title || item.pblancNm).trim();
      const apiLink = getV(item.pblancUrl); // API가 주는 원본 링크
      
      let finalLink = "";

      // 💡 에러 방지 핵심 로직
      // 1. API에서 준 링크가 제대로 된 주소(http 포함)인 경우만 사용
      if (apiLink && apiLink.includes("http")) {
        finalLink = apiLink;
      } else {
        // 2. 링크가 없거나 깨진 경우, "페이지 없음" 에러 대신 기업마당 공고 목록 메인으로 보냅니다.
        // 여기서 사용자가 직접 제목으로 검색하는 것이 에러 페이지를 보는 것보다 훨씬 낫습니다.
        finalLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do`;
      }

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        link: finalLink
      };
    }).filter(p => p.title);

    // 중복 제거 없이 최신 데이터로 덮어쓰기 (잘못된 데이터 청소)
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 링크 안정화 완료! 총 ${newPolicies.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
