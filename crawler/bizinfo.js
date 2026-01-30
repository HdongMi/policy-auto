import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  // 인증키를 인코딩된 상태와 디코딩된 상태 모두 대응할 수 있게 처리
  const RAW_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const SERVICE_KEY = encodeURIComponent(decodeURIComponent(RAW_KEY)); 
  
  // 주소에서 returnType을 빼고 가장 기본형으로 요청 (서버가 JSON을 거부할 때 대비)
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log(`📡 API 접속 시도 중...`);
    const response = await fetch(URL);
    const text = await response.text();

    // 0건일 때 이유를 찾기 위한 핵심 로그
    if (text.includes("NORMAL_CODE") && !text.includes("<item>")) {
      console.log("⚠️ 서버 응답은 정상이나 데이터(item)가 비어있습니다.");
      console.log("📝 서버 응답 전체 내용:", text); // 여기서 원인을 파악해야 합니다.
    }

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      
      // XML 내부를 아주 깊게 뒤지는 로직
      const findItem = (obj) => {
        if (!obj) return null;
        if (obj.item) return obj.item;
        if (Array.isArray(obj)) {
          for (let e of obj) {
            const res = findItem(e);
            if (res) return res;
          }
        } else if (typeof obj === 'object') {
          for (let key in obj) {
            const res = findItem(obj[key]);
            if (res) return res;
          }
        }
        return null;
      };

      const rawItems = findItem(xmlData);
      itemsArray = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
    }

    if (itemsArray.length === 0) {
      console.log("❌ 데이터 추출 실패. 서버 응답에 <item> 태그가 없습니다.");
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
    console.log(`✅ 드디어! ${newPolicies.length}건 저장 완료.`);

  } catch (error) {
    console.error("❌ 치명적 오류:", error.message);
  }
}

run();
