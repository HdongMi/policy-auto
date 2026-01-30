let policies = [];
let currentStatus = "전체";
let searchQuery = "";

const detailView = document.getElementById('detailView');
const listEl = document.getElementById('policyList');

// 데이터 로드 및 렌더링 생략 (기존 코드와 동일하게 유지)
function fetchData() {
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
        const statusMatch = (currentStatus === "마감" ? isClosed : !isClosed);
        return statusMatch && (p.title + p.region).toLowerCase().includes(searchQuery);
    });

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>${p.title}</h3><p>📍 ${p.region}</p><p>📅 ${p.deadline}</p>`;
        // 클릭 시 팝업 실행
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}

// 🔥 상세 팝업 열기
function openDetail(p) {
    document.getElementById("detailTitle").innerText = p.title;
    document.getElementById("detailTarget").innerText = p.region || "전국";
    document.getElementById("detailDeadline").innerText = p.deadline;
    document.getElementById("detailSource").innerText = p.source;
    document.getElementById("detailLink").href = p.link;
    
    // hidden 클래스를 제거하여 애니메이션 실행 (위로 올라옴)
    detailView.classList.remove("hidden");
    
    // 브라우저 '뒤로가기'를 눌러도 팝업이 닫히도록 상태 추가
    history.pushState({ page: "detail" }, "detail", "");
}

// 🔥 팝업 닫기 (뒤로가기 버튼)
document.getElementById("backBtn").onclick = () => {
    history.back(); // 뒤로가기 실행 -> popstate 이벤트가 발생하며 모달 닫힘
};

// 브라우저 물리 뒤로가기 대응
window.onpopstate = () => {
    detailView.classList.add("hidden");
};

// 나머지 초기화 코드 (fetchData 실행 등)
fetchData();
