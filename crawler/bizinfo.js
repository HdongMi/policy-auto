import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

async function crawlBizInfo() {
  try {
    const res = await fetch(URL, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const policies = [];

    // 특정 클래스(.table_list)가 없어도 찾을 수 있게 tr 전체 탐색
    $("tr").each((_, el) => {
      const $el = $(el);
      
      // 제목이 들어있는 링크 찾기 (기업마당은 보통 클래스 'tit' 혹은 'txt_left' 사용)
      const titleAnchor = $el.find("a[href*='list.do'], a[href*='view.do']").first();
      let title = titleAnchor.text().replace(/\s+/g, ' ').trim();
      
      // 제목이 비어있다면 다음 행으로
      if (!title || title.length < 2) return;

      // 링크 추출 및 절대경로화
      let rawLink = titleAnchor.attr("href") || "";
      const link = rawLink.startsWith("http") 
        ? rawLink 
        : `https://www.bizinfo.go.kr${rawLink}`;

      // 날짜 추출 (보통 4번째 혹은 5번째 td)
      const deadline = $el.find("td").last().text().trim();

      policies.push({
        title,
        region: "전국",
        amount: "",
        deadline,
        target: "중소기업·소상공인",
        content: "기업마당 공고",
        source: "출처: 기업마당",
        link
      });
    });

    // 만약 여전히 0개라면? (예비용: 다른 셀렉터 시도)
    if (policies.length === 0) {
        console.log("⚠️ 기본 셀렉터 실패, 대체 셀렉터 시도 중...");
        // 필요시 여기에 다른 구조의 셀렉터 추가
    }

    fs.writeFileSync("bizinfo.json", JSON.stringify(policies, null, 2));
    console.log("✅ 기업마당 공고 업데이트 완료:", policies.length, "건");
    
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }
}

crawlBizInfo();
