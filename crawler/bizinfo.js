import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 1. 날짜 설정 (매우 중요: YYYYMMDD 형식)
  // 오늘 기준으로 약 한 달 전 공고부터 가져오도록 설정합니다.
  const date = new Date();
  date.setMonth(date.getMonth() - 1); 
  const startDate = date.toISOString().split('T')[0].replace(/-/g, ''); // 예: 20240420

  // 2. 파라미터에 pblancServiceStartDate 추가
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${startDate}`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log(`📡 중소벤처기업부 API 접속 중... (검색시작일: ${startDate})`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    if (text.trim().startsWith("<?xml") || text.includes("<response>")) {
      console.log("📝 XML 응답 감지, 파싱 시작...");
      const xmlData = await parseStringPromise(text);
      
      // XML의 경우 경로가 매우 깊을 수 있으므로 단계별로 확인
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
      console.log("⚠️ 데이터를 찾지 못했습니다. 서버 응답:", text.substring(0, 200));
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
    console.log(`✅ 성공! ${newPolicies.length}건을 가져와 최종 ${unique.length}건 저장됨.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
