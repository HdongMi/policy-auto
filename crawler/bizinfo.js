import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101";
  
  // 중기부 API 호출
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 중기부 사이트 검색 연동 모드로 수집 시작...`);
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
      
      // 💡 핵심: 중소벤처기업부 공식 홈페이지 통합검색 링크 생성
      // 이 주소는 중기부 서버에서 해당 제목으로 검색한 결과 리스트를 바로 보여줍니다.
      const mssSearchLink = `https://www.mss.go.kr/site/smba/main.do?guideIdx=0&searchKey=all&searchKeyword=${encodeURIComponent(title)}`;

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: mssSearchLink
      };
    }).filter(p => p.title);

    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 업데이트 완료! 중기부 검색 링크로 총 ${newPolicies.length}건 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
