import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101"; // 수집 시작일 설정
  
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 중기부 데이터 수집 및 링크 정합성 체크 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    
    // 1. JSON 또는 XML 응답 처리
    try {
        const jsonData = JSON.parse(text);
        itemsArray = jsonData.response?.body?.items || [];
    } catch(e) {
        if (text.includes("<item>")) {
            const xmlData = await parseStringPromise(text);
            const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
            itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
        }
    }

    if (itemsArray.length === 0) {
      console.log("⚠️ 가져온 공고가 없습니다. 인증키 동기화 또는 파라미터를 확인하세요.");
      return;
    }

    // 2. 데이터 변환 (검색 대신 고유 ID 기반 링크 생성)
    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      const title = getV(item.pblancNm || item.title).trim();
      const pblancId = getV(item.pblancId); // 공고 고유 ID
      const areaNm = getV(item.areaNm) || "전국";
      const deadline = getV(item.pblancEnddt) || "상세참조";
      
      // [해결책] 검색 결과에 의존하지 않고 고유 ID를 이용해 기업마당 상세페이지 링크 생성
      // 이 주소는 공고마다 고유하며 절대 꼬이지 않습니다.
      const directLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${pblancId}`;

      return {
        title: title,
        region: areaNm,
        deadline: deadline,
        source: "중소벤처기업부",
        link: directLink
      };
    });

    // 3. 중복 제거 (제목 기준)
    const uniquePolicies = newPolicies.filter((v, i, a) => 
        a.findIndex(t => t.title === v.title) === i
    );

    // 4. 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(uniquePolicies, null, 2), "utf8");
    
    console.log(`--------------------------------------------------`);
    console.log(`✅ 수집 완료: 총 ${uniquePolicies.length}건`);
    console.log(`📂 저장 경로: ${filePath}`);
    console.log(`💡 이제 'policies.json'을 열어 링크가 잘 매칭되었는지 확인하세요!`);
    console.log(`--------------------------------------------------`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
