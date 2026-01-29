import fs from "fs";
import path from "path";
import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const filePath = path.join(process.cwd(), "policies.json");

  let allNewPolicies = [];

  try {
    // --- 1. 기업마당 ---
    console.log("🔍 기업마당 접속 중...");
    await page.goto("https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".table_list tbody tr", { timeout: 15000 });
    
    const bizData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const a = row.querySelector("td.tit a");
        if (!a || a.innerText.includes("데이터가 없습니다")) return null;
        return {
          title: a.innerText.trim(),
          region: "전국",
          deadline: row.querySelectorAll("td")[3]?.innerText.trim() || "상세참조",
          source: "기업마당",
          link: "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do"
        };
      }).filter(i => i !== null);
    });
    console.log(`✅ 기업마당에서 ${bizData.length}건 발견`);
    allNewPolicies.push(...bizData);

    // --- 2. 소진공 ---
    console.log("🔍 소진공 접속 중...");
    await page.goto("https://www.semas.or.kr/web/lay1/program/S1T122C128/business/list.do", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".table_list tbody tr", { timeout: 15000 });
    
    const semasData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const a = row.querySelector("td.tit a");
        if (!a) return null;
        return {
          title: a.innerText.trim(),
          region: "전국",
          deadline: row.querySelectorAll("td")[4]?.innerText.trim() || "상세참조",
          source: "소진공",
          link: "https://www.semas.or.kr/web/lay1/program/S1T122C128/business/list.do"
        };
      }).filter(i => i !== null);
    });
    console.log(`✅ 소진공에서 ${semasData.length}건 발견`);
    allNewPolicies.push(...semasData);

    // --- 3. 합치기 ---
    let existingData = [];
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    // 새 데이터 + 기존 데이터 합치고 중복 제거
    const combined = [...allNewPolicies, ...existingData];
    const unique = combined.filter((v, i, a) => 
      v.title && a.findIndex(t => t.title === v.title) === i
    );

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
    console.log(`✨ 최종 결과: 총 ${unique.length}건 저장 완료!`);

  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
  } finally {
    await browser.close();
  }
}

run();
