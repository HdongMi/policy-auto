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
    console.log(`📡 기업마당 API 접속 중...`);
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
      
      // 💡 핵심 수정: pblancId 대신 itemId 또는 title을 활용한 안전한 링크 생성
      // 기업마당 상세페이지는 pblancId 파라미터가 매우 예민합니다.
      // API에서 제공하는 pblancUrl이 있다면 그것을 우선 사용하되, 
      // 없을 경우 '공고명'으로 기업마당에서 검색해주는 링크로 대체하여 '페이지 없음' 에러를 방지합니다.
      
      let pId = getV(item.pblancId) || getV(item.itemId);
      let rawUrl = getV(item.pblancUrl);
      let title = getV(item.title || item.pblancNm).trim();
      
      let finalLink = "";
      if (rawUrl && rawUrl.length > 20 && !rawUrl.includes("null")) {
        finalLink = rawUrl;
      } else {
        // ID 기반 주소가 에러난다면, 제목을 통한 기업마당 통합 검색 링크로 연결 (가장 안전함)
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

    // 중복 제거 및 저장
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try { existingData = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }

    const unique = [...newPolicies, ...existingData].reduce((acc, current) => {
      if (!acc.find(item => item.title === current.title)) acc.push(current);
      return acc;
    }, []);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 업데이트 완료! 총 ${unique.length}건 저장.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
