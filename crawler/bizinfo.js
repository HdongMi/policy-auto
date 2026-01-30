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
    console.log(`📡 기업마당 API 데이터 수집 및 링크 검증 중...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else if (text.startsWith("{") || text.includes('"response"')) {
      const data = JSON.parse(text);
      itemsArray = data.response?.body?.items || [];
    }

    if (itemsArray.length === 0) return;

    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      const title = getV(item.title || item.pblancNm).trim();
      const rawUrl = getV(item.pblancUrl); // API가 주는 원본 링크
      
      let finalLink = "";

      // 1. API가 준 URL이 정상적인 경우 우선 사용
      if (rawUrl && rawUrl.length > 10 && !rawUrl.includes("null")) {
        // 간혹 URL 앞에 http가 빠진 경우 보정
        finalLink = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      } else {
        // 2. URL이 없다면, 에러가 나는 ID 주소 대신 '검색 결과 페이지'로 연결 (가장 안전)
        // 사용자가 클릭했을 때 해당 공고 제목으로 검색된 리스트가 나오게 함
        finalLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?searchCondition=all&searchKeyword=${encodeURIComponent(title)}`;
      }

      return {
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        link: finalLink
      };
    }).filter(p => p.title);

    // 기존 데이터 초기화 후 새로 저장 (잘못된 링크 제거를 위해)
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 링크 보정 완료! 총 ${newPolicies.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
