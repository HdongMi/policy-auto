let policies = [];
let currentStatus = "전체";
let searchQuery = "";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const detailView = document.getElementById('detailView');
const searchInput = document.getElementById('searchInput');

// 1. 랜딩 페이지 제어
startBtn.onclick = () => {
    sessionStorage.setItem('visited', 'true');
    landingPage.style.opacity = '0';
    setTimeout(() => {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }, 500);
};

if (sessionStorage.getItem('visited') === 'true') {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
}

// 2. 검색 이벤트
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    render();
});

// 3. 데이터 로드
function fetchData() {
    listEl.innerHTML = "<p style='text-align:center; padding:50px; color:#999;'>데이터 로딩 중...</p>";
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            policies = data;
            render();
        });
}

// 4. 렌더링
function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        const statusMatch = (currentStatus === "마감" ? isClosed : !isClosed);
        const searchText = (p.title + p.region).toLowerCase();
        return statusMatch && searchText.includes(searchQuery);
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<p style='text-align:center; padding:100px; color:#bbb;'>결과가 없습니다.</p>`;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>${p.title}</h3><p>📍 ${p.region}</p><p>📅 ${p.deadline}</p>`;
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}

function parseDate(str) {
    if (!str || str === "상세참조") return null;
    const dateStr = str.split('~')[1] || str;
    const cleanStr = dateStr.replace(/[^0-9]/g, '');
    if (cleanStr.length >= 8) return new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`);
    return null;
}

// 5. 모달 열기
function openDetail(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    document.getElementById("detailLink").href = p.link;
    
    detailView.classList.remove("hidden");
    history.pushState({ page: "detail" }, "detail", "");
}

// 6. 모달 닫기 제어
document.getElementById("backBtn").onclick = () => history.back();
window.onpopstate = () => detailView.classList.add("hidden");

toggleBtns.forEach(btn => {
    btn.onclick = () => {
        toggleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});
