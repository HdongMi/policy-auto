import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 1. URL 수정: 날짜 파라미터를 빼거나 형식을 조정하여 가장 넓은 범위를 조회
  // pblancServiceStartDate를 빼면 기본적으로 최신 공고를 줍니다.
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 중소벤처기업부 API(v2) 접속 중...");
    const response = await fetch(URL);
    const text = await response.text();

    // 서버가 에러를 줬는지 확인
    if (text.includes("<resultMsg>")) {
       const msg = text.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1];
       console.log(`📝 서버 응답 메시지: ${msg}`);
    }

    let itemsArray = [];

    if (text.trim().startsWith("<?xml") || text.includes("<response>")) {
      console.log("📝 XML 응답 감지, 파싱 시작...");
      const xmlData = await parseStringPromise(text);
      
      // 중기부 XML 특유의 깊은 계층 구조를 훑습니다.
      const body = xmlData?.response?.body?.[0];
      const itemsContainer = body?.items?.[0];
      
      if (itemsContainer && itemsContainer.item) {
        itemsArray = Array.isArray(itemsContainer.item) ? itemsContainer.item : [itemsContainer.item];
      }
    } else {
      const data = JSON.parse(text);
      itemsArray = data.response?.body?.items || [];
    }

    if (itemsArray.length === 0) {
      console.log("⚠️ 가져온 데이터가 0건입니다. (서버 응답 내용 일부):", text.substring(0, 200));
      return;
    }

    const newPolicies = itemsArray.map(item => {
      const getValue = (val) => {
        if (Array.isArray(val)) return val[0];
        if (typeof val === 'object' && val !== null) return val._ || "";
        return val || "";
      };
      
      return {
        title: getValue(item.pblancNm).trim(),
        region: getValue(item.areaNm) || "전국",
        deadline: getValue(item.pblancEnddt) || "상세참조",
        source: "중기부(API)",
        link: getValue(item.pblancUrl) || "https://www.bizinfo.go.kr"
      };
    }).filter(p => p.title);

    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) { existingData = []; }
    }

    const combined = [...newPolicies, ...existingData];
    const unique = combined.reduce((acc, current) => {
      if (!acc.find(item => item.title === current.title)) {
        acc.push(current);
      }
      return acc;
    }, []);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 성공! API에서 ${newPolicies.length}건을 읽어왔고, 최종 ${unique.length}건이 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
