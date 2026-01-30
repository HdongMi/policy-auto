let policies = [];
let currentStatus = "접수중"; // 기본값 설정

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const statusButtons = document.querySelectorAll('.status-buttons button');
const detailView = document.getElementById('detailView');

function init() {
    const isVisited = sessionStorage.getItem('visited');
    if (isVisited === 'true') {
        if (landingPage) landingPage.classList.add('hidden');
        if (mainLayout) mainLayout.classList.remove('hidden');
        fetchData();
    }
}

if (startBtn) {
    startBtn.onclick = () => {
        sessionStorage.setItem('visited', 'true');
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    };
}

function fetchData() {
    if (!listEl) return;
    listEl.innerHTML = "<p style='text-align:center; padding:50px;'>로딩 중...</p>";
    // 캐시 방지를 위해 타임스탬프 추가
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            policies = data;
            render();
        })
        .catch(err => {
            listEl.innerHTML = "<p style='text-align:center; padding:50px;'>데이터를 가져오지 못했습니다.</p>";
        });
}

function parseDate(str) {
    if (!str || str === "상세참조" || str === "예산소진시") return null;
    const dateStr = str.split('~')[1] || str;
    const cleanStr = dateStr.replace(/[^0-9]/g, '');
    if (cleanStr.length >= 8) {
        return new Date(`${cleanStr.substr(0,4)}-${cleanStr.substr(4,2)}-${cleanStr.substr(6,2)}`);
    }
    return null;
}

// 상세 페이지 열기 (핵심 수정 부분)
function openDetail(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source || "중소벤처기업부";

    const linkBtn = document.getElementById("detailLink");
    
    // [중요] 기존 링크 정보를 완전히 초기화하기 위해 버튼 재생성 기법 사용
    const newLinkBtn = linkBtn.cloneNode(true);
    linkBtn.parentNode.replaceChild(newLinkBtn, linkBtn);

    if (p.link && p.link.length > 10) {
        newLinkBtn.href = p.link;
        newLinkBtn.target = "_blank";
        newLinkBtn.rel = "noopener noreferrer";
        newLinkBtn.style.display = "block";
        newLinkBtn.innerText = "공식 공고 페이지로 이동";
        newLinkBtn.style.background = "#8e82bd";
        newLinkBtn.style.pointerEvents = "auto";
        newLinkBtn.style.opacity = "1";
    } else {
        newLinkBtn.href = "#";
        newLinkBtn.innerText = "상세 링크 준비 중";
        newLinkBtn.style.background = "#ccc";
        newLinkBtn.style.pointerEvents = "none";
        newLinkBtn.style.opacity = "0.6";
    }

    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function render() {
    if (!listEl) return;
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const deadlineDate = parseDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        
        // 필터링 로직 보정
        if (currentStatus === "전체") return true;
        return currentStatus === "마감" ? isClosed : !isClosed;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = "<p style='text-align:center; padding:50px;'>해당하는 공고가 없습니다.</p>";
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3>${p.title}</h3>
            <p>📍 ${p.region} | 📅 ${p.deadline}</p>
        `;
        
        // 클로저 이슈 방지를 위해 함수를 별도로 호출
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
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

// 초기화 실행
init();
