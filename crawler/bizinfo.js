import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const URL = `http://apis.data.go.kr/1381000/hopeSmesPblancService/getHopeSmesPblancList?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=20&type=json`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 비즈인포 API 접속 중...");
    const response = await fetch(URL);
    
    // 응답이 JSON인지 먼저 확인
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const errorText = await response.text();
      console.log("⚠️ API 서버 응답이 아직 정상이 아닙니다 (JSON이 아님).");
      console.log("📝 서버 응답 내용:", errorText.substring(0, 100)); // 에러 내용 살짝 확인
      console.log("💡 활용 신청 후 서버 동기화까지 보통 1~2시간이 걸립니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const data = await response.json();
    const items = data.response?.body?.items?.item || [];
    
    if (items.length === 0) {
      console.log("⚠️ 가져온 공고가 없습니다.");
      return;
    }

    const newPolicies = items.map(item => ({
      title: item.pblancNm,
      region: item.areaNm || "전국",
      deadline: item.reqstEndDt || "상세참조",
      source: "기업마당(API)",
      link: item.pblancUrl || "https://www.bizinfo.go.kr"
    }));

    let existingData = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
    const combined = [...newPolicies, ...existingData];
    const unique = combined.filter((v, i, a) => v.title && a.findIndex(t => t.title === v.title) === i);

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
    console.log(`✅ API 연동 성공! 현재 총 ${unique.length}건 저장 완료.`);

  } catch (error) {
    console.error("❌ 처리 중 오류 발생:", error.message);
  }
}

run();
