import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run() {
  // 1. 승인받으신 서비스키와 엔드포인트
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20250101`;

  const filePath = path.join(process.cwd(), "policies.json");

  try {
    console.log("📡 중기부 API로부터 직접 데이터를 수집합니다...");
    const response = await fetch(URL);
    const data = await response.json();
    
    const items = data.response?.body?.items || [];
    
    if (items.length === 0) {
      console.log("⚠️ 수집된 데이터가 없습니다. 서비스키 승인 상태를 확인하세요.");
      return;
    }

    // 2. 링크 꼬임 방지 핵심 로직
    const newPolicies = items.map(item => {
      const title = item.pblancNm.trim();
      const pblancId = item.pblancId; // API에서 제공하는 고유 번호
      
      // 검색 결과에서 긁어오는 대신, 고유 ID를 사용해 기업마당(비즈인포) 상세페이지 주소를 직접 만듭니다.
      // 이 주소는 공고마다 고유하므로 절대 제목과 링크가 뒤섞이지 않습니다.
      const fixedLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${pblancId}`;

      return {
        title: title,
        region: item.areaNm || "전국",
        deadline: item.pblancEnddt || "상세참조",
        source: "중소벤처기업부",
        link: fixedLink // 1:1 매칭 완료
      };
    });

    // 3. 중복 제거 및 저장
    const unique = newPolicies.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");

    console.log(`✅ [성공] 총 ${unique.length}건의 공고를 저장했습니다.`);
    console.log(`💡 이제 'policies.json'을 열어보시면 링크가 모두 다른 것을 확인할 수 있습니다!`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
