import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run() {
  // 1. 발급받은 인증키 (Encoding 키 사용)
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 2. 비즈인포(기업마당) API URL
  const URL = `http://apis.data.go.kr/1381000/hopeSmesPblancService/getHopeSmesPblancList?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=20&type=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 비즈인포 API 접속 중...");
    const response = await fetch(URL);
    const data = await response.json();

    // API 응답 데이터 구조 파싱
    const items = data.response?.body?.items?.item || [];
    
    if (items.length === 0) {
      console.log("⚠️ API 응답에 데이터가 없습니다. (키 활성화까지 1~2시간 소요될 수 있음)");
      return;
    }

    const newPolicies = items.map(item => ({
      title: item.pblancNm,               // 공고명
      region: item.areaNm || "전국",        // 지역
      deadline: item.reqstEndDt || "상세참조", // 마감일
      source: "기업마당(API)",
      link: item.pblancUrl                // 상세페이지 주소
    }));

    // 3. 기존 데이터 로드 및 합치기 (누적 저장)
    let existingData = [];
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    const combined = [...newPolicies, ...existingData];
    // 제목 기준으로 중복 제거
    const unique = combined.filter((v, i, a) => 
      v.title && a.findIndex(t => t.title === v.title) === i
    );

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
    console.log(`✅ API 연동 성공! 현재 총 ${unique.length}건의 공고가 저장되어 있습니다.`);

  } catch (error) {
    console.error("❌ API 요청 중 에러 발생:", error.message);
    console.log("💡 만약 'invalid key' 에러가 난다면, API 승인 후 1~2시간 뒤에 다시 시도해 보세요.");
  }
}

run();
