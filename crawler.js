const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const URL =
  "https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=81";

async function crawl() {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const policies = [];

    $(".bdList tbody tr").each((_, el) => {
      const title = $(el).find(".tit a").text().trim();
      const linkPath = $(el).find(".tit a").attr("href");

      if (!title) return;
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
      JSON.stringify(policies, null, 2),
      "utf-8"
    );

    console.log(`완료: ${policies.length}건`);
  } catch (e) {
    console.error(e);
  }
}

crawl();
