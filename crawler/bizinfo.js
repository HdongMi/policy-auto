import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 1. 날짜 파라미터를 아예 제거했습니다. 
  // 대신 numOfRows를 100으로 설정하여 최신순으로 100개를 가져옵니다.
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log(`📡 중기부 API 접속 중... (최신 공고 100건 요청)`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    // XML 응답 처리
    if (text.includes("<item>")) {
      console.log("📝 XML 데이터 확인됨. 파싱 중...");
      const xmlData = await parseStringPromise(text);
      
      // XML 내부의 item 리스트를 찾는 안전한 경로
      const body = xmlData?.response?.body?.[0];
      const itemsContainer = body?.items?.[0];
      
      if (itemsContainer && itemsContainer.item) {
        itemsArray = Array.isArray(itemsContainer.item) ? itemsContainer.item : [itemsContainer.item];
      }
    } else {
      // JSON 응답 처리
      try {
        const data = JSON.parse(text);
        itemsArray = data.response?.body?.items || [];
      } catch(e) {
        console.log("⚠️ JSON 파싱 실패. 서버가 예상치 못한 형식을 보냈습니다.");
      }
    }

    if (itemsArray.length === 0) {
      console.log("⚠️ 서버에 공고가 하나도 없습니다. 응답 내용:", text.substring(0, 300));
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

    // 4. 기존 파일 읽기 및 중복 제거
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
    console.log(`✅ 드디어 성공! ${newPolicies.length}건의 데이터를 불러와 저장했습니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
