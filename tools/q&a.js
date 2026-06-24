// =================================================================
//                      Q&A Logic for GitHub Pages
// =================================================================

// --- การตั้งค่า ---
// URL ที่ได้จากการเผยแพร่ Google Sheet เป็นไฟล์ CSV
// วิธีทำ: ใน Google Sheet -> ไฟล์ (File ) -> แชร์ (Share) -> เผยแพร่ไปยังเว็บ (Publish to web)
// เลือกชีตที่ต้องการ, เลือกรูปแบบเป็น "Comma-separated values (.csv)" แล้วกด "เผยแพร่" (Publish)
// จากนั้นคัดลอกลิงก์ที่ได้มาวางที่นี่
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9TK4pGi-Bpwl-pejFksJ07GL73M7_7fK9Rx6whKOOcMhGg_V7v3wt8KLwIVcxmaqNNcS5itvKGddd/pub?gid=0&single=true&output=csv'

// --- ตัวแปรและค่าคงที่ ---
let faqsData = [];
let currentCategory = 'all'; // เก็บประเภทที่เลือกปัจจุบัน
const converter = new showdown.Converter();

// --- การอ้างอิงถึง Element ในหน้าเว็บ ---
const searchInput = document.getElementById('searchInput');
const categoryButtonsContainer = document.getElementById('categoryButtons');
const faqContainer = document.getElementById('faqContainer');
const modal = document.getElementById('qaModal');
const modalQuestion = document.getElementById('modalQuestion');
const modalAnswer = document.getElementById('modalAnswer');
const closeButton = document.querySelector('.close-button');

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", fetchFAQs);
searchInput.addEventListener('input', () => filterAndRenderFAQs());
closeButton.onclick = closeModal;
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// --- ฟังก์ชันหลัก ---

/**
 * ดึงข้อมูลจาก Google Sheet CSV และเริ่มกระบวนการทั้งหมด
 */
function fetchFAQs() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const headers = results.meta.fields;
            // กำหนดชื่อคอลัมน์ตามลำดับใน Sheet
            const questionHeader = headers[0];
            const answerHeader = headers[1];
            const categoryHeader = headers[2];

            faqsData = results.data.map((row, index) => ({
                id: index, // เพิ่ม ID เพื่อการอ้างอิงที่ง่ายขึ้น
                question: row[questionHeader],
                answer: row[answerHeader],
                category: row[categoryHeader] || 'ทั่วไป' // ถ้าไม่มีประเภท ให้เป็น 'ทั่วไป'
            })).filter(faq => faq.question && faq.question.trim() !== '');

            if (faqsData.length > 0) {
                searchInput.disabled = false;
                createCategoryButtons();
                filterAndRenderFAQs();
            } else {
                showError({ message: "ไม่พบข้อมูลคำถามที่พบบ่อย" });
            }
        },
        error: (error) => {
            showError(error);
        }
    });
}

/**
 * สร้างปุ่มกรองจากประเภทคำถามที่ไม่ซ้ำกัน
 */
function createCategoryButtons() {
    // ดึงประเภททั้งหมดที่ไม่ซ้ำกันออกมา
    const categories = ['all', ...new Set(faqsData.map(faq => faq.category))];

    categoryButtonsContainer.innerHTML = ''; // เคลียร์ปุ่มเก่า

    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.dataset.category = category;
        button.textContent = category === 'all' ? 'ทั้งหมด' : category;
        if (category === currentCategory) {
            button.classList.add('active');
        }

        button.onclick = () => {
            currentCategory = category; // อัปเดตประเภทที่เลือก
            // อัปเดตสถานะ active ของปุ่ม
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterAndRenderFAQs(); // กรองและแสดงผลใหม่
        };
        categoryButtonsContainer.appendChild(button);
    });
}

/**
 * ฟังก์ชันกลางสำหรับกรองและแสดงผลรายการ FAQ
 * จะทำงานเมื่อมีการค้นหาหรือเปลี่ยนประเภท
 */
function filterAndRenderFAQs() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    // 1. กรองตามประเภทที่เลือก
    const categoryFiltered = faqsData.filter(faq =>
        currentCategory === 'all' || faq.category === currentCategory
    );

    // 2. กรองตามคำค้นหา
    const searchFiltered = categoryFiltered.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm)
    );

    renderFAQList(searchFiltered);
}

/**
 * แสดงรายการคำถามบนหน้าเว็บจากข้อมูลที่กรองแล้ว
 * @param {Array<Object>} filteredFaqs - อาร์เรย์ของ FAQ ที่จะแสดงผล
 */
function renderFAQList(filteredFaqs) {
    faqContainer.innerHTML = ''; // เคลียร์รายการเก่า

    if (filteredFaqs.length === 0) {
        faqContainer.innerHTML = '<p class="no-results-text">ไม่พบผลลัพธ์ที่ตรงกัน</p>';
        return;
    }

    filteredFaqs.forEach(faq => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        item.textContent = faq.question;
        // ใช้ id ที่เราสร้างขึ้นตอน fetch ข้อมูล
        item.onclick = () => openModal(faq.id);
        faqContainer.appendChild(item);
    });
}

/**
 * แสดงข้อความเมื่อเกิดข้อผิดพลาด
 */
function showError(error) {
    faqContainer.innerHTML = `<p class="error-text">เกิดข้อผิดพลาด: ${error.message}</p>`;
    searchInput.disabled = true;
    categoryButtonsContainer.innerHTML = '';
}

// --- ฟังก์ชันสำหรับจัดการ Modal ---

/**
 * เปิด Modal และแสดงรายละเอียดของคำถาม
 * @param {number} faqId - ID ของคำถามในอาร์เรย์ faqsData
 */
function openModal(faqId) {
    // ค้นหา FAQ จาก ID ใน master data array
    const faq = faqsData.find(f => f.id === faqId);
    if (faq) {
        modalQuestion.textContent = faq.question;
        const answerHtml = converter.makeHtml(faq.answer || '');
        modalAnswer.innerHTML = answerHtml;
        modal.style.display = 'flex';
    }
}

/**
 * ปิด Modal
 */
function closeModal() {
    modal.style.display = 'none';
}
