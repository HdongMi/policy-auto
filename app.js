let policies = [];
let currentStatus = "접수중"; 
let searchQuery = "";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const toggleSlider = document.querySelector('.toggle-slider');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput');
const backBtn = document.getElementById('backBtn');

// 1. 초기화 로직 (데이터 로딩 완료 후 URL 체크)
async function init() {
    // A. 데이터를 먼저 완전히 불러옵니다.
    await fetchData();

    // B. 데이터가 들어온 후 URL 파라미터를 확인합니다.
    const urlParams = new URLSearchParams(window.location.search);
    const policyTitle = urlParams.get('policy');

    if (policyTitle) {
        const decodedTitle = decodeURIComponent(policyTitle);
        // 제목이 포함된 정책을 찾습니다.
        const found = policies.find(p => p.title.includes(decodedTitle) || decodedTitle.includes(p.title.substring(0, 10)));
        
        if (found) {
            showDetailUI(found);
            return; // 상세페이지를 띄웠으면 중단
        }
    }

    // C. 상세페이지가 아니고 방문 기록이 있다면 메인으로
    if (sessionStorage.getItem('visited') === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
    }
}

// 2. 데이터 가져오기 (비동기 처리)
function fetchData() {
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align:center; padding:50px; color:#8e82bd;">최신 정책 데이터를 동기화 중...</div>`;
    
    const cacheBuster = new Date().getTime();
    return fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`)
        .then(res => res.json())
        .then(data => {
            policies = [...data];
            render();
        })
        .catch(err => {
            listEl.innerHTML = `<div style="text-align:center; padding:50px; color:red;">데이터 로딩 실패</div>`;
        });
}

// 3. 상세 페이지 핸들링 (전환 로직 강화)
function openDetail(p) {
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 15));
    // 주소창 업데이트
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    showDetailUI(p);
}

function showDetailUI(p) {
    if (!p) return;
    
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    
    const applyBtn = document.getElementById("detailLink");
    applyBtn.href = p.link;

    // 모든 레이아웃 숨기고 상세페이지만 표시
    landingPage.classList.add('hidden');
    mainLayout.classList.add('hidden');
    detailView.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function closeDetailUI() {
    detailView.classList.add("hidden");
    mainLayout.classList.remove("hidden");
    // 뒤로가기 시 파라미터가 없으면 주소 깔끔하게 정리
    if (!window.location.search.includes('policy')) {
        history.replaceState(null, "", window.location.pathname);
    }
}

// 뒤로가기/앞으로가기 대응
window.onpopstate = (event) => {
    if (event.state && event.state.view === 'detail') {
        showDetailUI(event.state.policy);
    } else {
        closeDetailUI();
    }
};

// 4. 날짜 파싱 (2026-01-30 기준)
function parseDate(str) {
    if (!str || str.includes("상세참조") || str.includes("소진시") || str.includes("상시")) return new Date("2099-12-31"); 
    let target = str.includes('~') ? (str.split('~')[1]?.trim() || str.split('~')[0].trim()) : str;
    const cleanStr = target.replace(/[^0-9]/g, '');
    if (cleanStr.length >= 8) {
        return new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`);
    }
    return null;
}

// 5. 리스트 렌더링
function render() {
    if (!listEl) return;
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = policies.filter(p => {
        const dDate = parseDate(p.deadline);
        const isClosed = dDate ? dDate < today : false;
        const statusMatch = (currentStatus === "접수중") ? !isClosed : isClosed;
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.region.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && searchMatch;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding:100px 20px; color:#aaa;">해당 조건의 공고가 없습니다.</div>`;
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

// 6. 버튼 이벤트 리스너
if (startBtn) {
    startBtn.onclick = () => {
        sessionStorage.setItem('visited', 'true');
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
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
        if(toggleSlider) {
            toggleSlider.style.transform = currentStatus === "마감" ? "translateX(100%)" : "translateX(0)";
        }
        render();
    };
});

if (backBtn) {
    backBtn.onclick = () => history.back();
}

// 앱 실행
init();
