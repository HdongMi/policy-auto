import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  // 1. 설정: 인증키 및 경로
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  
  // 검색 시작일을 2025년 1월 1일로 설정하여 넉넉하게 데이터를 가져옵니다.
  const START_DATE = "20250101";
  
  // 기업마당(v2) 공식 API 주소
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 중기부 API 접속 및 최신 공고 수집 중...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    // 2. 응답 데이터 처리 (XML/JSON 대응)
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else if (text.startsWith("{") || text.includes('"response"')) {
      const data = JSON.parse(text);
      itemsArray = data.response?.body?.items || [];
    }

    if (itemsArray.length === 0) {
      console.log("⚠️ 서버 응답에 공고가 없습니다. (점검 중이거나 인증키 활성화 대기 중일 수 있음)");
      return;
    }

    // 3. 데이터 매핑 (필드명 및 상세페이지 링크 최적화)
    const newPolicies = itemsArray.map(item => {
      // 배열 또는 객체로 들어오는 값을 문자열로 추출하는 헬퍼 함수
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      // 공고 ID 추출 (상세페이지 이동을 위한 핵심 값)
      const pId = getV(item.pblancId) || getV(item.itemId);
      
      return {
        title: getV(item.title).trim(),
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중기부(기업마당)",
        // 🔗 링크 오류 해결: 기업마당 공식 상세조회 파라미터(pblancId) 적용
        link: `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${pId}`
      };
    }).filter(p => p.title); // 제목이 있는 경우만 저장

    // 4. 기존 파일 로드 및 중복 제거 저장
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        existingData = [];
      }
    }

    // 제목(title)을 기준으로 중복되지 않은 데이터만 합치기
    const combined = [...newPolicies, ...existingData];
    const unique = combined.reduce((acc, current) => {
      if (!acc.find(item => item.title === current.title)) {
        acc.push(current);
      }
      return acc;
    }, []);

    // 최종 결과 저장
    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ 업데이트 완료! 신규 및 기존 포함 총 ${unique.length}건의 정책이 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 실행 중 오류 발생:", error.message);
  }
}

run();
