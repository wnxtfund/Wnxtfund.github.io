/* map/map.js */
const CSV_URLS = {
    due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
    overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
    disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv"
};

let rawData = [];
let svgDoc;

// 🔑 DOM elements (สำคัญมาก)
const typeSelect = document.getElementById("typeSelect");
// const yearSelect = document.getElementById("yearSelect");
// const monthSelect = document.getElementById("monthSelect");
const tooltip = document.getElementById("mapTooltip");

/* โหลดแผนที่ */
fetch("map/thailandHigh.svg")
    .then(r => r.text())
    .then(svg => {
        document.getElementById("map").innerHTML = svg;

        const svgEl = document.querySelector("#map svg");

        // คืนค่าแบบเก่า — ไม่ต้อง wrap <g>
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");

        if (!svgEl.getAttribute("viewBox")) {
            svgEl.setAttribute("viewBox", "0 0 900 1400");
        }

        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // ⭐ svgDoc เป็น <svg> อีกครั้ง (ไม่ใช่ <g>)
        svgDoc = svgEl;
    });


/* โหลด CSV */
async function loadCSV(type) {
    const res = await fetch(CSV_URLS[type]);
    const text = await res.text();

    const rows = text.trim().split("\n").map(r => r.split(","));
    const headers = rows.shift();

    rawData = rows.map(r =>
        Object.fromEntries(headers.map((h, i) => [h.trim(), r[i]]))
    );

    initFilters();
    updateView();
}

/* dropdown */
function initFilters() {
    // const years = [...new Set(rawData.map(r => r["ปีงบ"]))];
    // const months = [...new Set(rawData.map(r => r["เดือน"]))];

    // yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    // monthSelect.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join("");
}

/* สี */
function colorScale(rank, green) {
    // Blue scale (เข้ม → อ่อน)
    const blues = [
        "#0a3d91", // เข้มสุด
        "#1f5fbf",
        "#4b84d9",
        "#8ab1f0",
        "#c7dcff"  // อ่อนสุด
    ];

    // Gray scale (อ่อน → เข้ม)
    const grays = [
        "#d9d9d9",
        "#bfbfbf",
        "#8c8c8c",
        "#595959",
        "#262626"
    ];

    return green ? blues[rank] : grays[rank];
}


