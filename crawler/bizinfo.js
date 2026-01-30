import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

async function run() {
    const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
    const filePath = path.join(process.cwd(), "policies.json");
    const API_URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20260101`;
    const LIST_URL = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310`; // 중기부 리스트 1페이지

    try {
        console.log(`📡 중기부 공고 리스트 전체 확보 중...`);
        // 1. 중기부 공식 리스트 페이지 HTML 통째로 가져오기
        const listRes = await fetch(LIST_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
        });
        const listHtml = await listRes.text();
        
        // 2. 리스트 내의 모든 bcIdx와 제목 쌍을 미리 맵핑 (사전 제작)
        const siteAnnouncements = [];
        const rows = listHtml.match(/<tr[\s\S]*?<\/tr>/g) || [];
        
        rows.forEach(row => {
            const bcIdxMatch = row.match(/bcIdx=(\d+)/);
            // HTML 태그 제거 후 순수 텍스트 제목만 추출
            const siteTitle = row.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            if (bcIdxMatch && siteTitle) {
                siteAnnouncements.push({
                    id: bcIdxMatch[1],
                    fullText: siteTitle.replace(/\s+/g, '') // 공백 제거 버전
                });
            }
        });
        console.log(`✅ 사이트에서 ${siteAnnouncements.length}개의 공고 식별 완료.`);

        // 3. API 데이터 가져오기
        console.log(`📡 API 데이터 수집 및 대조 시작...`);
        const apiRes = await fetch(API_URL);
        const apiText = await apiRes.text();

        let itemsArray = [];
        if (apiText.includes("<item>")) {
            const xmlData = await parseStringPromise(apiText);
            const items = xmlData?.response?.body?.[0]?.items?.[0]?.item;
            itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
        } else {
            const jsonData = JSON.parse(apiText);
            itemsArray = jsonData.response?.body?.items || [];
        }

        const finalPolicies = [];
        const seenTitles = new Set();

        // 4. API 공고와 사이트 리스트 1:1 대조
        for (const item of itemsArray) {
            const getV = (v) => (Array.isArray(v) ? v[0] : (typeof v === 'object' ? v._ : v)) || "";
            const title = (getV(item.pblancNm) || getV(item.title)).trim();
            
            if (seenTitles.has(title)) continue;
            seenTitles.add(title);

            const cleanApiTitle = title.replace(/\s+/g, '').substring(0, 12); // 공백 제거 후 앞 12자
            
            // 사이트 공고 중 내 제목을 포함하는 녀석 찾기
            const match = siteAnnouncements.find(sa => sa.fullText.includes(cleanApiTitle));
            
            let finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310`; // 기본값
            if (match) {
                finalLink = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=${match.id}`;
                console.log(`🎯 매칭완료: ${match.id} | ${title.substring(0, 15)}...`);
            } else {
                console.log(`❓ 불일치(수동확인): ${title.substring(0, 15)}...`);
            }

            finalPolicies.push({
                title,
                region: getV(item.areaNm) || "전국",
                deadline: getV(item.pblancEnddt) || "상세참조",
                source: "중소벤처기업부",
                link: finalLink
            });
        }

        fs.writeFileSync(filePath, JSON.stringify(finalPolicies, null, 2), "utf8");
        console.log(`\n✅ 총 ${finalPolicies.length}건 저장 완료.`);

    } catch (error) {
        console.error("❌ 오류 발생:", error.message);
    }
}

run();
