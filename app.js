// 상태 변수
let policies = [];
let currentStatus = "접수중"; 
let searchQuery = "";

// 초기화 함수: 페이지 로드가 완전히 끝난 후 실행
async function init() {
    console.log("앱 초기화 시작...");

    const startBtn = document.getElementById('startBtn');
    const landingPage = document.getElementById('landingPage');
    const mainLayout = document.getElementById('mainLayout');

    // 1. 데이터부터 확실히 가져오기
    await fetchData();

    // 2. URL 파라미터 확인 (상세페이지 직행 로직)
    const urlParams = new URLSearchParams(window.location.search);
    const policyTitle = urlParams.get('policy');

    if (policyTitle && policies.length > 0) {
        const decodedTitle = decodeURIComponent(policyTitle);
        const found = policies.find(p => p.title.includes(decodedTitle));
        if (found) {
            console.log("URL 파라미터 감지: 상세페이지로 이동", found.title);
            showDetailUI(found);
            return; // 상세페이지 띄우면 종료
        }
    }

    // 3. 랜딩 페이지 vs 메인 레이아웃 결정
    if (sessionStorage.getItem('visited') === 'true') {
        if(landingPage) landingPage.classList.add('hidden');
        if(mainLayout) mainLayout.classList.remove('hidden');
    }

    // 4. 이벤트 리스너 연결 (요소가 있을 때만)
    setupEventListeners();
}

// 데이터 가져오기
async function fetchData() {
    const listEl = document.getElementById('policyList');
    if (listEl) listEl.innerHTML = "<div style='padding:40px; text-align:center;'>데이터 동기화 중...</div>";

    try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`);
        const data = await res.json();
        policies = data;
        render();
        console.log("데이터 로드 완료:", policies.length, "건");
    } catch (err) {
        console.error("데이터 로드 실패:", err);
        if (listEl) listEl.innerHTML = "<div style='padding:40px; text-align:center; color:red;'>로드 실패</div>";
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const searchInput = document.getElementById('searchInput');
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const backBtn = document.getElementById('backBtn');

    if (startBtn) {
        startBtn.onclick = () => {
            sessionStorage.setItem('visited', 'true');
            document.getElementById('landingPage').classList.add('hidden');
            document.getElementById('mainLayout').classList.remove('hidden');
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

// 상세 페이지 표시
function showDetailUI(p) {
    const detailView = document.getElementById('detailView');
    const mainLayout = document.getElementById('mainLayout');
    const landingPage = document.getElementById('landingPage');

    if (!p || !detailView) return;

    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    document.getElementById("detailLink").href = p.link;

    if(landingPage) landingPage.classList.add('hidden');
    if(mainLayout) mainLayout.classList.add('hidden');
    detailView.classList.remove('hidden');
    window.scrollTo(0, 0);
}

// 카드 클릭 시 호출
function openDetail(p) {
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 15));
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    showDetailUI(p);
}

// 브라우저 뒤로가기
window.onpopstate = (e) => {
    if (e.state && e.state.view === 'detail') {
        showDetailUI(e.state.policy);
    } else {
        document.getElementById('detailView').classList.add('hidden');
        document.getElementById('mainLayout').classList.remove('hidden');
    }
};

// 날짜 파싱
function parseDate(str) {
    if (!str || /상세참조|소진시|상시/.test(str)) return new Date("2099-12-31");
    const target = str.includes('~') ? (str.split('~')[1]?.trim() || str.split('~')[0].trim()) : str;
    const clean = target.replace(/[^0-9]/g, '');
    return clean.length >= 8 ? new Date(`${clean.substr(0,4)}-${clean.substr(4,2)}-${clean.substr(6,2)}`) : null;
}

// 렌더링
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
        list