/* อัปเดตทั้งหมด */
function updateView() {
    if (!rawData.length || !svgDoc) return;

    const type = typeSelect.value;
    // const year = yearSelect.value;
    // const month = monthSelect.value;

    // const rows = rawData.filter(r => r["ปีงบ"] === year && r["เดือน"] === month);
    // const rows = rawData.filter(r => r["ปีงบ"] === year );

     const latestRow = rawData
        .slice()
        .sort((a, b) => {
            if (a["ปีงบ"] !== b["ปีงบ"]) {
                return Number(b["ปีงบ"]) - Number(a["ปีงบ"]);
            }
            return Number(b["เดือน"]) - Number(a["เดือน"]);
        })[0];

    const latestYear = latestRow["ปีงบ"];
    const latestMonth = latestRow["เดือน"];

    // 🔥 ใช้ข้อมูลล่าสุดเท่านั้น
    const rows = rawData.filter(
        r => r["ปีงบ"] === latestYear && r["เดือน"] === latestMonth
    );

    if (!rows.length) return;

    const percentKey = Object.keys(rows[0]).find(k => k.includes("ร้อยละ"));

    // ------------------------------
    //  จัดอันดับตามประเภท
    // ------------------------------
    if (type === "overdue") {
        rows.sort((a, b) => parseFloat(a[percentKey]) - parseFloat(b[percentKey]));
    } else {
        rows.sort((a, b) => parseFloat(b[percentKey]) - parseFloat(a[percentKey]));
    }

    const top5 = rows.slice(0, 5);
    const bottom5 = rows.slice(-5);

    // ------------------------------
    //  อัปเดตตาราง (เวอร์ชันใหม่ แยกหัวข้อ Top5/Bottom5)
    // ------------------------------
    const tbody = document.querySelector("#mapTable tbody");
    tbody.innerHTML = "";

    // ⭐ หัวตาราง Top 5
    tbody.innerHTML += `
<tr class="section-header"><td colspan="4">▶ Top 5 อันดับแรก</td></tr>
`;

    // ⭐ แถวข้อมูล Top 5
    top5.forEach((r, i) => {
        tbody.innerHTML += `
    <tr>
        <td>${i + 1}. ${r["จังหวัด"]}</td>
        <td>${Number(Object.values(r)[3] || 0).toLocaleString()}</td>
        <td>${Number(Object.values(r)[4] || 0).toLocaleString()}</td>
        <td>${Number(r[percentKey]).toFixed(2)}</td>
    </tr>`;
    });

    // ⭐ หัวตาราง Bottom 5
    tbody.innerHTML += `
<tr class="section-header"><td colspan="4">▶ 5 อันดับสุดท้าย</td></tr>
`;

    // ⭐ แถวข้อมูล Bottom 5
    bottom5.forEach((r, i) => {
        tbody.innerHTML += `
    <tr>
        <td>${rows.length - 5 + i + 1}. ${r["จังหวัด"]}</td>
        <td>${Number(Object.values(r)[3] || 0).toLocaleString()}</td>
        <td>${Number(Object.values(r)[4] || 0).toLocaleString()}</td>
        <td>${Number(r[percentKey]).toFixed(2)}</td>
    </tr>`;
    });


    // ------------------------------
    //  ลงสีบนแผนที่ + tooltip
    // ------------------------------
    svgDoc.querySelectorAll("path").forEach(p => {
        const pv = mapping_pv[p.id];

        const rowTop = top5.find(r => r["จังหวัด"] === pv);
        const rowBottom = bottom5.find(r => r["จังหวัด"] === pv);

        // ⭐ NEW: ข้อมูลของจังหวัด (รองรับทุกจังหวัด)
        const row = rows.find(r => r["จังหวัด"] === pv);

        let color = "#eee";

        if (rowTop) {
            // จังหวัดติดอันดับ Top 5
            color = colorScale(top5.indexOf(rowTop), true);
            p.classList.remove("map-default");

        } else if (rowBottom) {
            // จังหวัดติดอันดับ Bottom 5
            color = colorScale(bottom5.indexOf(rowBottom), false);
            p.classList.remove("map-default");

        } else {
            // จังหวัดที่ไม่ติดอันดับใดๆ
            color = "#e98ae7";
            p.classList.add("map-default");
        }

        p.style.fill = color;
        p.style.pointerEvents = "visibleFill";

        // ------------------------
        // ⭐ แสดง tooltip ทุกจังหวัด
        // ------------------------
        p.onmousemove = e => {
            if (!row) return; // ป้องกันกรณีจังหวัดไม่อยู่ใน CSV (ไม่น่าจะเกิด)

            const rect = document.querySelector(".map-area").getBoundingClientRect();

            // อันดับ (ถ้าไม่ติดอันดับ จะไม่ขึ้นตัวเลข)
            let rankText = "";
            if (rowTop) rankText = `${top5.indexOf(rowTop) + 1}. `;
            else if (rowBottom) rankText = `${rows.length - 5 + bottom5.indexOf(rowBottom) + 1}. `;

            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX - rect.left + 12) + "px";
            tooltip.style.top = (e.clientY - rect.top + 12) + "px";

            tooltip.innerHTML = `
            <b>${rankText}${pv}</b><br>
            ค่าเป้าหมาย : ${Number(Object.values(row)[3] || 0).toLocaleString()}<br>
            ค่าผลลัพธ์ : ${Number(Object.values(row)[4] || 0).toLocaleString()}<br>
            ${percentKey}: ${Number(row[percentKey]).toFixed(2)}%
        `;
        };

        p.onmouseleave = () => tooltip.style.display = "none";
    });


    // ==========================================================
    // ⭐ ปักหมุดแบบเข็ม บน Top 5 (สีน้ำเงิน) + Bottom 5 (สีแดง)
    // ==========================================================

    // ลบหมุดเก่าก่อน
    svgDoc.querySelectorAll(".map-pin").forEach(el => el.remove());

    // ฟังก์ชันวางหมุดเข็ม + ตัวเลขบนหมุด
    function addPin(path, rank, type, rowData) {
    const bbox = path.getBBox();

    const pinSize = 52;
    const pinHalf = pinSize / 2;

    const pinX = bbox.x + bbox.width / 2 - pinHalf;
    const pinY = bbox.y + bbox.height / 2 - pinSize + 8;

    // =========================
    // กำหนดสีตามประเภท
    // =========================
    const pinHref =
        type === "top"
            ? "map/pin-green.svg"   // 🔵 Top 5
            : "map/pin-red.svg"; // ⚪ Bottom 5

    const textColor =
        type === "top"
            ? "#1e88e5"   // ฟ้า
            : "#ffffff"; // ขาว

    // --- Pin image ---
    const pin = document.createElementNS("http://www.w3.org/2000/svg", "image");
    pin.setAttribute("href", pinHref);
    pin.setAttribute("width", pinSize);
    pin.setAttribute("height", pinSize);
    pin.setAttribute("x", pinX);
    pin.setAttribute("y", pinY);
    pin.setAttribute("class", "map-pin");
    pin.style.pointerEvents = "none";
    svgDoc.appendChild(pin);

    // --- Pin label (number) ---
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", bbox.x + bbox.width / 2);
    label.setAttribute("y", pinY + pinSize / 2 + 4);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "20");
    label.setAttribute("font-weight", "bold");
    label.setAttribute("fill", textColor); // ✅ ใช้ fill ตัวเดียว
    label.setAttribute("class", "map-pin");
    label.style.pointerEvents = "none";
    label.textContent = rank;

    svgDoc.appendChild(label);
}


    // ปักหมุด Top 5 → pin-green.svg
    top5.forEach((r, i) => {
        const pv = r["จังหวัด"];
        const pathId = Object.keys(mapping_pv).find(k => mapping_pv[k] === pv);
        const path = svgDoc.querySelector(`path#${pathId}`);
        if (path) addPin(path, i + 1, "top");
    });

    // ปักหมุด Bottom 5 → pin-red.svg
    bottom5.forEach((r, i) => {
        const pv = r["จังหวัด"];
        const rank = rows.length - 5 + i + 1;
        const pathId = Object.keys(mapping_pv).find(k => mapping_pv[k] === pv);
        const path = svgDoc.querySelector(`path#${pathId}`);
        if (path) addPin(path, rank, "bottom");
    });

}

