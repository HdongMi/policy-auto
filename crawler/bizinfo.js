import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101";
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 링크 정밀 복구 및 수집 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      const title = getV(item.title).trim();
      
      // 🔗 [핵심] 링크 복구 로직
      // 1. API에서 주는 pblancUrl을 우선 확인
      let rawUrl = getV(item.pblancUrl); 
      let finalLink = "";

      if (rawUrl && rawUrl.length > 10 && !rawUrl.includes("null")) {
        // 상대 경로일 경우 절대 경로로 보정
        if (rawUrl.startsWith("/")) {
          finalLink = `https://www.bizinfo.go.kr${rawUrl}`;
        } else if (!rawUrl.startsWith("http")) {
          finalLink = `https://${rawUrl}`;
        } else {
          finalLink = rawUrl;
        }
      } else {
        // 2. 만약 pblancUrl이 없다면, pblancId를 활용하되 
        // 기업마당에서 '에러'가 나지 않는 최신 상세페이지 주소 체계를 강제로 적용합니다.
        const pId = getV(item.pblancId) || getV(item.itemId);
        finalLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${pId}`;
      }

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        link: finalLink
      };
    }).filter(p => p.title);

    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 링크 복구 완료! 총 ${newPolicies.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
