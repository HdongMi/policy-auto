let policies = [];

const listEl = document.getElementById("policyList");
const regionFilter = document.getElementById("regionFilter");
const statusButtons = document.querySelectorAll(".status-buttons button");

let currentStatus = "전체";

/* =========================
   데이터 불러오기
   ========================= */
// 바탕화면의 policies.json 파일을 읽도록 경로를 "./policies.json"으로 수정했습니다.
fetch("https://HdongMi.github.io/policy-auto/policies.json")
  .then(res => res.json())
  .then(data => {
    policies = data;
    render();
  })
  .catch(err => {
    console.error("정책 데이터 로드 실패: policies.json 파일이 같은 폴더에 있는지 확인하세요.", err);
    // 에러 발생 시 사용자에게 알림 표시 (선택 사항)
    listEl.innerHTML = "<p style='padding:16px;'>데이터를 불러올 수 없습니다. policies.json 파일을 확인해주세요.</p>";
  });

/* =========================
   렌더링
   ========================= */
function render() {
  listEl.innerHTML = "";

  const region = regionFilter.value;
  const today = new Date();

  // 데이터가 없을 경우 처리
  if (policies.length === 0) {
    listEl.innerHTML = "<p style='padding:16px;'>표시할 공고가 없습니다.</p>";
    return;
  }

  policies
    .filter(p => {
      // 지역 필터
      if (region === "전체") return true;
      return p.region === region || p.region === "전국";
    })
    .filter(p => {
      // 상태 필터 (전체 / 마감)
      if (currentStatus === "전체") return true;

      if (currentStatus === "마감") {
        if (p.deadline === "공고문 참조") return false;
        // 날짜 비교를 위해 .을 -로 바꿔서 인식률 높임
        const deadlineDate = new Date(p.deadline.replace(/\./g, '-'));
        return deadlineDate < today;
      }
      return true;
    })
    .forEach(p => {
      const deadlineDate = p.deadline !== "공고문 참조" ? new Date(p.deadline.replace(/\./g, '-')) : null;
      const isClosed = deadlineDate && deadlineDate < today;

      const card = document.createElement("div");
      card.className = "card" + (isClosed ? " closed" : "");

      card.innerHTML = `
        <div class="status" style="color: ${isClosed ? '#ff0000' : '#2e7d32'}">${isClosed ? "마감" : "진행중"}</div>
        <h3>${p.title}</h3>
        <p>${p.amount || "공고문 참조"}</p>
        <p>마감: ${p.deadline}</p>
      `;

      card.onclick = () => openDetail(p);
      listEl.appendChild(card);
    });
}

/* =========================
   상세 페이지
   ========================= */
function openDetail(p) {
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.target || "공고문 참조";
  document.getElementById("detailContent").textContent = p.content || "상세 내용은 원문 공고를 확인해주세요.";
  document.getElementById("detailDeadline").textContent = p.deadline || "공고문 참조";
  document.getElementById("detailSource").textContent = p.source || "";
  document.getElementById("detailLink").href = p.link || "#";

  document.getElementById("detailView").classList.remove("hidden");
}

document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
};

/* =========================
   이벤트
   ========================= */
regionFilter.onchange = render;

statusButtons.forEach(btn => {
  btn.onclick = () => {
    statusButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    render();
  };
});