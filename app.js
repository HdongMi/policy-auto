let policies = [];
let currentStatus = "전체";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const detailView = document.getElementById('detailView');

// 1. 랜딩 페이지 탈출 (정책 확인하기 클릭)
startBtn.onclick = () => {
    sessionStorage.setItem('visited', 'true');
    landingPage.style.opacity = '0';
    setTimeout(() => {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }, 500);
};

// 2. 초기 로드 (이미 방문했다면 바로 목록으로)
if (sessionStorage.getItem('visited') === 'true') {
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
}

function fetchData() {
    listEl.innerHTML = "<p style='text-align:center;'>데이터 로딩 중...</p>";
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            policies = data;
            render();
        });
}

function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        return currentStatus === "마감" ? isClosed : !isClosed;
    });

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        const statusColor = currentStatus === "마감" ? "#e63946" : "#2a9d8f";
        
        card.innerHTML = `
            <div style="margin-bottom:8px; font-weight:bold; color:${statusColor}">● ${currentStatus === "마감" ? "마감" : "접수중"}</div>
            <h3 style="margin:0 0 10px 0;">${p.title}</h3>
            <p style="margin:0; font-size:13px; color:#666;">📍 ${p.region} | 📅 ${p.deadline}</p>
        `;
        
        // 카드 클릭 기능
        card.onclick = () => {
            document.getElementById("detailTitle").innerText = p.title;
            document.getElementById("detailTarget").innerText = p.region;
            document.getElementById("detailDeadline").innerText = p.deadline;
            document.getElementById("detailSource").innerText = p.source;
            document.getElementById("detailLink").href = p.link;
            detailView.classList.remove("hidden");
        };
        listEl.appendChild(card);
    });
}

function parseDate(str) {
    if (!str || str === "상세참조") return null;
    const dateStr = str.split('~')[1] || str;
    const cleanStr = dateStr.replace(/[^0-9]/g, '');
    return cleanStr.length >= 8 ? new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`) : null;
}

// 닫기 기능
document.getElementById("backBtn").onclick = () => detailView.classList.add("hidden");

// 토글 기능
toggleBtns.forEach(btn => {
    btn.onclick = () => {
        toggleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});
