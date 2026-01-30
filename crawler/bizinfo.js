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
    console.log(`📡 최신 공고 데이터 수집 및 링크 최적화 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];

    // 1. JSON/XML 통합 파싱
    if (text.trim().startsWith("<") || text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else {
      try {
        const jsonData = JSON.parse(text);
        itemsArray = jsonData.response?.body?.items || [];
      } catch (e) {
        console.log("⚠️ JSON 파싱 실패, XML 강제 전환");
      }
    }

    // 2. 데이터 매핑 및 링크 생성
    const newPolicies = itemsArray.map(item => {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      
      const title = (getV(item.pblancNm) || getV(item.title)).trim();
      const areaNm = getV(item.areaNm) || "전국";
      const deadline = getV(item.pblancEnddt) || "상세참조";

      // [핵심 해결책] 
      // 개별 상세페이지 ID가 자꾸 바뀌거나 에러가 날 때는,
      // 해당 공고 제목으로 중기부 공식 게시판 검색결과를 직접 띄워주는 링크가 가장 확실합니다.
      const searchLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=TITLE&searchKeyword=${encodeURIComponent(title)}`;

      return {
        title: title,
        region: areaNm,
        deadline: deadline,
        source: "중소벤처기업부",
        link: searchLink
      };
    }).filter(p => p.title.length > 0);

    // 3. 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(newPolicies, null, 2), "utf8");
    
    console.log(`--------------------------------------------------`);
    console.log(`✅ 수집 완료! 총 ${newPolicies.length}건 저장되었습니다.`);
    console.log(`🔗 샘플 링크: ${newPolicies[0]?.link}`);
    console.log(`--------------------------------------------------`);

  } catch (error) {
    console.error("❌ 치명적 오류:", error.message);
  }
}

run();
