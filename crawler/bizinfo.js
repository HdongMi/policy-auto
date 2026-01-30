import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 1. 날짜 범위를 1년 전으로 아주 넓게 잡습니다. (데이터가 있는지 확인용)
  const startDate = "20250101"; 

  // 2. URL (returnType은 빼고 _type=json도 넣어보고 모든 시도를 다 함)
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&_type=json&pblancServiceStartDate=${startDate}`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log(`📡 중기부 API 접속 중... (검색일: ${startDate}부터)`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    // XML/JSON 공통 처리 강화
    if (text.includes("<item>")) {
      console.log("📝 XML 응답 확인, 파싱 중...");
      const xmlData = await parseStringPromise(text);
      
      // XML 경로를 최대한 유연하게 탐색 (어떤 계층에 있든 item을 찾아냄)
      const findItems = (obj) => {
        if (obj.item) return obj.item;
        for (const key in obj) {
          if (typeof obj[key] === "object") {
            const result = findItems(obj[key]);
            if (result) return result;
          }
        }
        return null;
      };
      
      const rawItems = findItems(xmlData);
      itemsArray = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
    } else {
      try {
        const data = JSON.parse(text);
        itemsArray = data.response?.body?.items || [];
      } catch(e) {
        console.log("⚠️ JSON 파싱 실패, 원본 데이터 확인이 필요합니다.");
      }
    }

    if (itemsArray.length === 0) {
      console.log("⚠️ 여전히 데이터가 0건입니다.");
      console.log("📝 서버가 보낸 원본 데이터(일부):", text.substring(0, 500));
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
    console.log(`✅ 드디어 성공! ${newPolicies.length}건을 가져왔습니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
