let policies = [];
let currentStatus = "전체"; // HTML 버튼의 data-status="전체"와 맞춤

// DOM 요소
const landingPage = document.getElementById('landingPage');
const mainLayout = document.getElementById('mainLayout');
const startBtn = document.getElementById('startBtn');
const listEl = document.getElementById('policyList');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const detailView = document.getElementById('detailView');

/** 1. 초기화 및 데이터 로드 */
function init() {
    const isVisited = sessionStorage.getItem('visited');
    if (isVisited === 'true') {
        landingPage.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        fetchData();
    }
}

/** 2. 시작 버튼 (애니메이션 포함) */
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

/** 3. 데이터 가져오기 */
function fetchData() {
    listEl.innerHTML = `<div style="text-align:center; padding:50px; color:var(--lilac-accent);">데이터 로딩 중...</div>`;
    const url = `https://HdongMi.github.io/policy-auto/policies.json?t=${new Date().getTime()}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            policies = data;
            render();
        })
        .catch(err => {
            listEl.innerHTML = `<div style="text-align:center; padding:50px;">데이터 로드 실패 ㅠㅠ</div>`;
        });
}

/** 4. 날짜 계산기 */
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

/** 5. 리스트 렌더링 (클릭 이벤트 주입) */
function render() {
    listEl.innerHTML = "";
    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = policies.filter(p => {
        const deadlineDate = getEndDate(p.deadline);
        const isClosed = deadlineDate && deadlineDate < today;
        return currentStatus === "마감" ? isClosed : !isClosed;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; padding:50px; color:#999;">공고가 없습니다.</p>`;
        return;
    }

    filtered.forEach(p => {
        const deadlineDate = getEndDate(p.deadline);
        let dDayHtml = "";
        
        if (!deadlineDate) {
            dDayHtml = `<span class="d-day" style="background:#eee; color:#666; font-size:11px; padding:4px 8px; border-radius:8px;">기한확인</span>`;
        } else {
            const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            if (diff === 0) dDayHtml = `<span class="d-day" style="background:#ff6b6b; color:white; font-size:11px; padding:4px 8px; border-radius:8px;">오늘마감</span>`;
            else if (diff > 0) dDayHtml = `<span class="d-day" style="background:var(--lilac-accent); color:white; font-size:11px; padding:4px 8px; border-radius:8px;">D-${diff}</span>`;
            else dDayHtml = `<span class="d-day" style="background:#ccc; color:white; font-size:11px; padding:4px 8px; border-radius:8px;">종료</span>`;
        }

        // ✅ 요청하신 접수중(초록)/마감(빨강) 색상
        const statusColor = currentStatus === "마감" ? "#e63946" : "#2a9d8f";
        const statusText = currentStatus === "마감" ? "접수마감" : "접수중";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:12px; font-weight:800; color:${statusColor}">● ${statusText}</span>
                ${dDayHtml}
            </div>
            <h3 style="margin:0 0 8px 0; font-size:17px; color:var(--lilac-dark);">${p.title}</h3>
            <div style="font-size:13px; color:#666;">
                <p style="margin:2px 0;">📍 ${p.region}</p>
                <p style="margin:2px 0;">📅 ${p.deadline}</p>
            </div>
        `;

        // ⭐ 핵심: 카드 클릭 시 상세 페이지 노출
        card.addEventListener('click', () => {
            openDetail(p);
        });

        listEl.appendChild(card);
    });
}

/** 6. 상세 보기 실행 */
function openDetail(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    
    const link = document.getElementById("detailLink");
    link.href = p.link;
    link.target = "_blank"; // 새창 열기
    
    detailView.classList.remove("hidden");
    window.scrollTo(0, 0); // 모달 열릴 때 상단으로
}

/** 7. 상세 보기 닫기 */
document.getElementById("backBtn").onclick = () => {
    detailView.classList.add("hidden");
};

/** 8. 토글 필터 이벤트 */
toggleBtns.forEach(btn => {
    btn.onclick = () => {
        toggleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentStatus = btn.dataset.status;
        render();
    };
});

init();
