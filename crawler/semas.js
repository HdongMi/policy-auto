import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";


const URL = "https://www.semas.or.kr/web/lay1/program/S1T122C128/business/list.do";

const res = await fetch(URL);
const html = await res.text();
const $ = cheerio.load(html);

const policies = [];

$(".table_list tbody tr").each((_, el) => {
  const title = $(el).find("td.tit a").text().trim();
  const deadline = $(el).find("td").eq(4).text().trim();
  const link = "https://www.semas.or.kr" + $(el).find("a").attr("href");

  if (!title) return;

  policies.push({
    title,
    region: "전국",
    amount: "",
    deadline,
    target: "소상공인",
    content: "소상공인시장진흥공단 지원사업",
    source: "출처: 소상공인시장진흥공단",
    link
  });
});

fs.writeFileSync("semas.json", JSON.stringify(policies, null, 2));
console.log("소진공 공고 수:", policies.length);

