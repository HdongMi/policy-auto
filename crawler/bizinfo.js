import fs from "fs";
import { chromium } from "playwright";

async function crawlBizInfo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";
    await page.goto(URL, { waitUntil: "networkidle" });

    // 데이터가 있는 테이블 행(tr)이 나타날 때까지 대기
    await page.waitForSelector(".table_list tbody tr", { timeout: 10000 });

    const policies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl) return null;

        return {
          title: titleEl.innerText.replace(/\s+/g, ' ').trim(),
          region: "전국",
          amount: "",
          deadline: row.querySelectorAll("td")[3]?.innerText.trim() || "",
          target: "중소기업·소상공인",
          content: "기업마당 공고",
          source: "출처: 기업마당",
          link: "https://www.bizinfo.go.kr" + titleEl.getAttribute("href")
        };
      }).filter(item => item !== null);
    });

    fs.writeFileSync("bizinfo.json", JSON.stringify(policies, null, 2));
    console.log("✅ 기업마당 공고 업데이트 완료:", policies.length, "건");

  } catch (error) {
    console.error("❌ 기업마당 크롤링 에러:", error);
  } finally {
    await browser.close();
  }
}

crawlBizInfo();
