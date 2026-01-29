const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const URL =
  "https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=81";

async function crawl() {
  try {
    const { data } = await axios.get(URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const $ = cheerio.load(data);
    const policies = [];

    $("tbody tr").each((_, el) => {
      const aTag = $(el).find("a");
      const title = aTag.text().trim();
      const linkPath = aTag.attr("href");

      if (!title || !linkPath) return;
      if (
        !title.includes("소상공인") &&
        !title.includes("정책자금") &&
        !title.includes("경영안정")
      ) return;

      policies.push({
        title,
        region: "전국",
        amount: "공고문 참조",
        deadline: "공고문 참조",
        status: "신청중",
        target: "소상공인",
        content: "중소벤처기업부 정책 공고",
        source: "출처: 중소벤처기업부",
        link: "https://www.mss.go.kr" + linkPath
      });
    });

    fs.writeFileSync(
      "policies.json",
      JSON.stringify(policies, null, 2)
    );

    console.log("성공:", policies.length);
  } catch (err) {
    console.error("크롤링 에러:", err.message);
    process.exit(1);
  }
}

crawl();
