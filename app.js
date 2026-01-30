let policies = [];
let currentStatus = "전체";
let searchQuery = "";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const statusButtons = document.querySelectorAll('.status-buttons button');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput');

function init() {
    const isVisited = sessionStorage.getItem('visited');
    if (isVisited === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }
}

// 브라우저 뒤로가기 대응 (SPA)
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

// [핵심] 날짜 파싱 함수 보강
function parseDate(str) {
    if (!str || str.includes("상세참조") || str.includes("소진시") || str.includes("상시")) {
        // 종료일이 명확하지 않은 경우 '마감 안됨'으로 처리하기 위해 아주 먼 미래 날짜 반환
        return new Date("2099-12-31"); 
    }

    // "2026-01-30 ~ 2026-02-15" 에서 종료일인 "2026-02-15"만 추출
    let datePart = str;
    if (str.includes('~')) {
        const parts = str.split('~');
        datePart = parts[1].trim() || parts[0].trim();
    }

    const cleanStr = datePart.replace(/[^0-9]/g, '');
    if (cleanStr.length >= 8) {
        const y = cleanStr.substring(0, 4);
        const m = cleanStr.substring(4, 6);
        const d = cleanStr.substring(6, 8);
        return new Date(`${y}-${m}-${d}`);
    }
    return null;
}

function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = policies.filter(p => {
        // 1. 마감 여부 판별
        const deadlineDate = parseDate(p.deadline);
        // 날짜가 없으면 일단 '접수중'으로 간주, 날짜가 있으면 오늘과 비교
        const isClosed = deadlineDate ? deadlineDate < today : false;

        // 2. 탭 필터링
        let statusMatch = true;
        if (currentStatus === "접수중") statusMatch = !isClosed;
        else if (currentStatus === "마감") statusMatch = isClosed;

        // 3. 검색어 필터링
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.region.toLowerCase().includes(searchQuery.toLowerCase());

        return statusMatch && searchMatch;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<div style='padding:40px; text-align:center; color:#888;'>${currentStatus} 항목이 없습니다.</div>`;
        return;
    }

    filtered.forEach((p) => {
        const card = document.createElement("div");
        card.className = "card";
        // 마감된 항목은 시각적으로 흐리게 처리 (선택사항)
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        if (isClosed) card.style.opacity = "0.6";

        card.innerHTML = `
            <h3>${p.title}</h3>
            <p>${p.region} | ${p.deadline}</p>
            ${isClosed ? '<span style="color:red; font-weight:bold;">[마감]</span>' : '<span style="color:green; font-weight:bold;">[접수중]</span>'}
        `;
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}

// 이벤트 리스너들
if (searchInput) {
    searchInput.oninput = (e) => {
        searchQuery = e.target.value;
        render();
    };
}

statusButtons.forEach(btn => {
    btn.onclick = () => {
        statusButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status; // HTML button에 data-status="접수중" 등이 있어야 함
        render();
    };
});

document.getElementById("backBtn").onclick = () => {
    history.back();
};

init();
