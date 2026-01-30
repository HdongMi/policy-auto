import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const START_DATE = "20250101";
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=${START_DATE}`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log(`📡 데이터 추출 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    // XML 파싱 로직
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      // 로그에 찍힌 구조: response > body > items > item
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    if (itemsArray.length === 0) {
      console.log("❌ 서버 응답에 아이템이 없습니다.");
      return;
    }

    // 💡 로그에 찍힌 실제 필드명(title, itemId 등)으로 매핑
    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      return {
        // 실제 태그명인 'title'을 사용합니다.
        title: getV(item.title).trim(),
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(API)",
        // 상세 페이지 링크가 없다면 bizinfo 기본 주소에 ID 조합
        link: getV(item.pblancUrl) || `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${getV(item.pblancId || item.itemId)}`
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
    console.log(`✅ 드디어 성공! ${newPolicies.length}건을 읽어와서 저장했습니다.`);

  } catch (error) {
    console.error("❌ 에러:", error.message);
  }
}

run();
