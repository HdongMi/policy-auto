let policies = [];
let currentStatus = "전체"; // 기본값은 '접수중' 필터링을 위한 설정

// DOM 요소 선택
const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
// 토글 버튼 선택 (새로운 클래스명 적용)
const toggleBtns = document.querySelectorAll('.toggle-btn');

/** 1. 초기화: 방문 기록 확인 */
function init() {
  const isVisited = sessionStorage.getItem('visited');
  if (isVisited === 'true') {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
  }
}

/** 2. 랜딩 페이지 시작 버튼 이벤트 */
startBtn.addEventListener('click', () => {
  sessionStorage.setItem('visited', 'true');
  landingPage.style.opacity = '0';
  setTimeout(() => {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
  }, 500);
});

/** 3. 데이터 패치 (GitHub JSON) */
function fetchData() {
  listEl.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>정책을 불러오는 중...</p>";
  const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      policies = data;
      render();
    })
    .catch(err => {
      console.error(err);
      listEl.innerHTML = "<p style='text-align:center; padding:20px;'>데이터 로드 실패</p>";
    });
}

/** 4. 날짜 문자열 파싱 (D-Day 계산용) */
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

/** 5. 리스트 렌더링 (필터 적용) */
function render() {
  listEl.innerHTML = "";
  const today = new Date();
  today.setHours(0,0,0,0);

  // 필터링 로직
  const filtered = policies.filter(p => {
    const deadlineDate = getEndDate(p.deadline);
    const isClosed = deadlineDate && deadlineDate < today;
    return currentStatus === "마감" ? isClosed : !isClosed;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<p style='text-align:center; padding:50px; color:#bbb;'>해당하는 공고가 없습니다.</p>`;
    return;
  }

  filtered.forEach(p => {
    const deadlineDate = getEndDate(p.deadline);
    let dDayHtml = "";
    
    // D-Day 배지 분기
    if (!deadlineDate) {
      dDayHtml = `<span class="d-day d-day-check">기한확인</span>`;
    } else {
      const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      if (diff === 0) dDayHtml = `<span class="d-day d-day-urgent">오늘마감</span>`;
      else if (diff > 0) dDayHtml = `<span class="d-day d-day-soon">D-${diff}</span>`;
      else dDayHtml = `<span class="d-day" style="background:#bbb">종료</span>`;
    }

    // 카드 생성
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:12px; font-weight:700; color:var(--lilac-accent)">
          ● ${currentStatus === "마감" ? "접수마감" : "접수중"}
        </span>
        ${dDayHtml}
      </div>
      <h3>${p.title}</h3>
      <div class="card-info">
        <p>📍 지역: ${p.region}</p>
        <p>📅 기한: ${p.deadline}</p>
      </div>
    `;
    card.onclick = () => openDetail(p);
    listEl.appendChild(card);
  });
}

/** 6. 상세 보기 모달 오픈 */
function openDetail(p) {
  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailTarget").textContent = p.region || "전국";
  document.getElementById("detailDeadline").textContent = p.deadline;
  document.getElementById("detailSource").textContent = p.source;
  
  const link = document.getElementById("detailLink");
  link.href = p.link;
  link.setAttribute("target", "_blank");
  
  document.getElementById("detailView").classList.remove("hidden");
}

/** 7. 이벤트 리스너: 상세 뒤로가기 */
document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
};

/** 8. 이벤트 리스너: 토글 스위치 동작 */
toggleBtns.forEach(btn => {
  btn.onclick = () => {
    // 버튼 활성화 클래스 교체
    toggleBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // 필터 상태 업데이트 및 다시 그리기
    currentStatus = btn.dataset.status;
    render();
  };
});

// 실행
init();
