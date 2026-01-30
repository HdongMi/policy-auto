let policies = [];
let currentStatus = "접수중"; 
let searchQuery = "";

// HTML 요소 연결
const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput');

// 1. 초기화 (URL에 policy 파라미터가 있으면 바로 상세페이지 노출)
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const policyTitle = urlParams.get('policy');

    // 일단 데이터부터 불러오기
    fetchData();

    // 방문 기록이 있으면 랜딩페이지 건너뛰기
    if (sessionStorage.getItem('visited') === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
    }
}

// 2. 데이터 가져오기 (GitHub Pages 주소 활용)
function fetchData() {
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

// 3. 화면 전환 로직 (상세보기)
function openDetail(p) {
    // 1. 주소창 변경 (SPA 방식)
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 10));
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    
    showDetailUI(p);
}

function showDetailUI(p) {
    // 데이터 채우기
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;

    const oldBtn = document.getElementById("detailLink");
    const newBtn = oldBtn.cloneNode(true);
    newBtn.href = p.link;
    newBtn.target = "_blank";
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    // 화면 전환 (메인은 숨기고 상세만 보이기)
    mainLayout.classList.add("hidden");
    landingPage.classList.add("hidden");
    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeDetailUI() {
    detailView.classList.add("hidden");
    mainLayout.classList.remove("hidden");
}

// 브라우저 뒤로가기 버튼 대응 (핵심)
window.onpopstate = (event) => {
    if (event.state && event.state.view === 'detail') {
        showDetailUI(event.state.policy);
    } else {
        closeDetailUI();
    }
};

// 4. 날짜 파싱 (마감 여부 판단)
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

// 5. 공고 목록 출력
function render() {
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
        listEl
