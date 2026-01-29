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

  let allNewPolicies = [];

  try {
    // --- 1. 기업마당 크롤링 ---
    console.log("🔍 기업마당 수집 시작...");
    await page.goto("https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", { waitUntil: "networkidle" });
    const bizData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const a = row.querySelector("td.tit a");
        if (!a || a.innerText.includes("데이터가 없습니다")) return null;
        const id = a.getAttribute("onclick")?.match(/['"](PBLN_[^'"]+)['"]/)?.[1];
        return {
          title: a.innerText.trim(),
          region: "전국",
          deadline: row.querySelectorAll("td")[3]?.innerText.trim() || "상세참조",
          source: "기업마당",
          link: id ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${id}` : "https://www.bizinfo.go.kr"
        };
      }).filter(i => i !== null);
    });
    allNewPolicies.push(...bizData);

    // --- 2. 소진공(SEMAS) 크롤링 ---
    console.log("🔍 소진공 수집 시작...");
    await page.goto("https://www.semas.or.kr/web/lay1/program/S1T122C128/business/list.do", { waitUntil: "networkidle" });
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
          link: "https://www.semas.or.kr" + (a.getAttribute("href") || "")
        };
      }).filter(i => i !== null);
    });
    allNewPolicies.push(...semasData);

    // --- 3. 데이터 통합 및 누적 (중복 제거) ---
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) { console.log("기존 파일 읽기 실패, 새로 생성합니다."); }
    }

    const combined = [...allNewPolicies, ...existingData];
    // 제목이 같으면 중복으로 간주하고 제거
    const unique = combined.filter((v, i, a) => 
      v.title && a.findIndex(t => t.title === v.title) === i
    );

    fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
    console.log(`✅ 업데이트 완료! 현재 총 ${unique.length}건의 공고가 저장되어 있습니다.`);

  } catch (error) {
    console.error("❌ 크롤링 에러 발생:", error);
  } finally {
    await browser.close();
  }
}

run();
