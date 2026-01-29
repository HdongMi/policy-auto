import fs from "fs";
import fetch from "node-fetch";
import cheerio from "cheerio";

const URL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

const res = await fetch(URL);
const html = await res.text();
const $ = cheerio.load(html);

const policies = [];

$(".table_list tbody tr").each((_, el) => {
  const title = $(el).find("td.tit a").text().trim();
  const deadline = $(el).find("td").eq(3).text().trim();
  const link = "https://www.bizinfo.go.kr" + $(el).find("a").attr("href");

  if (!title) return;

  policies.push({
    title,
    region: "전국",
    amount: "",
    deadline,
    target: "중소기업·소상공인",
    content: "기업마당 공고",
    source: "출처: 기업마당",
    link
  });
});

fs.writeFileSync("bizinfo.json", JSON.stringify(policies, null, 2));
console.log("기업마당 공고 수:", policies.length);

