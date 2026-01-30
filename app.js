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

// 1. 랜딩 페이지 및 세션 제어
if (sessionStorage.getItem('visited') === 'true') {
    if (landingPage) landingPage.style.display = 'none';
    if (mainLayout) mainLayout.classList.remove('hidden');
    fetchData();
}

if (startBtn) {
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

// 2. 검색 및 필터링
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        render();
    });
}

function fetchData() {
    if (!listEl) return;
    listEl.innerHTML = "<p style='text-align:center; padding:50px; color:#999;'>데이터 로딩 중...</p>";
    fetch(`https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            policies = data;
            render();
        })
        .catch(() => {
            listEl.innerHTML = "<p style='text-align:center; padding:50px; color:#999;'>데이터를 불러올 수 없습니다.</p>";
        });
}

function render() {
    if (!listEl) return;
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
        const deadlineDate = parseDate(p.deadline);
        let dDayHtml = "";
        if (deadlineDate) {
            const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            if (diff === 0) dDayHtml = `<span style="background:#ff6b6b; color:white; padding:4px 10px; border-radius:8px; font-size:12px;">오늘마감</span>`;
            else if (diff > 0) dDayHtml = `<span style="background:var(--lilac); color:white; padding:4px 10px; border-radius:8px; font-size:12px;">D-${diff}</span>`;
        }

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <span style="font-weight:800; color:${currentStatus === "마감" ? "#e63946" : "#2a9d8f"}; font-size:13px;">● ${currentStatus === "마감" ? "접수마감" : "접수중"}</span>
                ${dDayHtml}
            </div>
            <h3>${p.title}</h3>
            <p>📍 ${p.region}</p>
            <p>📅 ${p.deadline}</p>
        `;
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

// 3. 상세 보기 함수 (링크 문제 해결의 핵심)
function openDetail(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source || "상세참조";

    const linkBtn = document.getElementById("detailLink");
    
    // 데이터가 있을 때만 href를 업데이트하고, 없으면 경고창 띄우기
    if (p.link && p.link.length > 5) {
        linkBtn.setAttribute('href', p.link);
        linkBtn.innerText = "공식 공고 페이지로 이동";
        linkBtn.style.background = "var(--lilac)";
    } else {
        linkBtn.setAttribute('href', '#');
        linkBtn.innerText = "상세 링크 준비 중";
        linkBtn.style.background = "#ccc";
    }

    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
}

document.getElementById("backBtn").onclick = () => detailView.classList.add("hidden");

toggleBtns.forEach(btn => {
    btn.onclick = () => {
        toggleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});
