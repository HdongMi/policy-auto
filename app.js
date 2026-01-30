let policies = [];
let currentStatus = "전체";
let searchQuery = ""; // 🔍 검색어를 담을 변수 추가

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const statusButtons = document.querySelectorAll('.status-buttons button');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput'); // HTML에 searchInput 아이디가 있어야 함

// 1. 초기화 (URL 파라미터 확인 및 히스토리 관리)
function init() {
    const isVisited = sessionStorage.getItem('visited');
    if (isVisited === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }
}

// 브라우저 뒤로가기 대응
window.onpopstate = (event) => {
    if (event.state && event.state.view === 'detail') {
        showDetailUI(event.state.policy);
    } else {
        closeDetailUI();
    }
};

startBtn.onclick = () => {
    sessionStorage.setItem('visited', 'true');
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
};

// 2. 데이터 가져오기
function fetchData() {
    listEl.innerHTML = "<div style='padding:20px; text-align:center;'>최신 공고 동기화 중...</div>";
    const cacheBuster = new Date().getTime();
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`)
        .then(res => res.json())
        .then(data => {
            policies = [...data];
            render();
        })
        .catch(err => {
            listEl.innerHTML = "데이터를 불러오는 데 실패했습니다.";
        });
}

// 3. 상세 페이지 로직 (URL 변경 포함)
function openDetail(p) {
    // 주소창 변경 (SPA 방식)
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 10));
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    showDetailUI(p);
}

function showDetailUI(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;

    const oldBtn = document.getElementById("detailLink");
    const newBtn = oldBtn.cloneNode(true);
    newBtn.href = p.link;
    newBtn.target = "_blank";
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    mainLayout.classList.add("hidden");
    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeDetailUI() {
    detailView.classList.add("hidden");
    mainLayout.classList.remove("hidden");
}

// 4. 검색 및 렌더링 (핵심 수정 부분)
function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    // 필터링 로직: 상태 체크 + 검색어 체크
    const filtered = policies.filter(p => {
        // A. 마감 여부 체크
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        const statusMatch = (currentStatus === "전체") || (currentStatus === "마감" ? isClosed : !isClosed);

        // B. 검색어 체크 (제목이나 지역에 검색어가 포함되는지)
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.region.toLowerCase().includes(searchQuery.toLowerCase());

        return statusMatch && searchMatch; // 둘 다 만족해야 함
    });

    if (filtered.length === 0) {
        listEl.innerHTML = "<div style='padding:40px; text-align:center; color:#888;'>검색 결과가 없습니다.</div>";
        return;
    }

    filtered.forEach((p, index) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>${p.title}</h3><p>${p.region} | ${p.deadline}</p>`;
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}

// 5. 이벤트 리스너
// 검색창 입력 이벤트
if (searchInput) {
    searchInput.oninput = (e) => {
        searchQuery = e.target.value; // 검색어 업데이트
        render(); // 즉시 다시 그리기
    };
}

// 탭 버튼 클릭 이벤트
statusButtons.forEach(btn => {
    btn.onclick = () => {
        statusButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});

// 뒤로가기 버튼
document.getElementById("backBtn").onclick = () => {
    history.back();
};

function parseDate(str) {
    if (!str || str === "상세참조" || str.includes("소진시")) return null;
    const dateStr = str.split('~')[1] || str;
    const cleanStr = dateStr.replace(/[^0-9]/g, '');
    return cleanStr.length >= 8 ? new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`) : null;
}

init();
