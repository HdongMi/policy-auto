import fs from "fs";
import path from "path";
import fetch from "node-fetch";

async function run() {
    const SERVICE_KEY = "e8e40ea23b405a5abba75382a331e61f9052570e9e95a7ca6cf5db14818ba22b";
    // 2025년 이후 데이터 100건 요청
    const URL = `https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=100&returnType=json&pblancServiceStartDate=20250101`;

    const filePath = path.join(process.cwd(), "policies.json");

    try {
        console.log("📡 중기부 API 수집 중 (XML/JSON 자동 대응 모드)...");
        const response = await fetch(URL);
        const text = await response.text();

        let items = [];

        // 1. 응답 데이터 판별 및 파싱
        if (text.trim().startsWith("<")) {
            // XML로 들어온 경우: 정규식으로 간단히 데이터 추출 (추가 라이브러리 불필요)
            console.log("📝 XML 응답 감지, 정밀 파싱 중...");
            const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g);
            if (itemMatches) {
                items = itemMatches.map(itemStr => {
                    const getValue = (tag) => {
                        const m = itemStr.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`));
                        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";
                    };
                    return {
                        pblancNm: getValue("pblancNm"),
                        pblancId: getValue("pblancId"),
                        areaNm: getValue("areaNm"),
                        pblancEnddt: getValue("pblancEnddt")
                    };
                });
            }
        } else {
            // JSON으로 들어온 경우
            const data = JSON.parse(text);
            items = data.response?.body?.items || [];
        }

        if (items.length === 0) {
            console.log("⚠️ 수집된 데이터가 없습니다. 서비스키 승인 대기 중이거나 파라미터를 확인하세요.");
            console.log("서버 응답 원본:", text.substring(0, 200));
            return;
        }

        // 2. 링크 꼬임 원천 차단 (검색 로직 제거 -> 고유 ID 방식)
        const newPolicies = items.map(item => {
            const title = item.pblancNm || "제목 없음";
            const pblancId = item.pblancId;

            // 중기부 사이트 검색 대신 비즈인포 고유 ID 링크 사용 (절대 안 꼬임)
            const secureLink = `https://www.bizinfo.go.kr/saw/saw01/saw0101.do?pblancId=${pblancId}`;

            return {
                title: title,
                region: item.areaNm || "전국",
                deadline: item.pblancEnddt || "상세참조",
                source: "중소벤처기업부",
                link: secureLink
            };
        });

        // 3. 중복 제거 및 저장
        const unique = newPolicies.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
        fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), "utf8");

        console.log(`✅ 업데이트 성공! 총 ${unique.length}건 저장됨.`);
        console.log(`🔗 첫 번째 데이터 확인: ${unique[0].title} -> ${unique[0].link}`);

    } catch (error) {
        console.error("❌ 처리 중 오류 발생:", error.message);
    }
}

run();
