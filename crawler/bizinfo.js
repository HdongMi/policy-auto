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
    console.log(`📡 성공 로직 기반 링크 복구 및 수집 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    // 1. 응답 형식(JSON/XML)에 따른 데이터 추출
    if (text.trim().startsWith("<") || text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else {
      const jsonData = JSON.parse(text);
      itemsArray = jsonData.response?.body?.items || [];
    }

    // 2. 데이터 변환 및 링크 복구 로직 (사용자가 성공했던 로직)
    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      // 제목 추출 (필드가 pblancNm 혹은 title로 올 수 있음)
      const title = (getV(item.pblancNm) || getV(item.title)).trim();
      
      // 🔗 링크 복구 핵심
      let rawUrl = getV(item.pblancUrl); 
      let finalLink = "";

      if (rawUrl && rawUrl.length > 10 && !rawUrl.includes("null")) {
        if (rawUrl.startsWith("/")) {
          finalLink = `https://www.bizinfo.go.kr${rawUrl}`;
        } else if (!rawUrl.startsWith("http")) {
          finalLink = `https://${rawUrl}`;
        } else {
          finalLink = rawUrl;
        }
      } else {
        // pblancUrl이 없을 경우 pblancId를 활용한 강제 생성
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
    }).filter(p => p.title); // 제목이 있는 것만 저장

    // 3. 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    
    console.log(`--------------------------------------------------`);
    console.log(`✅ 링크 복구 완료! 총 ${newPolicies.length}건 저장.`);
    if (newPolicies.length > 0) {
        console.log(`📍 샘플 확인: ${newPolicies[0].title}`);
        console.log(`🔗 샘플 링크: ${newPolicies[0].link}`);
    }
    console.log(`--------------------------------------------------`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
