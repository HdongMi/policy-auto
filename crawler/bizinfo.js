import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101"; // 수집 시작일
  
  // 기업마당 공고 목록 API 호출 (100건)
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 기업마당 데이터 수집 및 검색 최적화 링크 생성 중...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = getV(item.title || item.pblancNm).trim();
      
      // 💡 해결책: 중기부 메인으로 튕기는 현상 방지
      // 기업마당 내부 검색 파라미터(searchKeyword)를 사용하여 검색 결과 페이지로 직접 연결
      const searchLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?searchKeyword=${encodeURIComponent(title)}`;

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부(기업마당)",
        link: searchLink
      };
    }).filter(p => p.title);

    // JSON 파일로 저장
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 업데이트 완료! 총 ${newPolicies.length}건의 공고가 검색 최적화 링크로 연결되었습니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
