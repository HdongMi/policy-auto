import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  
  // 2025년 1월 1일 이후 공고를 100건 가져옵니다.
  const START_DATE = "20250101";
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 기업마당 API 접속 중...`);
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

    if (itemsArray.length === 0) {
      console.log("⚠️ 가져온 데이터가 없습니다.");
      return;
    }

    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      // 1. 공고 ID를 추출합니다. (여러 필드명 후보 확인)
      const pId = getV(item.pblancId) || getV(item.itemId) || getV(item.id);
      
      // 2. API가 직접 제공하는 URL이 있는지 확인합니다.
      let finalLink = getV(item.pblancUrl);
      
      // 3. 만약 URL이 없거나 비정상적이라면 공식 상세페이지 주소로 강제 생성합니다.
      if (!finalLink || finalLink.includes("null") || finalLink.length < 10) {
        finalLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${pId}`;
      }

      return {
        title: getV(item.title || item.pblancNm).trim(),
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        link: finalLink
      };
    }).filter(p => p.title);

    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        existingData = [];
      }
    }

    const combined = [...newPolicies, ...existingData];
    const unique = combined.reduce((acc, current) => {
      if (!acc.find(item => item.title === current.title)) {
        acc.push(current);
      }
      return acc;
    }, []);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 업데이트 완료! 총 ${unique.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
