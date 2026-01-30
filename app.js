let policies = [];
let currentStatus = "전체";

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const statusButtons = document.querySelectorAll('.status-buttons button');
const detailView = document.getElementById('detailView');

// 1. 초기화 로직 (캐시 무시)
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

// 2. 데이터 가져오기 (매번 새로운 URL로 인식하게 함)
function fetchData() {
    listEl.innerHTML = "<div style='padding:20px; text-align:center;'>최신 공고 동기화 중...</div>";
    
    // URL 뒤에 매번 바뀌는 숫자를 붙여 브라우저 캐시를 완전히 무력화합니다.
    const cacheBuster = new Date().getTime();
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`)
        .then(res => res.json())
        .then(data => {
            policies = [...data]; // 새 배열로 복사하여 참조 끊기
            render();
        })
        .catch(err => {
            listEl.innerHTML = "데이터를 불러오는 데 실패했습니다.";
        });
}

// 3. 상세 페이지 열기 (이전 링크 잔상 제거)
function openDetail(p) {
    // 텍스트 교체
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;

    // [핵심] 기존 버튼을 삭제하고 새로 만듭니다. (이전 링크가 남을 공간을 안 줌)
    const oldBtn = document.getElementById("detailLink");
    const newBtn = oldBtn.cloneNode(true); // 버튼 복제
    
    newBtn.href = p.link; // 새로운 링크 주입
    newBtn.target = "_blank";
    
    // 기존 버튼을 새 버튼으로 완전히 교체 (이벤트와 href 초기화)
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        
        if (currentStatus === "전체") return true;
        return currentStatus === "마감" ? isClosed : !isClosed;
    });

    filtered.forEach((p, index) => {
        const card = document.createElement("div");
        card.className = "card";
        // 고유 ID 부여로 꼬임 방지
        card.dataset.id = index; 
        card.innerHTML = `<h3>${p.title}</h3><p>${p.region} | ${p.deadline}</p>`;
        
        // 클릭 시 해당 데이터(p)를 정확히 전달
        card.onclick = (e) => {
            e.preventDefault();
            openDetail(p);
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

document.getElementById("backBtn").onclick = () => {
    detailView.classList.add("hidden");
};

statusButtons.forEach(btn => {
    btn.onclick = () => {
        statusButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});

init();
