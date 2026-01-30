let policies = [];
let currentStatus = "접수중"; // 초기값을 '접수중'으로 맞춰야 데이터가 바로 뜹니다.

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
  listEl.innerHTML = "<p style='text-align:center; padding:20px; color:#8e82bd;'>정책 공고를 불러오는 중...</p>";
  const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      listEl.innerHTML = "<p style='text-align:center; padding:20px;'>데이터 로드에 실패했습니다.</p>";
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

/** 5. 리스트 렌더링 */
function render() {
  listEl.innerHTML = "";
  const today = new Date();
  today.setHours(0,0,0,0);

  const filtered = policies.filter(p => {
    const deadlineDate = getEndDate(p.deadline);
    const isClosed = deadlineDate && deadlineDate < today;
    // '마감' 탭일 땐 종료된 것만, '전체(접수중)' 탭일 땐 진행 중인 것만 필터링
    return currentStatus === "마감" ? isClosed : !isClosed;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<p style='text-align:center; padding:50px; color:#999;'>해당하는 공고가 없습니다.</p>`;
    return;
  }

  filtered.forEach(p => {
    const deadlineDate = getEndDate(p.deadline);
    let dDayHtml = "";
    
    // D-Day 배지 설정
    if (!deadlineDate) {
      dDayHtml = `<span class="d-day" style="background:#f1f3f5; color:#666;">기한확인</span>`;
    } else {
      const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      if (diff === 0) dDayHtml = `<span class="d-day" style="background:#ff4757; color:white;">오늘마감</span>`;
      else if (diff > 0) dDayHtml = `<span class="d-day" style="background:var(--lilac-accent); color:white;">D-${diff}</span>`;
      else dDayHtml = `<span class="d-day" style="background:#adb5bd; color:white;">종료</span>`;
    }

    // ⭐ 상태 텍스트 색상 분기 (접수중: 초록, 마감: 빨강)
    const statusColor = currentStatus === "마감" ? "#e63946" : "#2a9d8f";
    const statusLabel = currentStatus === "마감" ? "접수마감" : "접수중";

    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer"; // 카드인 걸 알 수 있게 커서 추가
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center;">
        <span style="font-size:12px; font-weight:800; color:${statusColor}">● ${statusLabel}</span>
        ${dDayHtml}
      </div>
      <h3 style="margin:0 0 10px 0; font-size:16px; line-height:1.4;">${p.title}</h3>
      <div style="font-size:13px; color:#666;">
        <p style="margin:4px 0;">📍 지역: ${p.region}</p>
        <p style="margin:4px 0;">📅 기한: ${p.deadline}</p>
      </div>
    `;
    
    // ⭐ [기능 복구] 클릭 시 상세 정보 열기
    card.addEventListener('click', () => openDetail(p));
    listEl.appendChild(card);
  });
}

/** 6. 상세 보기 열기 */
function openDetail(p) {
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.region || "전국";
  document.getElementById("detailDeadline").textContent = p.deadline;
  document.getElementById("detailSource").textContent = p.source;
  
  const link = document.getElementById("detailLink");
  link.href = p.link;
  
  document.getElementById("detailView").classList.remove("hidden");
}

/** 7. 상세 보기 닫기 */
document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
};

/** 8. 토글 스위치 이벤트 */
toggleBtns.forEach(btn => {
  btn.onclick = () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 필터 값 업데이트
    currentStatus = btn.dataset.status === "전체" ? "접수중" : btn.dataset.status;
    render();
  };
});

init();
