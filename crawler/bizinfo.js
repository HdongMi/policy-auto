import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

async function crawlBizInfo() {
  try {
    const res = await fetch(URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    const policies = [];

    // 기업마당 테이블 구조에 맞게 셀렉터 최적화
    $(".table_list tbody tr").each((_, el) => {
      const $el = $(el);
      
      // 제목 추출 및 줄바꿈/탭 제거
      const title = $el.find("td.tit a").text().replace(/\s+/g, ' ').trim();
      
      // 상태 확인 (접수중, 마감 등)
      const status = $el.find("td").eq(0).text().trim(); 
      
      // 날짜 (보통 4번째 td)
      const deadline = $el.find("td").eq(3).text().trim();
      
      // 링크 구성 (중복 방지 및 절대 경로 보장)
      let rawLink = $el.find("td.tit a").attr("href") || "";
      const link = rawLink.startsWith("http") 
        ? rawLink 
        : `https://www.bizinfo.go.kr${rawLink}`;

      // 제목이 없거나, 이미 마감된 공고는 제외하고 싶을 때 조건 추가
      if (!title || status.includes("마감")) return;

      policies.push({
        title,
        region: "전국",
        amount: "",
        deadline,
        target: "중소기업·소상공인",
        content: `[${status}] 기업마당 공고`, // 상태 정보 추가
        source: "출처: 기업마당",
        link
      });
    });

    fs.writeFileSync("bizinfo.json", JSON.stringify(policies, null, 2));
    console.log("✅ 기업마당 공고 업데이트 완료:", policies.length, "건");
    
  } catch (error) {
    console.error("❌ 기업마당 크롤링 중 에러 발생:", error);
  }
}

crawlBizInfo();
