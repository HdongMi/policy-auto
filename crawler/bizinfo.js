import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  // 1. 인증키 (인코딩 없이 원본 그대로 사용)
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 2. 검색 시작일을 2025년 1월 1일로 고정 (데이터가 무조건 있는 날짜)
  const START_DATE = "20250101";
  
  // 3. 주소 재구성 (가장 표준적인 파라미터 조합)
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=${START_DATE}`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log(`📡 API 요청 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    // 서버가 준 실제 내용을 무조건 로그에 찍어서 정체를 밝힙니다.
    console.log("-----------------------------------------");
    console.log("📝 서버 실제 응답 (앞부분 500자):");
    console.log(text.substring(0, 500));
    console.log("-----------------------------------------");

    let itemsArray = [];

    // XML 형태일 때 처리
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      // 가장 안전하게 item을 찾아가는 경로
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } 
    // JSON 형태일 때 처리
    else if (text.startsWith("{") || text.includes('"response"')) {
      const data = JSON.parse(text);
      itemsArray = data.response?.body?.items || [];
    }

    if (itemsArray.length === 0) {
      console.log("❌ 결과: 데이터가 0건입니다. (서버 응답 확인 필요)");
      return;
    }

    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      return {
        title: getV(item.pblancNm).trim(),
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(API)",
        link: getV(item.pblancUrl) || "https://www.bizinfo.go.kr"
      };
    }).filter(p => p.title);

    let existingData = [];
    if (fs.existsSync(filePath)) {
      try { existingData = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }

    const unique = [...newPolicies, ...existingData].reduce((acc, cur) => {
      if (!acc.find(i => i.title === cur.title)) acc.push(cur);
      return acc;
    }, []);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 성공! ${newPolicies.length}건을 새로 가져왔습니다.`);

  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
  }
}

run();
