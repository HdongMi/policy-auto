// ... (fetchData, getEndDate 등 앞선 코드와 동일)

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
        
        // D-Day 배지 디자인
        if (deadlineDate) {
            const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            if (diff === 0) dDayHtml = `<span style="background:#ff6b6b; color:#fff; padding:3px 8px; border-radius:6px; font-size:11px;">오늘마감</span>`;
            else if (diff > 0) dDayHtml = `<span style="background:var(--lilac-accent); color:#fff; padding:3px 8px; border-radius:6px; font-size:11px;">D-${diff}</span>`;
        }

        // 상태 색상 (초록/빨강)
        const statusColor = currentStatus === "마감" ? "#e63946" : "#2a9d8f";
        const statusText = currentStatus === "마감" ? "접수마감" : "접수중";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-size:12px; font-weight:bold; color:${statusColor}">● ${statusText}</span>
                ${dDayHtml}
            </div>
            <h3>${p.title}</h3>
            <p style="font-size:13px; color:#777; margin:0;">📍 ${p.region} | 📅 ${p.deadline}</p>
        `;

        // 기능 핵심: 클릭 시 상세 페이지 열기
        card.onclick = () => openDetail(p);
        listEl.appendChild(card);
    });
}
// ... (이후 openDetail 및 토글 이벤트는 기존 백업본과 동일하게 유지)
