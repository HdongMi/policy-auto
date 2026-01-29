import fs from "fs";
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
    console.log("🚀 크롤링 시작 (데이터 누적 모드)...");

    // 1. 기존 데이터 읽어오기 (없으면 빈 배열)
    let existingPolicies = [];
    try {
      if (fs.existsSync("policies.json")) {
        existingPolicies = JSON.parse(fs.readFileSync("policies.json", "utf8"));
      }
    } catch (e) {
      console.log("기존 파일이 없어 새로 생성합니다.");
    }

    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    
    // 테이블 로딩을 위해 3초 더 대기
    await page.waitForTimeout(3000); 
    await page.waitForSelector(".table_list tbody tr", { timeout: 30000 });

    const newPolicies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".table_list tbody tr"));
      return rows.map(row => {
        const titleEl = row.querySelector("td.tit a");
        if (!titleEl || titleEl.innerText.includes("데이터가 없습니다")) return null;

        const onClickAttr = titleEl.getAttribute("onclick") || "";
        const idMatch = onClickAttr.match(/['"](PBLN_[^'"]+)['"]/); 
        const pblancId = idMatch ? idMatch[1] : "";
        
        const realLink = pblancId 
          ? `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${pblancId}`
          : "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

        const tds = Array.from(row.querySelectorAll("td"));
        const dateCell = tds.find(td => /\d{4}/.test(td.innerText)) || tds[3];

        return {
          title: titleEl.innerText.replace(/\s+/g, ' ').trim(),
          region: "전국",
          amount: "공고문 참조",
          deadline: dateCell ? dateCell.innerText.trim() : "공고문 참조",
          target: "중소기업·소상공인",
          content: "기업마당 정책공고입니다.",
          source: "출처: 기업마당",
          link: realLink
        };
      }).filter(item => item !== null);
    });

    // 2. 중복 제거 후 합치기 (제목 기준)
    const combined = [...newPolicies, ...existingPolicies];
    const uniquePolicies = combined.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);

    // 3. 다시 policies.json으로 저장
    fs.writeFileSync("policies.json", JSON.stringify(uniquePolicies, null, 2));
    console.log(`✅ 업데이트 완료: 새 공고 ${newPolicies.length}건 추가 (총 ${uniquePolicies.length}건)`);

  } catch (error) {
    console.error("❌ 에러 발생:", error);
  } finally {
    await browser.close();
  }
}

crawlBizInfo();
