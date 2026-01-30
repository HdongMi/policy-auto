let policies = [];
let currentStatus = "전체";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleBtns = document.querySelectorAll('.toggle-btn');

/** 1. 초기화 */
function init() {
  const isVisited = sessionStorage.getItem('visited');
  if (isVisited === 'true') {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
  }
}

/** 2. 시작 버튼 */
startBtn.addEventListener('click', () => {
  sessionStorage.setItem('visited', 'true');
  landingPage.style.opacity = '0';
  setTimeout(() => {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
  }, 500);
});

/** 3. 데이터 패치 */
function fetchData() {
  listEl.innerHTML = "<p style='text-align:center; padding:20px;'>정책을 불러오는 중...</p>";
  const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      listEl.innerHTML = "<p>데이터를 불러올 수 없습니다.</p>";
    });
}

/** 4. 날짜 파싱 */
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

/** 5. 리스트 렌더링 (클릭 기능 포함) */
function render() {
  listEl.innerHTML = "";
  const today = new Date();
  today.setHours(0,0,0,0);

  const filtered = policies.filter(p => {
    const deadlineDate = getEndDate(p.deadline);
    const isClosed = deadlineDate && deadlineDate < today;
    return currentStatus === "마감" ? isClosed : !isClosed;
  });

  filtered.forEach(p => {
    const deadlineDate = getEndDate(p.deadline);
    let dDayHtml = "";
    if (!deadlineDate) {
      dDayHtml = `<span class="d-day" style="background:#eee; color:#666;">기한확인</span>`;
    } else {
      const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      if (diff === 0) dDayHtml = `<span class="d-day" style="background:#ff9f9f; color:white;">오늘마감</span>`;
      else if (diff > 0) dDayHtml = `<span class="d-day" style="background:var(--lilac-accent); color:white;">D-${diff}</span>`;
      else dDayHtml = `<span class="d-day" style="background:#bbb; color:white;">종료</span>`;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span style="font-size:12px; font-weight:bold; color:var(--lilac-accent)">● ${currentStatus === "마감" ? "마감" : "접수중"}</span>
        ${dDayHtml}
      </div>
      <h3>${p.title}</h3>
      <div style="font-size:13px; color:#777;">
        <p>📍 지역: ${p.region}</p>
        <p>📅 기한: ${p.deadline}</p>
      </div>
    `;
    
    // ⭐ [핵심 복구] 카드 클릭 시 상세 페이지 열기
    card.onclick = () => openDetail(p);
    listEl.appendChild(card);
  });
}

/** 6. 상세 보기 열기 (데이터 바인딩) */
function openDetail(p) {
  const detailView = document.getElementById("detailView");
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.region || "전국";
  document.getElementById("detailDeadline").textContent = p.deadline;
  document.getElementById("detailSource").textContent = p.source;
  
  const link = document.getElementById("detailLink");
  link.href = p.link;
  
  // 모달 보이기
  detailView.classList.remove("hidden");
}

/** 7. 상세 보기 닫기 */
document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
};

/** 8. 토글 스위치 이벤트 */
toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    render();
  });
});

init();
