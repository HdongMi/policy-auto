import fs from "fs";
import path from "path";
import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const filePath = path.join(process.cwd(), "policies.json");

  let allScrapedPolicies = [];

  try {
    // --- 1. 기업마당 (Bizinfo) ---
    console.log("🔍 기업마당 크롤링 중...");
    await page.goto("https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", { waitUntil: "networkidle" });
    const bizData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl || titleEl.innerText.includes("데이터가 없습니다")) return null;
        const onClick = titleEl.getAttribute("onclick") || "";
        const idMatch = onClick.match(/['"](PBLN_[^'"]+)['"]/);
        return {
          title: titleEl.innerText.trim(),
          region: "전국",
          deadline: row.querySelectorAll("td")[3]?.innerText.trim() || "상세참조",
          source: "기업마당",
          link: idMatch ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${idMatch[1]}` : "https://www.bizinfo.go.kr"
        };
      }).filter(i => i !== null);
    });
    allScrapedPolicies.push(...bizData);

    // --- 2. 소상공인시장진흥공단 (Semas) ---
    console.log("🔍 소진공 크롤링 중...");
    await page.goto("https://www.semas.or.kr/web/lay1/program/S1T122C128/business/list.do", { waitUntil: "networkidle" });
    const semasData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl) return null;
        return {
          title: titleEl.innerText.trim(),
          region: "전국",
          deadline: row.querySelectorAll("td")[4]?.innerText.trim() || "상세참조",
          source: "소진공",
          link: "https://www.semas.or.kr" + (titleEl.getAttribute("href") || "")
        };
      }).filter(i => i !== null);
    });
    allScrapedPolicies.push(...semasData);

    // --- 3. 중소벤처기업부 (MSS) ---
    // (참고: 중기부 사이트는 보안상 크롤링이 까다로울 수 있어 소진공 로직을 응용하거나 API를 권장하지만, 일단 구조는 동일하게 유지합니다.)
    console.log("🔍 중기부 데이터 통합 중...");
    // ... 중기부 특화 로직 추가 지점 ...

    // --- 데이터 병합 및 중복 제거 ---
    let existingData = [];
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    const combined = [...allScrapedPolicies, ...existingData];
    const unique = combined.filter((v, i, a) => 
      v.title && a.findIndex(t => t.title === v.title) === i
    );

    // 마감일 기준 정렬 (선택사항)
    unique.sort((a, b) => b.deadline.localeCompare(a.deadline));

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
    console.log(`✅ 업데이트 완료: 새 공고 포함 총 ${unique.length}건 저장됨`);

  } catch (error) {
    console.error("❌ 크롤링 중 에러 발생:", error);
  } finally {
    await browser.close();
  }
}

run();
