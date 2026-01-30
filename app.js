let policies = [];
let currentStatus = "접수중";
let searchQuery = "";

// 요소 선택
const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput');
const backBtn = document.getElementById('backBtn');

// 1. 초기 실행 로직
function init() {
    // 세션에 방문 기록이 있다면 바로 메인으로
    if (sessionStorage.getItem('visited') === 'true') {
        showMainLayout();
    }
    
    // 무조건 데이터는 미리 불러옴
    fetchData();
}

// 메인 화면 보여주기 함수
function showMainLayout() {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    detailView.classList.add('hidden');
}

// 2. 데이터 가져오기
function fetchData() {
    if(!listEl) return;
    listEl.innerHTML = "<div style='padding:40px; text-align:center;'>데이터 로딩 중...</div>";
    
    const cacheBuster = new Date().getTime();
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`)
        .then(res => res.json())
        .then(data => {
            policies = [...data];
            render();
        })
        .catch(err => {
            listEl.innerHTML = "<div style='padding:40px; text-align:center; color:red;'>데이터 로딩 실패</div>";
        });
}

// 3. 상세 페이지 전환
function openDetail(p) {
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 10));
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    showDetailUI(p);
}

function showDetailUI(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;

    const oldLinkBtn = document.getElementById("detailLink");
    const newLinkBtn = oldLinkBtn.cloneNode(true);
    newLinkBtn.href = p.link;
    oldLinkBtn.parentNode.replaceChild(newLinkBtn, oldLinkBtn);

    mainLayout.classList.add("hidden");
    landingPage.classList.add("hidden");
    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeDetailUI() {
    detailView.classList.add("hidden");
    mainLayout.classList.remove("hidden");
}

// 브라우저 뒤로가기 대응
window.onpopstate = (event) => {
    if (event.state && event.state.view === 'detail') {
        showDetailUI(event.state.policy);
    } else {
        closeDetailUI();
    }
};

// 4. 날짜 파싱 (마감 판단)
function parseDate(str) {
    if (!str || str.includes("상세참조") || str.includes("소진시") || str.includes("상시")) {
        return new Date("2099-12-31");
    }
    let datePart = str;
    if (str.includes('~')) {
        const parts = str.split('~');
        datePart = parts[1] && parts[1].trim().length > 5 ? parts[1].trim() : parts[0].trim();
    }
    const cleanStr = datePart.replace(/[^0-9]/g, '');
    if (cleanStr.length >= 8) {
        return new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`);
    }
    return null;
}

// 5. 렌더링
function render() {
    if(!listEl) return;
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = policies.filter(p => {
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate ? deadlineDate < today : false;
        const statusMatch = (currentStatus === "접수중") ? !isClosed : isClosed;
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.region.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && searchMatch;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<div style='padding:50px; text-align:center; color:#888;'>조회된 공고가 없습니다.</div>`;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>${p.title}</h3><p>${p.region} | ${p.deadline}</p>`;
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}

// 6. 모든 이벤트 리스너 (직관적으로 배치)

// 스플래시 버튼 클릭
if (startBtn) {
    startBtn.addEventListener('click', () => {
        sessionStorage.setItem('visited', 'true');
        showMainLayout();
    });
}

// 검색 입력
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
    });
}

// 탭 전환 (접수중/마감)
toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.innerText.trim();
        render();
    });
});

// 상세페이지 뒤로가기 버튼
if (backBtn) {
    backBtn.onclick = () => {
        history.back();
    };
}

// 앱 시작
init();
