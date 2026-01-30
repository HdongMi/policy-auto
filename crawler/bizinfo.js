import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run() {
  // 1. 사용자님의 승인된 인증키
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  
  // 2. 승인된 새 API 주소 (v2) - returnType=json 파라미터가 핵심입니다.
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=20&returnType=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 중소벤처기업부 API(v2) 접속 중...");
    const response = await fetch(URL);
    
    const text = await response.text(); // 일단 텍스트로 받아서 분석

    // 응답 내용에 에러 메시지가 있는지 확인
    if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
      console.log("❌ 에러: 인증키가 아직 서버에 등록되지 않았습니다.");
      console.log("💡 승인된 지 얼마 안 된 경우 1~2시간 정도 동기화 시간이 필요합니다.");
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log("⚠️ API 서버 응답이 JSON 형식이 아닙니다.");
      console.log("📝 서버 응답 내용:", text.substring(0, 150));
      return;
    }

    // 3. 데이터 구조 추출 (v2 주소의 데이터 구조에 맞춤)
    const items = data.response?.body?.items || [];
    
    if (items.length === 0) {
      console.log("⚠️ 가져온 공고가 없거나 아직 데이터가 업데이트되지 않았습니다.");
      return;
    }

    const newPolicies = items.map(item => ({
      title: item.pblancNm,        // 공고명
      region: item.areaNm || "전국", // 지역명
      deadline: item.pblancEnddt || "상세참조", // 마감일 (필드명 확인 필요)
      source: "중기부(API)",
      link: item.pblancUrl || "https://www.bizinfo.go.kr"
    }));

    // 4. 기존 파일 읽기 및 중복 제거 저장
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        existingData = [];
      }
    }

    const combined = [...newPolicies, ...existingData];
    const unique = combined.filter((v, i, a) => v.title && a.findIndex(t => t.title === v.title) === i);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");
    console.log(`✅ API 연동 성공! 현재 총 ${unique.length}건의 정책이 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 처리 중 오류 발생:", error.message);
  }
}

run();
