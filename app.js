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
  listEl.innerHTML = "<p style='text-align:center;'>데이터를 가져오는 중...</p>";
  const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      listEl.innerHTML = "<p>데이터 로드 실패</p>";
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
  const today = new Date();
  today.setHours(0,0,0,0);

  const filtered = policies.filter(p => {
    const deadlineDate = getEndDate(p.deadline);
    const isClosed = deadlineDate && deadlineDate < today;
    return currentStatus === "마감" ? isClosed : !isClosed;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<p style='text-align:center; padding:50px;'>공고가 없습니다.</p>`;
    return;
  }

  filtered.forEach(p => {
    const deadlineDate = getEndDate(p.deadline);
    let dDayHtml = "";
    
    if (!deadlineDate) {
      dDayHtml = `<span class="d-day d-day-check">기한확인</span>`;
    } else {
      const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      if (diff === 0) dDayHtml = `<span class="d-day d-day-urgent">오늘마감</span>`;
      else if (diff > 0) dDayHtml = `<span class="d-day d-day-soon">D-${diff}</span>`;
      else dDayHtml = `<span class="d-day" style="background:#bbb">종료</span>`;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span style="font-size:12px; font-weight:bold; color:var(--lilac-accent)">● ${currentStatus === "마감" ? "마감" : "진행중"}</span>
        ${dDayHtml}
      </div>
      <h3 style="margin:0 0 10px 0; font-size:16px;">${p.title}</h3>
      <div style="font-size:13px; color:#777;">
        <p style="margin:2px 0;">📍 지역: ${p.region}</p>
        <p style="margin:2px 0;">📅 기한: ${p.deadline}</p>
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
  const link = document.getElementById("detailLink");
  link.href = p.link;
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

init();
