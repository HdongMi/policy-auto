let policies = [];
let currentStatus = "전체";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const regionFilter = document.getElementById('regionFilter');
const statusButtons = document.querySelectorAll('.status-buttons button');

// 1. 랜딩 페이지 -> 메인 이동
startBtn.addEventListener('click', () => {
  landingPage.style.opacity = '0';
  setTimeout(() => {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData(); // 전환될 때 데이터를 가져옵니다.
  }, 500);
});

// 2. 데이터 가져오기
function fetchData() {
  listEl.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
  fetch("https://HdongMi.github.io/policy-auto/policies.json")
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      listEl.innerHTML = "<p>공고를 불러올 수 없습니다. 잠시 후 다시 시 de.</p>";
    });
}

// 3. 목록 그리기
function render() {
  listEl.innerHTML = "";
  const selectedRegion = regionFilter.value;
  const today = new Date();

  const filtered = policies.filter(p => {
    const regionMatch = (selectedRegion === "전체" || p.region === selectedRegion || p.region === "전국");
    
    let statusMatch = true;
    if (currentStatus === "마감") {
      const deadline = new Date(p.deadline.replace(/\./g, '-'));
      statusMatch = deadline < today;
    } else if (currentStatus === "전체") {
      statusMatch = true; // 진행중 위주로 보려면 여기서 조절 가능
    }
    return regionMatch && statusMatch;
  });

  filtered.forEach(p => {
    const deadlineDate = new Date(p.deadline.replace(/\./g, '-'));
    const isClosed = !isNaN(deadlineDate) && deadlineDate < today;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="status-label" style="color: ${isClosed ? '#ff4444' : '#2e7d32'}">
        ${isClosed ? "● 마감" : "● 진행중"}
      </div>
      <h3>${p.title}</h3>
      <p style="font-size:13px; color:#666;">📍 지역: ${p.region} | 📅 마감: ${p.deadline}</p>
    `;
    card.onclick = () => openDetail(p);
    listEl.appendChild(card);
  });
}

// 4. 상세 페이지 열기
function openDetail(p) {
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.region || "전국";
  document.getElementById("detailDeadline").textContent = p.deadline;
  document.getElementById("detailSource").textContent = p.source;
  document.getElementById("detailLink").href = p.link;
  document.getElementById("detailView").classList.remove("hidden");
}

document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
};

// 5. 필터 이벤트
regionFilter.onchange = render;
statusButtons.forEach(btn => {
  btn.onclick = () => {
    statusButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    render();
  };
});
