import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

async function crawlBizInfo() {
  try {
    const res = await fetch(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const policies = [];

    // tr 요소가 있는지 먼저 확인
    const rows = $(".table_list tbody tr");
    console.log("찾은 행 개수:", rows.length);

    rows.each((_, el) => {
      const $el = $(el);
      
      // 제목 셀렉터를 더 유연하게 변경
      const titleElement = $el.find("td.tit a");
      const title = titleElement.text().replace(/\s+/g, ' ').trim();
      
      if (!title) return;

      // 링크 추출
      let rawLink = titleElement.attr("href") || "";
      const link = rawLink.startsWith("http") 
        ? rawLink 
        : `https://www.bizinfo.go.kr${rawLink}`;

      // 날짜 (4번째 td)
      const deadline = $el.find("td").eq(3).text().trim();

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

    fs.writeFileSync("bizinfo.json", JSON.stringify(policies, null, 2));
    console.log("✅ 기업마당 공고 업데이트 완료:", policies.length, "건");
    
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }
}

crawlBizInfo();
