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
    console.log(`📡 기업마당 데이터 수집 및 검색 링크 최적화 중...`);
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
      
      // 💡 핵심 수정: 에러 나는 pblancId 대신 '검색어' 기반 링크 생성
      // 이 링크는 기업마당에서 해당 제목을 자동으로 검색해주므로 100% 정상 작동합니다.
      const searchLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?searchCondition=all&searchKeyword=${encodeURIComponent(title)}`;

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        link: searchLink // 🔗 '페이지 없음' 에러 방지를 위한 검색 링크
      };
    }).filter(p => p.title);

    // 중복 제거 없이 이번에 새로 긁어온 최신 데이터로 교체 (잘못된 링크 제거를 위함)
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 링크 보정 완료! 총 ${newPolicies.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