/* events */
typeSelect.onchange = () => loadCSV(typeSelect.value);
// yearSelect.onchange = updateView;
// monthSelect.onchange = updateView;

/* init */
loadCSV("due");

/* ============================================================
   ⭐ ระบบ Zoom & Pan (Drag) สำหรับ SVG Map
   ============================================================ */

let scale = 1;
let translateX = 0;
let translateY = 0;

let isDragging = false;
let dragStart = { x: 0, y: 0 };

/* ฟังก์ชันอัปเดต Transform */
function applyTransform() {
    if (svgDoc) {

        svgDoc.setAttribute(
            "transform",
            `translate(${translateX}, ${translateY}) scale(${scale})`
        );
        // svgDoc.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        // svgDoc.style.transformOrigin = "0 0";

    }
}

/* -------------------------------
   ปุ่ม Zoom In / Zoom Out
--------------------------------- */
document.getElementById("zoomIn").onclick = () => {
    scale = Math.min(scale + 0.1, 4);
    applyTransform();
};

document.getElementById("zoomOut").onclick = () => {
    scale = Math.max(scale - 0.1, 0.5);
    applyTransform();
};

/* -------------------------------
   Zoom ด้วยล้อเมาส์
--------------------------------- */
document.getElementById("map").addEventListener("wheel", function (e) {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(scale + delta, 0.5), 4);

    applyTransform();
});

/* -------------------------------
   Drag / Pan (กดเมาส์ลาก)
--------------------------------- */
document.getElementById("map").addEventListener("mousedown", function (e) {
    isDragging = true;
    dragStart.x = e.clientX - translateX;
    dragStart.y = e.clientY - translateY;
});

document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    translateX = e.clientX - dragStart.x;
    translateY = e.clientY - dragStart.y;

    applyTransform();
});

document.addEventListener("mouseup", function () {
    isDragging = false;
});
// -----------------------------------------------------
// Global mousemove: ถ้าอยู่นอก hitbox หรือ path ให้ล้าง tooltip
// -----------------------------------------------------
document.querySelector(".map-area").addEventListener("mousemove", (e) => {
    // เช็ค target ถ้าไม่ใช่ path และไม่ใช่ hitbox → reset
    if (!(e.target.tagName === "path" || e.target.classList.contains("map-pin"))) {
        tooltip.style.display = "none";
    }
});
