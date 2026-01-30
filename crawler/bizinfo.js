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
    console.log(`📡 기업마당 데이터 수집 및 네이버 검색 링크 생성 중...`);
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
      
      // 💡 해결책: 에러 나는 주소 대신, 네이버에서 '기업마당 + 공고명'으로 검색하도록 링크 생성
      const naverLink = `https://search.naver.com/search.naver?query=${encodeURIComponent("기업마당 " + title)}`;

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        link: naverLink
      };
    }).filter(p => p.title);

    // 기존 데이터를 다 지우고 새 링크(네이버)로 모두 교체
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 링크 보정 완료! 이제 모든 공고가 네이버 검색으로 연결됩니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
