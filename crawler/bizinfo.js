import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
  const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
  const filePath = path.join(process.cwd(), "policies.json");
  const START_DATE = "20250101";
  const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=${START_DATE}`;

  try {
    console.log(`📡 중기부 데이터 수집 및 상세 주소(bcIdx) 강제 추출 시작...`);
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

    // 하나씩 순차적으로 방문하여 bcIdx 추출
    for (const item of itemsArray) {
      const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
      const title = (getV(item.pblancNm) || getV(item.title)).trim();
      
      // 검색 링크 생성
      const searchUrl = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=TITLE&searchKeyword=${encodeURIComponent(title)}`;
      let finalLink = searchUrl; // 기본값

      try {
        // 실제 중기부 검색 페이지에 접속 (헤더 추가로 차단 방지)
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const html = await res.text();

        // [중요] 상세 페이지 번호(bcIdx)를 찾는 정규식
        // 중기부 리스트에서 가장 먼저 나오는 bcIdx를 가로챕니다.
        const match = html.match(/bcIdx=(\d+)/); 

        if (match && match[1]) {
          finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${match[1]}`;
          console.log(`✅ 상세주소 획득: ${title.substring(0, 15)}...`);
        } else {
          console.log(`⚠️ 번호 추출 실패 (검색 결과 없음): ${title.substring(0, 10)}`);
        }
      } catch (e) {
        console.log(`❌ 접속 에러 (${title.substring(0, 10)}): ${e.message}`);
      }

      finalPolicies.push({
        title: title,
        region: getV(item.areaNm) || "전국",
        deadline: getV(item.pblancEnddt) || "상세참조",
        source: "중소벤처기업부",
        link: finalLink
      });

      // 서버 부하를 줄이기 위한 미세한 지연 (0.1초)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    fs.writeFileSync(filePath, JSON.stringify(finalPolicies, null, 2), "utf8");
    console.log(`\n✅ 업데이트 완료! 총 ${finalPolicies.length}건 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

run();
