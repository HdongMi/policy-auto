import fs from "fs";

function readJSON(path) {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

const mss = readJSON("mss.json");
const bizinfo = readJSON("bizinfo.json");


const allPolicies = [
  ...mss,
  ...bizinfo,
  ...semas
];

// 제목 중복 제거
const unique = [];
const titles = new Set();

for (const p of allPolicies) {
  if (!titles.has(p.title)) {
    titles.add(p.title);
    unique.push(p);
  }
}

// 최신순 정렬 (날짜 없는 건 뒤로)
unique.sort((a, b) => {
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return new Date(a.deadline) - new Date(b.deadline);
});

fs.writeFileSync(
  "policies.json",
  JSON.stringify(unique, null, 2)
);

console.log("총 정책 수:", unique.length);
