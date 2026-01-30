import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run() {
    const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
    // 정합성을 위해 numOfRows를 50건으로 조절하고 최신순으로 요청합니다.
    const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=50&returnType=json&pblancServiceStartDate=20250101`;

    const filePath = path.join(process.cwd(), "policies.json");

    try {
        console.log("📡 [시스템] 데이터 수집 및 링크 정합성 정밀 검사 시작...");
        const response = await fetch(URL);
        const text = await response.text();

        let rawItems = [];

        // 1. XML/JSON 통합 파싱 로직 (필드 꼬임 방지)
        if (text.trim().startsWith("<")) {
            const itemBlockRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            while ((match = itemBlockRegex.exec(text)) !== null) {
                const block = match[1];
                const extract = (tag) => {
                    const regex = new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`);
                    const res = block.match(regex);
                    return res ? res[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";
                };
                
                // 개별 블록 안에서만 데이터를 추출하여 서로 섞이지 않게 함
                rawItems.push({
                    title: extract("pblancNm"),
                    id: extract("pblancId"),
                    region: extract("areaNm"),
                    date: extract("pblancEnddt")
                });
            }
        } else {
            const data = JSON.parse(text);
            const items = data.response?.body?.items || [];
            rawItems = items.map(i => ({
                title: i.pblancNm,
                id: i.pblancId,
                region: i.areaNm,
                date: i.pblancEnddt
            }));
        }

        if (rawItems.length === 0) {
            console.log("⚠️ 데이터를 가져오지 못했습니다. API 응답을 확인하세요.");
            return;
        }

        // 2. 고유 링크 생성 (비즈인포 공식 상세페이지 주소)
        const finalPolicies = rawItems
            .filter(item => item.title && item.id) // 제목과 ID가 둘 다 있는 것만
            .map(item => {
                return {
                    title: item.title,
                    region: item.region || "전국",
                    deadline: item.date || "상세참조",
                    source: "중소벤처기업부",
                    // pblancId를 직접 주소에 박아넣어 제목과 링크를 강제 고정
                    link: `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${item.id}`
                };
            });

        // 3. 중복 제거 및 최종 저장
        const unique = finalPolicies.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
        
        fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");

        console.log(`--------------------------------------------------`);
        console.log(`✅ [성공] 제목-링크 매칭 완료! (총 ${unique.length}건)`);
        console.log(`📍 첫 번째 확인: ${unique[0].title}`);
        console.log(`🔗 링크 주소: ${unique[0].link}`);
        console.log(`--------------------------------------------------`);
        console.log(`💡 이제 GitHub에 올리고 '강력 새로고침' 후 확인하세요!`);

    } catch (error) {
        console.error("❌ 처리 중 오류:", error.message);
    }
}

run();
