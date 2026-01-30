import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

// 타임아웃 방지용 함수
const fetchWithTimeout = (url, timeout = 7000) => {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
};

async function run() {
    const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
    const START_DATE = "20250101";
    const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=${START_DATE}`;
    const filePath = path.join(process.cwd(), "policies.json");

    try {
        console.log(`📡 공고 데이터 수집 및 상세페이지(bcIdx) 추출 시작...`);
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

        // 🔗 상세페이지 번호를 찾기 위한 반복문
        const finalPolicies = [];
        for (const item of itemsArray) {
            const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
            const title = (getV(item.pblancNm) || getV(item.title)).trim();
            
            // 기본값은 검색 결과 페이지 (만약 상세페이지 추출 실패 시를 대비)
            let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchTarget=TITLE&searchKeyword=${encodeURIComponent(title)}`;

            try {
                // 🔍 중기부 검색 페이지에서 bcIdx 추출 시도
                const searchRes = await fetchWithTimeout(finalLink);
                const html = await searchRes.text();
                
                // 정규식: 제목이 포함된 행의 bcIdx=숫자 추출
                // 검색 결과 리스트에서 해당 제목과 가장 가까운 bcIdx를 찾습니다.
                const regex = new RegExp(`bcIdx=(\\d+)[^>]*>[^<]*${title.substring(0, 10)}`, 'i');
                const match = html.match(/bcIdx=(\d+)/); // 가장 상단 결과의 번호 추출

                if (match && match[1]) {
                    const bcIdx = match[1];
                    finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${bcIdx}`;
                    console.log(`✅ 링크 매칭 성공: ${title.substring(0, 15)}...`);
                }
            } catch (e) {
                console.log(`⚠️ 링크 보정 건너뜀 (${title.substring(0, 10)}): ${e.message}`);
            }

            finalPolicies.push({
                title: title,
                region: getV(item.areaNm) || "전국",
                deadline: getV(item.pblancEnddt) || "상세참조",
                source: "중소벤처기업부",
                link: finalLink
            });
        }

        fs.writeFileSync(filePath, JSON.stringify(finalPolicies, null, 2), "utf8");
        console.log(`\n✅ 모든 작업 완료! 총 ${finalPolicies.length}건 저장되었습니다.`);

    } catch (error) {
        console.error("❌ 치명적 오류:", error.message);
    }
}

run();
