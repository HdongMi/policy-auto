import fs from "fs";
import path from "path";
import { chromium } from "playwright";

async function crawlBizInfo() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";
    console.log("🚀 크롤링을 시작합니다...");

    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector(".table_list tbody tr", { timeout: 15000 });

    const policies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl) return null;

        const onClickAttr = titleEl.getAttribute("onclick") || "";
        const idMatch = onClickAttr.match(/['"](PBLN_[^'"]+)['"]/); 
        const pblancId = idMatch ? idMatch[1] : "";
        
        const realLink = pblancId 
          ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${pblancId}`
          : "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

        const tds = Array.from(row.querySelectorAll("td"));
        const dateCell = tds.find(td => /\d{4}\.\d{2}\.\d{2}/.test(td.innerText)) || tds[3];
        let deadlineTd = dateCell ? dateCell.innerText.trim() : "공고문 참조";
        
        if (deadlineTd.length < 5) deadlineTd = "공고문 참조";

        return {
          title: titleEl.innerText.replace(/\s+/g, ' ').trim(),
          region: "전국",
          amount: "공고문 참조",
          deadline: deadlineTd,
          target: "중소기업·소상공인",
          content: "기업마당 정책공고입니다.",
          source: "출처: 기업마당",
          link: realLink
        };
      }).filter(item => item !== null && item.title !== "");
    });

    // 핵심: 현재 실행 위치와 상관없이 프로젝트 최상위의 policies.json에 저장
    const filePath = path.join(process.cwd(), "policies.json");
    fs.writeFileSync(filePath, JSON.stringify(policies, null, 2));
    
    console.log(`✅ 업데이트 완료! 총 ${policies.length}개의 공고가 policies.json에 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 크롤링 중 에러 발생:", error);
  } finally {
    await browser.close();
  }
}

crawlBizInfo();
