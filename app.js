let policies = [];
let currentStatus = "접수중";
let searchQuery = "";

function init() {
    setupEventListeners();
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
    document.getElementById("detailTarget").innerText = p.region || p.target || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source || "상세페이지 참조";
    
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
        // 모바일 터치 대응을 위해 onclick 유지
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

// [추가] 모바일용 토스트 알림 함수
function showToast(message) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.8); color: white; padding: 12px 25px;
            border-radius: 30px; font-size: 14px; z-index: 9999;
            transition: opacity 0.3s; opacity: 0; pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// 관심 공고 저장/해제 함수
function toggleFavorite(policy) {
    let favorites = JSON.parse(localStorage.getItem('myFavorites') || '[]');
    // ID가 없을 경우 제목을 키로 사용
    const policyId = policy.id || policy.title;
    const isExist = favorites.find(fav => (fav.id === policyId) || (fav.title === policy.title));

    if (isExist) {
        favorites = favorites.filter(fav => (fav.id !== policyId) && (fav.title !== policy.title));
        showToast("관심 공고에서 삭제되었습니다.");
    } else {
        favorites.push({
            id: policyId,
            title: policy.title,
            target: policy.target,
            deadline: policy.deadline,
            link: policy.link,
            savedAt: new Date().toLocaleDateString()
        });
        showToast("관심 공고에 저장되었습니다! ⭐");
    }
    localStorage.setItem('myFavorites', JSON.stringify(favorites));
}

function setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    if(startBtn) {
        startBtn.onclick = () => {
            const landing = document.getElementById('landingPage');
            sessionStorage.setItem('visited', 'true');
            landing.classList.add('fade-out');
            setTimeout(() => { showMainLayout(); }, 500);
        };
    }

    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value;
            render();
        };
    }

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

    // 상세페이지 저장 버튼 리스너 등록
    const favBtn = document.getElementById('detailFavBtn');
    if(favBtn) {
        favBtn.onclick = function() {
            const currentPolicy = {
                title: document.getElementById('detailTitle').innerText,
                target: document.getElementById('detailTarget').innerText,
                deadline: document.getElementById('detailDeadline').innerText,
                link: document.getElementById('detailLink').href
            };
            toggleFavorite(currentPolicy);
        };
    }
}

init();
