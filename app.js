let policies = [];
let currentStatus = "접수중"; 
let searchQuery = "";

// DOM 요소 참조
const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const toggleSlider = document.querySelector('.toggle-slider');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput');
const backBtn = document.getElementById('backBtn');

// 1. 초기화 로직
function init() {
    // 세션 방문 기록 확인
    if (sessionStorage.getItem('visited') === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
    }
    fetchData();
}

// 2. 데이터 페칭
function fetchData() {
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align:center; padding:50px; color:#8e82bd;">최신 정책 데이터를 동기화하고 있습니다...</div>`;
    
    const cacheBuster = new Date().getTime();
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`)
        .then(res => res.json())
        .then(data => {
            policies = [...data];
            render();
        })
        .catch(err => {
            listEl.innerHTML = `<div style="text-align:center; padding:50px; color:red;">데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>`;
        });
}

// 3. 상세 페이지 핸들링
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
    
    const applyBtn = document.getElementById("detailLink");
    applyBtn.href = p.link;

    landingPage.classList.add('hidden');
    mainLayout.classList.add('hidden');
    detailView.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function closeDetailUI() {
    detailView.classList.add("hidden");
    mainLayout.classList.remove("hidden");
}

// 뒤로가기 이벤트 감지
window.onpopstate = (event) => {
    if (event.state && event.state.view === 'detail') {
        showDetailUI(event.state.policy);
    } else {
        closeDetailUI();
    }
};

// 4. 날짜 필터링 로직 (오늘: 2026-01-30)
function parseDate(str) {
    if (!str || str.includes("상세참조") || str.includes("소진시") || str.includes("상시")) {
        return new Date("2099-12-31"); 
    }
    let target = str.includes('~') ? (str.split('~')[1]?.trim() || str.split('~')[0].trim()) : str;
    const cleanStr = target.replace(/[^0-9]/g, '');
    if (cleanStr.length >= 8) {
        return new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`);
    }
    return null;
}

// 5. 렌더링 함수
function render() {
    if (!listEl) return;
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
        listEl.innerHTML = `<div style="text-align:center; padding:100px 20px; color:#aaa;">해당하는 공고가 없습니다.</div>`;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>${p.title}</h3><p>${p.region} | ${p.deadline}</p>`;
        card.addEventListener('click', () => openDetail(p));
        listEl.appendChild(card);
    });
}

// 6. 이벤트 리스너 등록
if (startBtn) {
    startBtn.addEventListener('click', () => {
        sessionStorage.setItem('visited', 'true');
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
    });
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
    });
}

toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.innerText.trim();
        
        // 슬라이더 이동
        if (currentStatus === "마감") {
            toggleSlider.style.transform = "translateX(100%)";
        } else {
            toggleSlider.style.transform = "translateX(0)";
        }
        
        render();
    });
});

if (backBtn) {
    backBtn.addEventListener('click', () => history.back());
}

// 실행
init();
