import fs from "fs";

const policies = [
  {
    title: "소상공인 정책자금 (중소벤처기업부)",
    region: "전국",
    amount: "정책자금",
    deadline: "공고문 참조",
    target: "소상공인",
    content: "중소벤처기업부 정책자금",
    source: "출처: 중소벤처기업부",
    link: "https://www.mss.go.kr"
  }
];

fs.writeFileSync("mss.json", JSON.stringify(policies, null, 2));
console.log("중기부 공고 수:", policies.length);
