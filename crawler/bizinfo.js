import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 오늘 날짜 기준으로 최근 1년치 공고를 긁어오도록 설정 (예: 20240101)
  const START_DATE = "20240101"; 
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&_type=json&pblancServiceStartDate=${START_DATE}`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 중소벤처기업부 API(v2) 접속 중...");
    const response = await fetch(URL);
    const text = await response.text();

    if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
      console.log("❌ 에러: 인증키가 등록되지 않았습니다.");
      return;
    }

    let itemsArray = [];

    if (text.trim().startsWith("<?xml") || text.includes("<response>")) {
      console.log("📝 XML 응답을 감지하여 JSON으로 변환합니다...");
      const xmlData = await parseStringPromise(text);
      
      // XML 구조 분석 (중기부 v2 API의 실제 깊은 경로 탐색)
      const body = xmlData?.response?.body?.[0];
      const itemsContainer = body?.items?.[0];
      
      // item이 배열일 수도 있고 단일 객체일 수도 있음
      if (itemsContainer && itemsContainer.item) {
        itemsArray = Array.isArray(itemsContainer.item) ? itemsContainer.item : [itemsContainer.item];
      }
    } else {
      const data = JSON.parse(text);
      itemsArray = data.response?.body?.items || [];
    }

    if (itemsArray.length === 0) {
      console.log("⚠️ 서버에서 가져온 공고 데이터가 실제로 0건입니다.");
      // 테스트용 로그: 서버가 보낸 원본 텍스트의 앞부분 출력
      console.log("📝 서버 응답 앞부분:", text.substring(0, 300));
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

    // 4. 기존 파일 읽기
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
    console.log(`✅ 처리 완료! API에서 ${newPolicies.length}건을 가져와 중복 제외 후 총 ${unique.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
