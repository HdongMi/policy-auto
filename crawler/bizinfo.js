import fs from "fs";
import path from "path";
import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const filePath = path.join(process.cwd(), "policies.json");

  try {
    // 1. 기존 데이터 로드 (없으면 빈 배열)
    let existingData = [];
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    // 2. 기업마당 크롤링
    console.log("🚀 기업마당 크롤링 시작...");
    await page.goto("https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", { waitUntil: "networkidle" });
    await page.waitForSelector(".table_list tbody tr");

    const scrapedData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl || titleEl.innerText.includes("데이터가 없습니다")) return null;
        
        // 상세 링크 생성 로직
        const onClick = titleEl.getAttribute("onclick") || "";
        const idMatch = onClick.match(/['"](PBLN_[^'"]+)['"]/);
        const link = idMatch ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${idMatch[1]}` : "https://www.bizinfo.go.kr";

        return {
          title: titleEl.innerText.trim(),
          region: "전국",
          deadline: row.querySelectorAll("td")[3]?.innerText.trim() || "공고문 참조",
          target: "소상공인/중소기업",
          source: "기업마당",
          link: link
        };
      }).filter(i => i !== null);
    });

    // 3. 데이터 병합 및 중복 제거 (제목 기준)
    const combined = [...scrapedData, ...existingData];
    const unique = combined.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);

    // 4. 저장 (최종본)
    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
    console.log(`✅ 성공: 현재 총 ${unique.length}개의 공고가 저장되어 있습니다.`);

  } catch (err) {
    console.error("❌ 에러:", err);
  } finally {
    await browser.close();
  }
}

run();
