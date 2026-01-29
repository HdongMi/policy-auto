import fs from "fs";
import path from "path";
import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  // 사람처럼 보이게 하기 위한 브라우저 설정
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  const filePath = path.join(process.cwd(), "policies.json");
  let allNewPolicies = [];

  try {
    // --- 1. 기업마당 ---
    console.log("🔍 기업마당 접속 중...");
    try {
      await page.goto("https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", { 
        waitUntil: "networkidle", // 네트워크가 조용해질 때까지 대기
        timeout: 60000 
      });
      // 데이터가 뜰 때까지 최대 30초 대기
      await page.waitForSelector(".table_list", { timeout: 30000 });
      
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
    } catch (e) {
      console.log("⚠️ 기업마당 수집 중 타임아웃 발생 (건너뜁니다)");
    }

    // --- 2. 소진공 ---
    console.log("🔍 소진공 접속 중...");
    try {
      await page.goto("https://www.semas.or.kr/web/lay1/program/S1T122C128/business/list.do", { 
        waitUntil: "networkidle",
        timeout: 60000 
      });
      await page.waitForSelector(".table_list", { timeout: 30000 });
      
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
    } catch (e) {
      console.log("⚠️ 소진공 수집 중 타임아웃 발생 (건너뜁니다)");
    }

    // --- 3. 데이터 통합 ---
    if (allNewPolicies.length > 0) {
      let existingData = [];
      if (fs.existsSync(filePath)) {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      }

      const combined = [...allNewPolicies, ...existingData];
      const unique = combined.filter((v, i, a) => 
        v.title && a.findIndex(t => t.title === v.title) === i
      );

      fs.writeFileSync(filePath, JSON.stringify(unique, null, 2));
      console.log(`✨ 최종 결과: 총 ${unique.length}건 저장 완료!`);
    } else {
      console.log("❌ 새로 수집된 데이터가 없어 저장하지 않습니다.");
    }

  } catch (error) {
    console.error("❌ 치명적 에러:", error.message);
  } finally {
    await browser.close();
  }
}

run();
