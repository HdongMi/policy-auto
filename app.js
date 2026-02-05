let policies = [];
let currentStatus = "접수중";
let searchQuery = "";

function init() {
    setupEventListeners();
    // 세션 기록이 있으면 스플래시 즉시 숨김
    if (sessionStorage.getItem('visited') === 'true') {
        const lp = document.getElementById('landingPage');
        if (lp) lp.style.display = 'none';
        showMainLayout();
    }
    fetchData().then(() => checkUrlParam());
}

function showMainLayout() {
    document.getElementById('landingPage')?.classList.add('hidden');
    document.getElementById('mainLayout')?.classList.remove('hidden');
    document.getElementById('detailView')?.classList.add('hidden');
    document.body.style.backgroundColor = "var(--lilac-bg)";
}

async function fetchData() {
    try {
        const res = await fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${new Date().getTime()}`);
        policies = await res.json();
        render();
    } catch (err) {
        console.error("Data fetch failed");
    }
}

function checkUrlParam() {
    const pTitle = new URLSearchParams(window.location.search).get('policy');
    if (pTitle && policies.length > 0) {
        const found = policies.find(p => p.title.includes(decodeURIComponent(pTitle)));
        if (found) showDetailUI(found);
    }
}

function openDetail(p) {
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${encodeURIComponent(p.title.substring(0, 15))}`);
    showDetailUI(p);
}

function showDetailUI(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    
    const linkEl = document.getElementById("detailLink");
    linkEl.href = p.link;

    linkEl.onclick = () => {
        const loader = document.getElementById('loadingOverlay');
        if(loader) {
            loader.classList.remove('hidden');
            setTimeout(() => { loader.classList.add('hidden'); }, 3000);
        }
    };

    document.getElementById('mainLayout')?.classList.add('hidden');
    document.getElementById('detailView')?.classList.remove('hidden');
    document.body.style.backgroundColor = "var(--lilac-bg)";
    window.scrollTo(0, 0);
}

window.onpopstate = (e) => {
    document.getElementById('loadingOverlay')?.classList.add('hidden');
    if (e.state && e.state.view === 'detail') showDetailUI(e.state.policy);
    else showMainLayout();
};

function render() {
    const listEl = document.getElementById('policyList');
    if (!listEl) return;
    listEl.innerHTML = "";
    const today = new Date().setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const dDate = parseDate(p.deadline);
        const isClosed = dDate ? dDate < today : false;
        return (currentStatus === "접수중" ? !isClosed : isClosed) && 
               (p.title + p.region).toLowerCase().includes(searchQuery.toLowerCase());
    });

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>${p.title}</h3><p>${p.region} | ${p.deadline}</p>`;
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}

function parseDate(str) {
    if (!str || /상세참조|소진시|상시/.test(str)) return new Date("2099-12-31");
    const t = str.includes('~') ? (str.split('~')[1]?.trim() || str.split('~')[0].trim()) : str;
    const c = t.replace(/[^0-9]/g, '');
    return c.length >= 8 ? new Date(`${c.substr(0,4)}-${c.substr(4,2)}-${c.substr(6,2)}`) : null;
}

function setupEventListeners() {
    // [수정됨] 시작 버튼 클릭 시 페이드 아웃 로직 적용
    document.getElementById('startBtn').onclick = () => {
        const landing = document.getElementById('landingPage');
        sessionStorage.setItem('visited', 'true');
        
        // 페이드 아웃 애니메이션 시작
        landing.classList.add('fade-out');
        
        // 애니메이션(0.5초) 후 레이아웃 전환
        setTimeout(() => {
            showMainLayout();
        }, 500);
    };

    document.getElementById('searchInput').oninput = (e) => {
        searchQuery = e.target.value;
        render();
    };
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentStatus = btn.innerText.trim();
            const s = document.querySelector('.toggle-slider');
            if(s) s.style.transform = currentStatus === "마감" ? "translateX(100%)" : "translateX(0)";
            render();
        };
    });
}

init();
