let policies = [];
let currentStatus = "전체";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const statusButtons = document.querySelectorAll('.status-buttons button');

function init() {
  const isVisited = sessionStorage.getItem('visited');
  if (isVisited === 'true') {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
  } else {
    landingPage.style.display = 'flex';
  }
}

startBtn.addEventListener('click', () => {
  sessionStorage.setItem('visited', 'true');
  landingPage.style.opacity = '0';
  setTimeout(() => {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
  }, 500);
});

function fetchData() {
  listEl.innerHTML = "<p style='text-align:center; padding:20px;'>최신 정책 공고를 불러오는 중입니다...</p>";
  const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      console.error(err);
      listEl.innerHTML = "<p style='text-align:center; padding:20px;'>데이터를 불러올 수 없습니다.</p>";
    });
}

function getEndDate(deadlineStr) {
  if (!deadlineStr || deadlineStr === "상세참조") return null;
  const parts = deadlineStr.split('~');
  const target = parts.length > 1 ? parts[1] : parts[0];
  const dateStr = target.replace(/[^0-9]/g, '');
  if (dateStr.length >= 8) {
    return new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`);
  }
  return null;
}

function render() {
  listEl.innerHTML = "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = policies.filter(p => {
    let isClosed = false;
    const deadlineDate = getEndDate(p.deadline);
    if (deadlineDate) {
      isClosed = deadlineDate < today;
    }

    if (currentStatus === "마감") return isClosed;
    return !isClosed;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<p style='text-align:center; padding:50px; color:#888;'>공고가 없습니다.</p>`;
    return;
  }

  filtered.forEach(p => {
    let dDayTag = "";
    const deadlineDate = getEndDate(p.deadline);
    const isDetailRef = !deadlineDate;

    if (isDetailRef) {
      dDayTag = `<span class="d-day" style="background:#f1f3f5; color:#666; border:1px solid #ddd;">기한확인</span>`;
    } else {
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) dDayTag = `<span class="d-day" style="background:#eccc68; color:#333;">오늘마감</span>`;
      else if (diffDays > 0 && diffDays <= 7) dDayTag = `<span class="d-day" style="background:#ff4757; color:white;">D-${diffDays}</span>`;
      else if (diffDays > 0) dDayTag = `<span class="d-day" style="background:#2e59d9; color:white;">D-${diffDays}</span>`;
      else dDayTag = `<span class="d-day" style="background:#888; color:white;">종료</span>`;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <span style="color:${currentStatus === "마감" ? "#ff4444" : "#2e7d32"}; font-size:12px; font-weight:bold;">● ${currentStatus === "마감" ? "마감" : "진행중"}</span>
        ${dDayTag}
      </div>
      <h3 style="margin-bottom:10px; font-size:16px; line-height:1.4; font-weight:700;">${p.title}</h3>
      <div style="font-size:13px; color:#666; line-height:1.6;">
        <p>📍 지역: ${p.region}</p>
        <p>📅 기한: <span style="${isDetailRef ? 'color:#d63031; font-weight:bold;' : ''}">${p.deadline}</span></p>
      </div>
    `;
    card.onclick = () => openDetail(p);
    listEl.appendChild(card);
  });
}

function openDetail(p) {
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.region || "전국";
  document.getElementById("detailDeadline").textContent = p.deadline;
  document.getElementById("detailSource").textContent = p.source;
  const detailLink = document.getElementById("detailLink");
  detailLink.href = p.link;
  detailLink.setAttribute("rel", "noreferrer noopener");
  detailLink.setAttribute("target", "_blank");
  document.getElementById("detailView").classList.remove("hidden");
}

document.getElementById("backBtn").onclick = () => document.getElementById("detailView").classList.add("hidden");

statusButtons.forEach(btn => {
  btn.onclick = () => {
    statusButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentStatus = btn.dataset.status;
    render();
  };
});

window.onload = init;
