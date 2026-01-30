let policies = [];
let currentStatus = "전체"; // 초기값

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
      listEl.innerHTML = "<p style='text-align:center; padding:20px;'>공고를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>";
    });
}

// 3. 목록 그리기 (D-Day 및 상태 분류 로직 적용)
function render() {
  listEl.innerHTML = "";
  const selectedRegion = regionFilter.value;
  
  // 오늘 날짜 설정 (시간 정보를 제거하여 정확한 날짜 비교)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = policies.filter(p => {
    // 지역 필터링
    const regionMatch = (selectedRegion === "전체" || p.region.includes(selectedRegion) || p.region === "전국");
    
    // 마감 여부 계산
    let isClosed = false;
    if (p.deadline && p.deadline.length >= 8) {
      const dateStr = p.deadline.replace(/[^0-9]/g, '');
      const deadlineDate = new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`);
      isClosed = !isNaN(deadlineDate) && deadlineDate < today;
    }

    // 탭 상태에 따른 필터링 (HTML의 data-status 값과 매칭)
    if (currentStatus === "마감") return regionMatch && isClosed;
    if (currentStatus === "전체") return regionMatch && !isClosed; // '전체' 탭은 현재 진행중인 것만 노출
    return regionMatch;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<p style='text-align:center; padding:50px; color:#888;'>해당하는 ${currentStatus === "마감" ? "마감된 " : ""}공고가 없습니다.</p>`;
    return;
  }

  filtered.forEach(p => {
    let isClosed = false;
    let dDayTag = "";
    
    if (p.deadline && p.deadline.length >= 8) {
      const dateStr = p.deadline.replace(/[^0-9]/g, '');
      const deadlineDate = new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`);
      isClosed = !isNaN(deadlineDate) && deadlineDate < today;

      // D-Day 계산 (진행중일 때만)
      if (!isClosed && !isNaN(deadlineDate)) {
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          dDayTag = `<span class="d-day" style="background:#eccc68; color:#333;">오늘마감</span>`;
        } else if (diffDays > 0 && diffDays <= 7) {
          dDayTag = `<span class="d-day" style="background:#ff4757; color:#white;">D-${diffDays}</span>`;
        }
      }
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span class="status-label" style="color: ${isClosed ? '#ff4444' : '#2e7d32'}; font-size:12px; font-weight:bold;">
          ${isClosed ? "● 마감" : "● 진행중"}
        </span>
        ${dDayTag}
      </div>
      <h3 style="margin-bottom:10px; font-size:16px; line-height:1.4;">${p.title}</h3>
      <p style="font-size:13px; color:#666;">📍 지역: ${p.region} <br> 📅 기한: ${p.deadline}</p>
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
  
  const detailLink = document.getElementById("detailLink");
  detailLink.href = p.link;
  detailLink.setAttribute("rel", "noreferrer noopener");
  detailLink.setAttribute("target", "_blank");

  document.getElementById("detailView").classList.remove("hidden");
}

document.getElementById("backBtn").onclick = () => {
  document.getElementById("detailView").classList.add("hidden");
};

// 5. 필터 및 이벤트 리스너
regionFilter.onchange = render;

statusButtons.forEach(btn => {
  btn.onclick = () => {
    statusButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // HTML의 data-status 값을 읽어옴 (전체 / 마감)
    currentStatus = btn.getAttribute('data-status') || btn.textContent;
    render();
  };
});
