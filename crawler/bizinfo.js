import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js"; // xml2js 라이브러리 추가 필요

async function run() {
  // 1. 사용자님의 승인된 인증키
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 2. 파라미터 보강 (&_type=json 추가)
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&_type=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 중소벤처기업부 API(v2) 접속 중...");
    const response = await fetch(URL);
    const text = await response.text();

    // 인증키 에러 체크
    if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
      console.log("❌ 에러: 인증키가 아직 서버에 등록되지 않았습니다. (1~2시간 대기 필요)");
      return;
    }

    let data;
    // XML 응답인지 확인 후 처리
    if (text.trim().startsWith("<?xml") || text.includes("<response>")) {
      console.log("📝 XML 응답을 감지하여 JSON으로 변환합니다...");
      const xmlData = await parseStringPromise(text);
      
      // XML 구조를 JSON 구조처럼 접근하기 쉽게 재할당
      data = {
        response: {
          body: {
            items: xmlData.response.body[0].items[0].item || []
          }
        }
      };
    } else {
      // 일반적인 JSON 응답 처리
      data = JSON.parse(text);
    }

    // 3. 데이터 추출 및 매핑
    // XML 변환 데이터와 JSON 데이터의 구조 차이를 고려하여 안전하게 접근
    const rawItems = data.response?.body?.items || [];
    const items = Array.isArray(rawItems) ? rawItems : [];

    if (items.length === 0) {
      console.log("⚠️ 가져온 공고가 없거나 아직 데이터가 업데이트되지 않았습니다.");
      return;
    }

    const newPolicies = items.map(item => {
      // XML 파싱 시 값이 배열로 들어오는 경우를 대비해 처리
      const getValue = (val) => Array.isArray(val) ? val[0] : val;
      
      return {
        title: getValue(item.pblancNm),
        region: getValue(item.areaNm) || "전국",
        deadline: getValue(item.pblancEnddt) || "상세참조",
        source: "중기부(API)",
        link: getValue(item.pblancUrl) || "https://www.bizinfo.go.kr"
      };
    });

    // 4. 기존 파일 읽기 및 저장
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        existingData = [];
      }
    }

    const combined = [...newPolicies, ...existingData];
    const unique = combined.filter((v, i, a) => 
      v.title && a.findIndex(t => t.title === v.title) === i
    );

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 처리 완료! 새 공고 ${newPolicies.length}건을 포함하여 총 ${unique.length}건 저장됨.`);

  } catch (error) {
    console.error("❌ 처리 중 오류 발생:", error.message);
  }
}

run();
