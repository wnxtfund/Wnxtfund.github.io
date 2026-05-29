/* ==============================
   CONFIG CSV URL
================================ */
const SUMMARY_CSV_URLS = {
  due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
  overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
  disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv",
  member: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1451100374&single=true&output=csv",
  project: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1260845558&single=true&output=csv"
};

/* ==============================
   COLUMN INDEX (A–F)
================================ */
const COL = {
  FY: 0,        // ปีงบ
  MONTH: 1,     // เดือน (ข้อความ)
  PROVINCE: 2,  // จังหวัด
  TARGET: 3,    // เป้า
  ACTUAL: 4,    // ค่าที่ได้
  PERCENT: 5
};


const COL_SIMPLE = {
  FY: 0,
  MONTH: 1,
  PROVINCE: 2,
  VALUE: 3   // จำนวนสมาชิก / จำนวนโครงการ
};

/* ==============================
   MONTH MAP (TH)
================================ */
const TH_MONTH = {
  "มกราคม": 1,
  "กุมภาพันธ์": 2,
  "มีนาคม": 3,
  "เมษายน": 4,
  "พฤษภาคม": 5,
  "มิถุนายน": 6,
  "กรกฎาคม": 7,
  "สิงหาคม": 8,
  "กันยายน": 9,
  "ตุลาคม": 10,
  "พฤศจิกายน": 11,
  "ธันวาคม": 12
};

/* ==============================
   UTILS
================================ */
function toNumber(val) {
  return Number(val) || 0;
}

function monthIndex(val) {
  return TH_MONTH[val?.trim()] || 0;
}

/* ==============================
   CSV PARSER (ARRAY)
================================ */
function parseCSV(text) {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map(line => line.split(","));
}

/* ==============================
   CALCULATE RATE
================================ */
async function calculateSummaryRate(url) {
  const res = await fetch(url);
  const csvText = await res.text();
  const data = parseCSV(csvText);

  // ปีงบล่าสุด
  const latestFY = Math.max(
    ...data.map(r => toNumber(r[COL.FY]))
  );

  // เดือนล่าสุด (จากชื่อเดือน)
  const latestMonth = Math.max(
    ...data
      .filter(r => toNumber(r[COL.FY]) === latestFY)
      .map(r => monthIndex(r[COL.MONTH]))
  );

  // กรองข้อมูลล่าสุด
  const filtered = data.filter(r =>
    toNumber(r[COL.FY]) === latestFY &&
    monthIndex(r[COL.MONTH]) === latestMonth
  );

  // รวมยอดทุกจังหวัด
  const totalTarget = filtered.reduce(
    (sum, r) => sum + toNumber(r[COL.TARGET]), 0
  );

  const totalActual = filtered.reduce(
    (sum, r) => sum + toNumber(r[COL.ACTUAL]), 0
  );

  return totalTarget
    ? (totalActual * 100) / totalTarget
    : 0;
}
/* ==============================
   CALCULATE TOTAL
================================ */
async function calculateLatestTotal(url) {
  if (!url) return 0;

  const res = await fetch(url);
  const csvText = await res.text();
  const data = parseCSV(csvText);

  // ปีงบล่าสุด
  const latestFY = Math.max(
    ...data.map(r => toNumber(r[COL_SIMPLE.FY]))
  );

  // เดือนล่าสุด (ภาษาไทย)
  const latestMonth = Math.max(
    ...data
      .filter(r => toNumber(r[COL_SIMPLE.FY]) === latestFY)
      .map(r => monthIndex(r[COL_SIMPLE.MONTH]))
  );

  // กรองข้อมูลล่าสุด
  const filtered = data.filter(r =>
    toNumber(r[COL_SIMPLE.FY]) === latestFY &&
    monthIndex(r[COL_SIMPLE.MONTH]) === latestMonth
  );

  // รวมค่าทุกจังหวัด
  return filtered.reduce(
    (sum, r) => sum + toNumber(r[COL_SIMPLE.VALUE]),
    0
  );
}


/* ==============================
   LOAD TO CARD
================================ */
async function loadSummaryCards() {
  const disburse = await calculateSummaryRate(SUMMARY_CSV_URLS.disburse);
  const due = await calculateSummaryRate(SUMMARY_CSV_URLS.due);
  const overdue = await calculateSummaryRate(SUMMARY_CSV_URLS.overdue);
  const member = await calculateLatestTotal(SUMMARY_CSV_URLS.member);
  const project = await calculateLatestTotal(SUMMARY_CSV_URLS.project);

  document.getElementById("disburseRate").textContent =
    disburse.toFixed(2) + "%";

  document.getElementById("dueRate").textContent =
    due.toFixed(2) + "%";

  document.getElementById("overdueRate").textContent =
    overdue.toFixed(2) + "%";

  document.getElementById("memberTotal").textContent =
    member.toLocaleString();

  document.getElementById("projectTotal").textContent =
    project.toLocaleString();

}

/* ==============================
   SAFE LOAD
================================ */
document.addEventListener("DOMContentLoaded", loadSummaryCards);
