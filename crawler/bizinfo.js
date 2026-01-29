import fs from "fs";
import path from "path"; // 경로 처리를 위해 추가
import { chromium } from "playwright";

async function crawlBizInfo() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 핵심: 파일이 저장될 절대 경로를 설정 (프로젝트 최상위의 policies.json)
  const filePath = path.join(process.cwd(), "policies.json");

  try {
    const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";
    console.log("🚀 크롤링 시작 (루트 폴더 저장 모드)...");

    // 1. 기존 데이터 읽기 (최상위 경로에서 가져옴)
    let existingPolicies = [];
    if (fs.existsSync(filePath)) {
      try {
        existingPolicies = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        console.log("기존 파일 읽기 실패, 새로 생성합니다.");
      }
    }

    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
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

    // 2. 중복 제거 및 병합
    const combined = [...newPolicies, ...existingPolicies];
    const uniquePolicies = combined.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);

    // 3. 최상위 경로에 파일 쓰기
    fs.writeFileSync(filePath, JSON.stringify(uniquePolicies, null, 2));
    console.log(`✅ 업데이트 성공: 총 ${uniquePolicies.length}건이 ${filePath}에 저장되었습니다.`);

  } catch (error) {
    console.error("❌ 크롤링 에러:", error);
  } finally {
    await browser.close();
  }
}

crawlBizInfo();
