import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=20260101`;

  try {
    console.log(`📡 중기부 리스트(List.do) 번호 대조 시작...`);
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
      
      // 검색 키워드를 공고 제목으로 설정
      const searchUrl = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=TITLE&searchKeyword=${encodeURIComponent(title)}`;
      let finalLink = searchUrl;

      try {
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
        });
        const html = await res.text();

        // [핵심] 리스트의 각 행(tr)을 분리해서 제목 대조
        const rows = html.match(/<tr[\s\S]*?<\/tr>/g) || [];
        let foundBcIdx = null;

        for (const row of rows) {
          // 행 데이터 안에서 HTML 태그를 제거한 순수 텍스트 추출
          const rowText = row.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
          const cleanTitle = title.replace(/\s+/g, '');

          // API 제목이 해당 행의 텍스트에 포함되어 있는지 확인
          if (rowText.includes(cleanTitle.substring(0, 10))) {
            const bcIdxMatch = row.match(/bcIdx=(\d+)/);
            if (bcIdxMatch) {
              foundBcIdx = bcIdxMatch[1];
              break; 
            }
          }
        }

        if (foundBcIdx) {
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${foundBcIdx}`;
          console.log(`✅ 매칭성공: ${foundBcIdx} | ${title.substring(0, 15)}`);
        } else {
          console.log(`⚠️ 매칭실패(목록에 없음): ${title.substring(0, 15)}`);
        }
      } catch (e) {
        console.log(`❌ 접속에러: ${title.substring(0, 10)}`);
      }

      finalPolicies.push({
        title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: finalLink
      });

      await new Promise(r => setTimeout(r, 200)); 
    }

    fs.writeFileSync(filePath, JSON.stringify(finalPolicies, null, 2), "utf8");
    console.log(`\n✅ 작업 완료!`);

  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

run();
