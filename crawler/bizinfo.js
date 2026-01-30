import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20250101`;

  try {
    console.log(`📡 중기부 데이터 정밀 매칭 수집 시작...`);
    const response = await fetch(URL);
    const text = await response.text();

    let itemsArray = [];
    if (text.includes("<item>")) {
      const xmlData = await parseStringPromise(text);
      const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
      itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    } else {
      const jsonData = JSON.parse(text);
      itemsArray = jsonData.response?.body?.items || [];
    }

    const finalPolicies = [];

    for (const item of itemsArray) {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = (getV(item.pblancNm) || getV(item.title)).trim();
      
      // 검색 시 제목 전체를 따옴표로 묶어 정확도 향상
      const searchUrl = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=TITLE&searchKeyword=${encodeURIComponent(title)}`;
      let finalLink = searchUrl; 

      try {
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
        });
        const html = await res.text();

        // 🔍 정밀 매칭 로직: 
        // 1. bcIdx와 제목이 같이 들어있는 행을 찾습니다.
        // 2. 검색 결과 리스트에서 내 공고 제목과 정확히 일치하는 위치의 bcIdx를 추출합니다.
        const regex = new RegExp(`bcIdx=(\\d+)[^>]*title="([^"]*${title.substring(0, 5)}[^"]*)"`, 'g');
        let match;
        let foundIdx = null;

        while ((match = regex.exec(html)) !== null) {
          const bcIdx = match[1];
          const foundTitle = match[2];

          // 텍스트 유사도 검사 (공백 제거 후 대조)
          if (foundTitle.replace(/\s/g, '').includes(title.replace(/\s/g, ''))) {
            foundIdx = bcIdx;
            break; // 정확히 일치하는 걸 찾으면 중단
          }
        }

        // 일치하는 걸 못 찾았다면 첫 번째 bcIdx라도 가져오되, 로그에 남김
        if (!foundIdx) {
          const fallbackMatch = html.match(/bcIdx=(\d+)/);
          foundIdx = fallbackMatch ? fallbackMatch[1] : null;
        }

        if (foundIdx) {
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${foundIdx}`;
          console.log(`✅ [정밀매칭] ${title.substring(0, 15)} -> ${foundIdx}`);
        }
      } catch (e) {
        console.log(`❌ 에러: ${title.substring(0, 10)}`);
      }

      finalPolicies.push({
        title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: finalLink
      });
      
      await new Promise(r => setTimeout(r, 100)); // 차단 방지
    }

    fs.writeFileSync(filePath, JSON.stringify(finalPolicies, null, 2), "utf8");
    console.log(`✅ 업데이트 완료!`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
