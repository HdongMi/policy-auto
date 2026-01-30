import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  // numOfRows를 100으로 설정하여 넉넉히 가져옵니다.
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&_type=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 중소벤처기업부 API(v2) 접속 중...");
    const response = await fetch(URL);
    const text = await response.text();

    if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
      console.log("❌ 에러: 인증키가 아직 서버에 등록되지 않았습니다.");
      return;
    }

    let data;
    if (text.trim().startsWith("<?xml") || text.includes("<response>")) {
      console.log("📝 XML 응답을 감지하여 JSON으로 변환합니다...");
      const xmlData = await parseStringPromise(text);
      
      // XML 데이터 경로를 더 안전하게 탐색
      const rawItems = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      data = {
        response: {
          body: {
            items: rawItems || []
          }
        }
      };
    } else {
      data = JSON.parse(text);
    }

    const items = data.response?.body?.items || [];
    const itemsArray = Array.isArray(items) ? items : [items]; // 단건일 경우 대비

    if (itemsArray.length === 0) {
      console.log("⚠️ 가져온 공고가 없거나 아직 데이터가 업데이트되지 않았습니다.");
      return;
    }

    const newPolicies = itemsArray.map(item => {
      const getValue = (val) => {
        if (Array.isArray(val)) return val[0];
        if (typeof val === 'object' && val !== null) return val._ || ""; // XML 특성 대응
        return val || "";
      };
      
      return {
        title: getValue(item.pblancNm).trim(),
        region: getValue(item.areaNm) || "전국",
        deadline: getValue(item.pblancEnddt) || "상세참조",
        source: "중기부(API)",
        link: getValue(item.pblancUrl) || "https://www.bizinfo.go.kr"
      };
    }).filter(p => p.title); // 제목이 없는 데이터는 미리 제거

    // 4. 기존 파일 읽기 및 중복 제거 저장
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        existingData = JSON.parse(fileContent);
      } catch (e) {
        existingData = [];
      }
    }

    // 새 데이터와 기존 데이터를 합침
    const combined = [...newPolicies, ...existingData];
    
    // 중복 제거 로직 강화: 제목을 기준으로 중복 검사
    const unique = combined.reduce((acc, current) => {
      const x = acc.find(item => item.title === current.title);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 처리 완료! API에서 ${newPolicies.length}건을 읽어왔고, 중복 제외 후 최종 ${unique.length}건이 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 처리 중 오류 발생:", error.message);
  }
}

run();
