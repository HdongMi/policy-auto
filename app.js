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
    fetchData(); 
  }, 500);
});

// 2. 데이터 가져오기 (캐시 방지 쿼리 추가)
function fetchData() {
  listEl.innerHTML = "<p>최신 정책 공고를 불러오는 중입니다...</p>";
  const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      console.error(err);
      listEl.innerHTML = "<p>공고를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>";
    });
}

// 3. 목록 그리기
function render() {
  listEl.innerHTML = "";
  const selectedRegion = regionFilter.value;
  const today = new Date();

  const filtered = policies.filter(p => {
    const regionMatch = (selectedRegion === "전체" || p.region.includes(selectedRegion) || p.region === "전국");
    
    let isClosed = false;
    if (p.deadline && p.deadline.length >= 8) {
      const dateStr = p.deadline.replace(/[^0-9]/g, '');
      const deadlineDate = new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`);
      isClosed = !isNaN(deadlineDate) && deadlineDate < today;
    }

    if (currentStatus === "마감") return regionMatch && isClosed;
    if (currentStatus === "진행중") return regionMatch && !isClosed;
    return regionMatch;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = "<p style='text-align:center; padding:20px;'>해당하는 공고가 없습니다.</p>";
    return;
  }

  filtered.forEach(p => {
    let isClosed = false;
    if (p.deadline && p.deadline.length >= 8) {
      const dateStr = p.deadline.replace(/[^0-9]/g, '');
      const deadlineDate = new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`);
      isClosed = !isNaN(deadlineDate) && deadlineDate < today;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="status-label" style="color: ${isClosed ? '#ff4444' : '#2e7d32'}">
        ${isClosed ? "● 마감" : "● 진행중"}
      </div>
      <h3>${p.title}</h3>
      <p style="font-size:13px; color:#666;">📍 지역: ${p.region} | 📅 기한: ${p.deadline}</p>
    `;
    card.onclick = () => openDetail(p);
    listEl.appendChild(card);
  });
}

// 4. 상세 페이지 열기 (기업마당 보안 우회 적용)
function openDetail(p) {
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.region || "전국";
  document.getElementById("detailDeadline").textContent = p.deadline;
  document.getElementById("detailSource").textContent = p.source;
  
  const detailLink = document.getElementById("detailLink");
  
  // 🔗 [핵심 수정] 기업마당 '잘못된 접근' 에러 방지 설정
  // rel="noreferrer"를 설정해야 기업마당 보안 필터를 통과할 확률이 높습니다.
  detailLink.href = p.link;
  detailLink.setAttribute("rel", "noreferrer noopener");
  detailLink.setAttribute("target", "_blank");

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
