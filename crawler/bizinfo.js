import fs from "fs";
import { chromium } from "playwright";

async function crawlBizInfo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector(".table_list tbody tr", { timeout: 10000 });

    const policies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl) return null;

        // 1. 링크 문제 해결: javascript 코드에서 ID만 추출하여 실제 URL 생성
        const href = titleEl.getAttribute("onclick") || titleEl.getAttribute("href") || "";
        const idMatch = href.match(/'([^']+)'/); // 'PBLN_0000000000123' 형태 추출
        const pblancId = idMatch ? idMatch[1] : "";
        const realLink = pblancId 
          ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${pblancId}`
          : "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

        // 2. 신청기간 문제 해결: td들 중 '날짜' 패턴이 있는 칸을 정확히 찾기
        const tds = Array.from(row.querySelectorAll("td"));
        // 날짜가 보통 4번째 td(index 3)에 있지만, 안전하게 '202X'가 포함된 텍스트를 찾음
        const deadlineTd = tds.find(td => /\d{4}/.test(td.innerText))?.innerText.trim() || "공고문 참조";

        return {
          title: titleEl.innerText.replace(/\s+/g, ' ').trim(),
          region: "전국",
          amount: "",
          deadline: deadlineTd,
          target: "중소기업·소상공인",
          content: "기업마당 공고",
          source: "출처: 기업마당",
          link: realLink
        };
      }).filter(item => item !== null && item.title !== "");
    });

    fs.writeFileSync("bizinfo.json", JSON.stringify(policies, null, 2));
    console.log("✅ 기업마당 상세 링크 및 날짜 최적화 완료:", policies.length, "건");

  } catch (error) {
    console.error("❌ 크롤링 에러:", error);
  } finally {
    await browser.close();
  }
}

crawlBizInfo();
