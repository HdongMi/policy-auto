let policies = [];
let currentStatus = "전체";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const statusButtons = document.querySelectorAll('.status-buttons button');
const detailView = document.getElementById('detailView');

function init() {
    const isVisited = sessionStorage.getItem('visited');
    if (isVisited === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }
}

startBtn.onclick = () => {
    sessionStorage.setItem('visited', 'true');
    landingPage.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    fetchData();
};

function fetchData() {
    listEl.innerHTML = "로딩 중...";
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
        card.innerHTML = `<h3>${p.title}</h3><p>${p.region} | ${p.deadline}</p>`;
        
        // 카드 클릭 이벤트 (정상 작동 확인)
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

document.getElementById("backBtn").onclick = () => detailView.classList.add("hidden");

statusButtons.forEach(btn => {
    btn.onclick = () => {
        statusButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});

init();
