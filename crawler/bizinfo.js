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
    console.log(`📡 중기부 상세 페이지 번호(bcIdx) 추적 수집 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    }

    const newPolicies = [];

    for (const item of itemsArray) {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = getV(item.title || item.pblancNm).trim();
      
      // 기본값은 게시판 검색 링크로 설정 (혹시 상세번호를 못 찾을 경우 대비)
      let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=ALL&searchKeyword=${encodeURIComponent(title)}`;

      try {
        // 🔍 중기부 게시판에 실제로 물어봐서 게시물 번호(bcIdx) 가져오기
        const searchRes = await fetch(finalLink);
        const html = await searchRes.text();
        
        // HTML 소스 내에서 View.do?cbIdx=310&bcIdx=숫자 패턴을 찾아냄
        const match = html.match(/bcIdx=(\d+)/);
        if (match && match[1]) {
          const bcIdx = match[1];
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${bcIdx}`;
          console.log(`✅ 찾았다! [${bcIdx}] : ${title}`);
        }
      } catch (e) {
        console.log(`⚠️ 상세번호 추출 실패, 검색 링크 유지: ${title}`);
      }

      newPolicies.push({
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: finalLink
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    console.log(`✅ 총 ${newPolicies.length}건, 상세 페이지 직결 업데이트 완료!`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
