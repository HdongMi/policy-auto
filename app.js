let policies = [];
let currentStatus = "접수중";
let searchQuery = "";

function init() {
    setupEventListeners();
    if (sessionStorage.getItem('visited') === 'true') {
        showMainLayout();
    }
    fetchData().then(() => checkUrlParam());
}

function showMainLayout() {
    document.getElementById('landingPage')?.classList.add('hidden');
    document.getElementById('mainLayout')?.classList.remove('hidden');
    document.getElementById('detailView')?.classList.add('hidden');
}

async function fetchData() {
    const listEl = document.getElementById('policyList');
    try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`https://HdongMi.github.io/policy-auto/policies.json?v=${cacheBuster}`);
        policies = await res.json();
        render();
    } catch (err) {
        if (listEl) listEl.innerHTML = "<div style='padding:40px; text-align:center;'>데이터 로드 실패</div>";
    }
}

function checkUrlParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const policyTitle = urlParams.get('policy');
    if (policyTitle && policies.length > 0) {
        const decodedTitle = decodeURIComponent(policyTitle);
        const found = policies.find(p => p.title.includes(decodedTitle));
        if (found) showDetailUI(found);
    }
}

function openDetail(p) {
    const urlSafeTitle = encodeURIComponent(p.title.substring(0, 15));
    history.pushState({ view: 'detail', policy: p }, p.title, `?policy=${urlSafeTitle}`);
    showDetailUI(p);
}

function showDetailUI(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region;
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    document.getElementById("detailLink").href = p.link;

    document.getElementById('landingPage')?.classList.add('hidden');
    document.getElementById('mainLayout')?.classList.add('hidden');
    document.getElementById('detailView')?.classList.remove('hidden');
    window.scrollTo(0, 0);
}

window.onpopstate = (e) => {
    if (e.state && e.state.view === 'detail') showDetailUI(e.state.policy);
    else {
        document.getElementById('detailView')?.classList.add('hidden');
        document.getElementById('mainLayout')?.classList.remove('hidden');
    }
};

function render() {
    const listEl = document.getElementById('policyList');
    if (!listEl) return;
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const dDate = parseDate(p.deadline);
        const isClosed = dDate ? dDate < today : false;
        const statusMatch = (currentStatus === "접수중") ? !isClosed : isClosed;
        const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.region.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && searchMatch;
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
    const target = str.includes('~') ? (str.split('~')[1]?.trim() || str.split('~')[0].trim()) : str;
    const clean = target.replace(/[^0-9]/g, '');
    return clean.length >= 8 ? new Date(`${clean.substr(0,4)}-${clean.substr(4,2)}-${clean.substr(6,2)}`) : null;
}

function setupEventListeners() {
    document.getElementById('startBtn').onclick = () => {
        sessionStorage.setItem('visited', 'true');
        showMainLayout();
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
            const slider = document.querySelector('.toggle-slider');
            if(slider) slider.style.transform = currentStatus === "마감" ? "translateX(100%)" : "translateX(0)";
            render();
        };
    });
    document.getElementById('backBtn').onclick = () => history.back();
}

init();
