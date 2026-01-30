// [상태 관리]
let policies = [];
let currentStatus = "접수중"; 
let searchQuery = "";

// [핵심 초기화 함수]
function init() {
    // 1. 이벤트 리스너부터 즉시 연결 (데이터 기다리지 않음)
    setupEventListeners();

    // 2. 방문 기록 확인하여 화면 전환
    if (sessionStorage.getItem('visited') === 'true') {
        showMainLayout();
    }

    // 3. 데이터 로드 및 URL 파라미터 체크
    fetchData().then(() => {
        checkUrlParam();
    });
}

// [메인 레이아웃 노출]
function showMainLayout() {
    document.getElementById('landingPage')?.classList.add('hidden');
    document.getElementById('mainLayout')?.classList.remove('hidden');
    document.getElementById('detailView')?.classList.add('hidden');
}

// [이벤트 리스너 연결]
function setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const searchInput = document.getElementById('searchInput');
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const backBtn = document.getElementById('backBtn');

    // 둘러보기 버튼: 데이터 로딩과 상관없이 즉시 실행되어야 함
    if (startBtn) {
        startBtn.onclick = () => {
            sessionStorage.setItem('visited', 'true');
            showMainLayout();
        };
    }

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value;
            render();
        };
    }

    toggleButtons.forEach(btn => {
        btn.onclick = () => {
            toggleButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentStatus = btn.innerText.trim();
            
            const slider = document.querySelector('.toggle-slider');
            if(slider) slider.style.transform = currentStatus === "마감" ? "translateX(100%)" : "translateX(0)";
            
            render();
        };
    });

    if (backBtn) {
        backBtn.onclick = () => history.back();
    }
}

// [데이터 로드]
async function fetchData() {
    const listEl = document.getElementById('policyList');
    try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`);
        policies = await res.json();
        render();
    } catch (err) {
        if (listEl) listEl.innerHTML = "<div style='padding:40px; text-align:center;'>데이터 로드 실패</div>";
    }
}

// https://www.playnexacro.com/communitys/4633/%EB%84%A5%EC%82%AC%ED%81%AC%EB%A1%9C-%ED%8E%98%EC%9D%B4%EC%A7%80-%EC%9D%B4%EB%8F%99%EC%8B%9C-%ED%8C%8C%EB%9D%BC%EB%AF%B8%ED%84%B0-%EC%9D%B4%EB%8F%99-%EC%A7%88%EB%AC%B8%EC%9E%85%EB%8B%88%EB%8B%A4
function checkUrlParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const policyTitle = urlParams.get('policy');

    if (policyTitle && policies.length > 0) {
        const decodedTitle = decodeURIComponent(policyTitle);
        const found = policies.find(p => p.title.includes(decodedTitle));
        if (found) {
            showDetailUI(found);
        }
    }
}

// [상세 페이지 전환]
function openDetail(p) {
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 15));
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    showDetailUI(p);
}

function showDetailUI(p) {
    if (!p) return;
    
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    document.getElementById("detailLink").href = p.link;

    document.getElementById('landingPage')?.classList.add('hidden');
    document.getElementById('mainLayout')?.classList.add('hidden');
    document.getElementById('detailView')?.classList.remove('hidden');
    window.scrollTo(0, 0);
}

// [뒤로가기 대응]
window.onpopstate = (e) => {
    if (e.state && e.state.view === 'detail') {
        showDetailUI(e.state.policy);
    } else {
        document.getElementById('detailView')?.classList.add('hidden');
        document.getElementById('mainLayout')?.classList.remove('hidden');
    }
};

// [날짜 파싱]
function parseDate(str) {
    if (!str || /상세참조|소진시|상시/.test(str)) return new Date("2099-12-31");
    const target = str.includes('~') ? (str.split('~')[1]?.trim() || str.split('~')[0].trim()) : str;
    const clean = target.replace(/[^0-9]/g, '');
    return clean.length >= 8 ? new Date(`${clean.substr(0,4)}-${clean.substr(4,2)}-${clean.substr(6,2)}`) : null;
}

// [리스트 렌더링]
function render() {
    const listEl = document.getElementById('policyList');
    if (!listEl) return;
    
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const dDate = parseDate(p.deadline);
        const isClosed = dDate ? dDate < today : false;
        const statusMatch = (currentStatus === "접수중") ? !isClosed : isClosed;
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.region.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && searchMatch;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<div style='padding:80px 20px; text-align:center; color:#999;'>공고가 없습니다.</div>`;
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

// 실행
init();
