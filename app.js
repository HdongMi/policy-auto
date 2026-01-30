let policies = [];
let currentStatus = "전체"; // HTML의 data-status="전체"와 일치시킴 (접수중 탭)

const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const detailView = document.getElementById('detailView'); // HTML id="detailView"와 일치

function init() {
    const isVisited = sessionStorage.getItem('visited');
    if (isVisited === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }
}

if(startBtn) {
    startBtn.onclick = () => {
        sessionStorage.setItem('visited', 'true');
        landingPage.style.opacity = '0';
        setTimeout(() => {
            landingPage.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            fetchData();
        }, 500);
    };
}

function fetchData() {
    listEl.innerHTML = `<p style="text-align:center; padding:50px;">데이터 로딩 중...</p>`;
    const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            policies = data;
            render();
        })
        .catch(err => {
            listEl.innerHTML = `<p style="text-align:center; padding:50px;">로딩 실패!</p>`;
        });
}

function getEndDate(deadlineStr) {
    if (!deadlineStr || deadlineStr === "상세참조") return null;
    const parts = deadlineStr.split('~');
    const target = parts.length > 1 ? parts[1] : parts[0];
    const dateStr = target.replace(/[^0-9]/g, '');
    if (dateStr.length >= 8) {
        return new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`);
    }
    return null;
}

function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const deadlineDate = getEndDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        return currentStatus === "마감" ? isClosed : !isClosed;
    });

    filtered.forEach(p => {
        const deadlineDate = getEndDate(p.deadline);
        let dDayHtml = "";
        
        if (!deadlineDate) {
            dDayHtml = `<span class="d-day" style="background:#eee; color:#666;">기한확인</span>`;
        } else {
            const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            if (diff === 0) dDayHtml = `<span class="d-day" style="background:#ff6b6b; color:white;">오늘마감</span>`;
            else if (diff > 0) dDayHtml = `<span class="d-day" style="background:var(--lilac-accent); color:white;">D-${diff}</span>`;
            else dDayHtml = `<span class="d-day" style="background:#ccc; color:white;">종료</span>`;
        }

        // 🟢 접수중: 초록색 / 🔴 마감: 빨간색
        const statusColor = currentStatus === "마감" ? "#e63946" : "#2a9d8f";
        const statusText = currentStatus === "마감" ? "접수마감" : "접수중";

        const card = document.createElement("div");
        card.className = "card"; // CSS .card 스타일 적용
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:12px; font-weight:800; color:${statusColor}">● ${statusText}</span>
                ${dDayHtml}
            </div>
            <h3>${p.title}</h3>
            <div style="font-size:13px; color:#666;">
                <p>📍 ${p.region}</p>
                <p>📅 ${p.deadline}</p>
            </div>
        `;

        // ✅ 카드 클릭 시 상세 페이지 열기 (여기서 반응이 와야 합니다!)
        card.onclick = () => {
            console.log("Card Clicked!"); // 테스트용 로그
            openDetail(p);
        };

        listEl.appendChild(card);
    });
}

function openDetail(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    
    const link = document.getElementById("detailLink");
    link.href = p.link;
    
    detailView.classList.remove("hidden"); // .hidden을 제거해서 보여줌
}

document.getElementById("backBtn").onclick = () => {
    detailView.classList.add("hidden"); // 다시 숨김
};

toggleBtns.forEach(btn => {
    btn.onclick = () => {
        toggleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});

init();
