// ============ LOAN MANAGEMENT ============
console.log("✅ loans.js loaded");

// Global Variables
let loanChart = null;
let allLoans = [];
let allCustomers = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Thai Month Names
const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// DOM Elements
const loanModal = document.getElementById("loanModal");
const loanForm = document.getElementById("loanForm");
const loanTableBody = document.getElementById("loanTableBody");
const detailModal = document.getElementById("detailModal");

// ============ INITIALIZE ============
function initMonthSelector() {
    const monthSelect = document.getElementById("monthSelect");
    const yearSelect = document.getElementById("yearSelect");
    
    // Populate months
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = thaiMonths[i];
        if (i === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    }
    
    // Populate years (current year and 5 years back)
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= thisYear - 5; y--) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = y + 543; // Buddhist Era
        if (y === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
    
    updateMonthDisplay();
}

function updateMonthDisplay() {
    const display = document.getElementById("currentMonthDisplay");
    if (display) {
        display.textContent = `${thaiMonths[currentMonth]} ${currentYear + 543}`;
    }
}

// ============ LOAD CUSTOMERS ============
async function loadCustomers() {
    try {
        const snapshot = await db.collection("customers").orderBy("nickname").get();
        allCustomers = [];
        
        snapshot.forEach(doc => {
            allCustomers.push({ id: doc.id, ...doc.data() });
        });

        const customerSelect = document.getElementById("customerSelect");
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">-- เลือกลูกค้าจากระบบ --</option>';
            allCustomers.forEach(c => {
                customerSelect.innerHTML += `<option value="${c.id}">${c.nickname} - ${c.nameSurname}</option>`;
            });
        }

        console.log("✅ Customers loaded:", allCustomers.length);
    } catch (error) {
        console.error("❌ Load customers error:", error);
    }
}

function fillCustomerData() {
    const selectedId = document.getElementById("customerSelect").value;
    if (!selectedId) return;

    const customer = allCustomers.find(c => c.id === selectedId);
    if (customer) {
        document.getElementById("nickname").value = customer.nickname || '';
        document.getElementById("nameSurname").value = customer.nameSurname || '';
        document.getElementById("customerId").value = customer.id || '';
    }
}

// ============ MODAL FUNCTIONS ============
function openModal() {
    loanModal.style.display = "block";
    document.getElementById("modalTitle").textContent = "เพิ่มข้อมูลเงินกู้ใหม่";
    loanForm.reset();
    delete loanForm.dataset.editId;
    
    // Set default loan date to today
    document.getElementById("loanDate").value = new Date().toISOString().split('T')[0];
    loadCustomers();
}

function closeModalFunc() {
    loanModal.style.display = "none";
    loanForm.reset();
    delete loanForm.dataset.editId;
}

function closeDetailModal() {
    detailModal.style.display = "none";
}

window.onclick = (e) => {
    if (e.target === loanModal) closeModalFunc();
    if (e.target === detailModal) closeDetailModal();
};

// ============ FILTER BY MONTH ============
function filterByMonth() {
    currentMonth = parseInt(document.getElementById("monthSelect").value);
    currentYear = parseInt(document.getElementById("yearSelect").value);
    updateMonthDisplay();
    loadDashboardData();
}

// ============ LOAD DATA BY MONTH ============
async function loadDashboardData() {
    try {
        // Calculate date range for selected month
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const endYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

        const snapshot = await db.collection("loans")
            .where("loanDate", ">=", startDate)
            .where("loanDate", "<", endDate)
            .orderBy("loanDate", "desc")
            .get();
        
        allLoans = [];
        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        let activeCount = 0;
        let totalSum = 0;

        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            allLoans.push(data);

            const principal = parseFloat(data.principal) || 0;
            const interest = parseFloat(data.interest) || 0;

            totalPrincipal += principal;
            totalInterest += interest;
            totalSum += (principal + interest);

            if (data.status === "คืนแล้ว" || data.status === "ชำระแล้ว") {
                totalPaid += (principal + interest);
            } else {
                activeCount++;
            }
        });

        // Update dashboard cards
        document.getElementById("totalLoans").textContent = totalPrincipal.toLocaleString() + " ฿";
        document.getElementById("totalInterest").textContent = totalInterest.toLocaleString() + " ฿";
        document.getElementById("totalSum").textContent = totalSum.toLocaleString() + " ฿";
        document.getElementById("paidAmount").textContent = totalPaid.toLocaleString() + " ฿";
        document.getElementById("activeLoans").textContent = activeCount + " รายการ";
        document.getElementById("loanCount").textContent = allLoans.length + " รายการ";

        renderTable(allLoans);
        renderChart();

        // Save monthly summary to database
        saveMonthlyData(totalPrincipal, totalInterest, totalPaid, allLoans.length, activeCount);

        console.log("✅ Data loaded:", allLoans.length, "records for", thaiMonths[currentMonth], currentYear + 543);

    } catch (error) {
        console.error("❌ Firebase Error:", error);
        
        // If index not found, show all data
        if (error.code === 'failed-precondition') {
            console.log("⚠️ Index required. Loading all data...");
            loadAllData();
        }
    }
}

// Fallback: Load all data
async function loadAllData() {
    try {
        const snapshot = await db.collection("loans").orderBy("loanDate", "desc").get();
        allLoans = [];
        
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            // Filter by month in JavaScript
            if (data.loanDate) {
                const [year, month] = data.loanDate.split('-').map(Number);
                if (year === currentYear && month === currentMonth) {
                    allLoans.push(data);
                }
            }
        });

        let totalPrincipal = 0, totalInterest = 0, totalPaid = 0, activeCount = 0;

        allLoans.forEach(loan => {
            const principal = parseFloat(loan.principal) || 0;
            const interest = parseFloat(loan.interest) || 0;
            totalPrincipal += principal;
            totalInterest += interest;
            if (loan.status === "คืนแล้ว" || loan.status === "ชำระแล้ว") {
                totalPaid += (principal + interest);
            } else {
                activeCount++;
            }
        });

        document.getElementById("totalLoans").textContent = totalPrincipal.toLocaleString() + " ฿";
        document.getElementById("totalInterest").textContent = totalInterest.toLocaleString() + " ฿";
        document.getElementById("totalSum").textContent = (totalPrincipal + totalInterest).toLocaleString() + " ฿";
        document.getElementById("paidAmount").textContent = totalPaid.toLocaleString() + " ฿";
        document.getElementById("activeLoans").textContent = activeCount + " รายการ";
        document.getElementById("loanCount").textContent = allLoans.length + " รายการ";

        renderTable(allLoans);
        renderChart();

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// ============ SAVE MONTHLY DATA ============
async function saveMonthlyData(principal, interest, paid, count, active) {
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    try {
        await db.collection("monthly_reports").doc(monthKey).set({
            year: currentYear,
            month: currentMonth,
            monthName: thaiMonths[currentMonth],
            totalPrincipal: principal,
            totalInterest: interest,
            totalPaid: paid,
            loanCount: count,
            activeCount: active,
            totalSum: principal + interest,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log("✅ Monthly data saved:", monthKey);
    } catch (error) {
        console.error("❌ Save monthly data error:", error);
    }
}

// ============ RENDER TABLE (SIMPLIFIED) ============
function renderTable(loans) {
    loanTableBody.innerHTML = "";
    
    if (loans.length === 0) {
        loanTableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 30px; color: #999;">
                    ไม่มีข้อมูลเงินกู้ในเดือน ${thaiMonths[currentMonth]} ${currentYear + 543}
                </td>
            </tr>
        `;
        return;
    }

    loans.forEach((loan, index) => {
        const statusClass = getStatusClass(loan.status);
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        const total = principal + interest;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${loan.nickname || '-'}</td>
            <td>${loan.nameSurname || '-'}</td>
            <td>${formatDate(loan.loanDate)}</td>
            <td>${formatDate(loan.returnDate) || '-'}</td>
            <td class="text-right">${principal.toLocaleString()}</td>
            <td>${loan.interestType || '-'}</td>
            <td class="text-right">${interest.toLocaleString()}</td>
            <td class="text-right"><strong>${total.toLocaleString()}</strong></td>
            <td><span class="status-badge ${statusClass}">${loan.status || '-'}</span></td>
            <td>
                <button class="btn-action btn-detail" onclick="showDetail('${loan.id}')">📋 รายละเอียด</button>
                <button class="btn-action btn-edit" onclick="editLoan('${loan.id}')">✏️</button>
                <button class="btn-action btn-delete" onclick="deleteLoan('${loan.id}')">🗑️</button>
            </td>
        `;
        loanTableBody.appendChild(row);
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${parseInt(year) + 543}`;
}

function getStatusClass(status) {
    switch(status) {
        case 'คืนแล้ว':
        case 'ชำระแล้ว':
            return 'paid';
        case 'ค้างชำระ':
        case 'เกินกำหนด':
            return 'overdue';
        default:
            return 'active';
    }
}

// ============ SHOW DETAIL MODAL ============
async function showDetail(loanId) {
    const loan = allLoans.find(l => l.id === loanId);
    if (!loan) return;

    // Get customer data
    let customerData = null;
    if (loan.customerId) {
        try {
            const doc = await db.collection("customers").doc(loan.customerId).get();
            if (doc.exists) {
                customerData = doc.data();
            }
        } catch (e) {
            console.log("Could not fetch customer data");
        }
    }

    const principal = parseFloat(loan.principal) || 0;
    const interest = parseFloat(loan.interest) || 0;
    const total = principal + interest;

    document.getElementById("detailContent").innerHTML = `
        <div class="detail-section">
            <h4>👤 ข้อมูลผู้กู้</h4>
            <div class="detail-row">
                <span class="detail-label">ชื่อเล่น:</span>
                <span class="detail-value">${loan.nickname || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ชื่อ-นามสกุล:</span>
                <span class="detail-value">${loan.nameSurname || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">เลขบัตรประชาชน:</span>
                <span class="detail-value">${customerData?.idCard || loan.idCard || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">เบอร์โทรศัพท์:</span>
                <span class="detail-value">${customerData?.telephone || loan.telephone || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">วันเกิด:</span>
                <span class="detail-value">${customerData?.birthday || loan.birthday || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ที่อยู่:</span>
                <span class="detail-value">${customerData?.address || loan.address || '-'}</span>
            </div>
        </div>

        <div class="detail-section">
            <h4>💰 ข้อมูลเงินกู้ - ${thaiMonths[currentMonth]} ${currentYear + 543}</h4>
            <div class="detail-row">
                <span class="detail-label">วันที่กู้:</span>
                <span class="detail-value">${formatDate(loan.loanDate)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">วันครบกำหนด:</span>
                <span class="detail-value">${formatDate(loan.returnDate) || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">เงินต้น:</span>
                <span class="detail-value">${principal.toLocaleString()} บาท</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ประเภทดอกเบี้ย:</span>
                <span class="detail-value">${loan.interestType || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">ดอกเบี้ย:</span>
                <span class="detail-value">${interest.toLocaleString()} บาท</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">สถานะ:</span>
                <span class="detail-value">${loan.status || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">สรุป/หมายเหตุ:</span>
                <span class="detail-value">${loan.summary || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">เอกสาร:</span>
                <span class="detail-value">${loan.documents || '-'}</span>
            </div>
        </div>

        <div class="detail-total">
            <h3>💵 ยอดรวม (ต้น + ดอก)</h3>
            <p>${total.toLocaleString()} บาท</p>
        </div>
    `;

    detailModal.style.display = "block";
}

// ============ RENDER CHART ============
function renderChart() {
    const ctx = document.getElementById('loanChart');
    if (!ctx) return;

    if (loanChart) loanChart.destroy();

    // Group by day
    const dailyData = {};
    allLoans.forEach(loan => {
        if (loan.loanDate) {
            const day = loan.loanDate.split('-')[2];
            const principal = parseFloat(loan.principal) || 0;
            dailyData[day] = (dailyData[day] || 0) + principal;
        }
    });

    const labels = Object.keys(dailyData).sort((a, b) => parseInt(a) - parseInt(b));
    const values = labels.map(d => dailyData[d]);

    loanChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels.map(d => `วันที่ ${d}`),
            datasets: [{
                label: 'ยอดปล่อยกู้ (บาท)',
                data: values,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: '#2980b9',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: value => value.toLocaleString() + ' ฿'
                    }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `ยอดปล่อยกู้รายวัน - ${thaiMonths[currentMonth]} ${currentYear + 543}`
                }
            }
        }
    });
}

// ============ CRUD OPERATIONS ============
loanForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก...";

    const loanData = {
        customerId: document.getElementById("customerId").value || null,
        nickname: document.getElementById("nickname").value.trim(),
        nameSurname: document.getElementById("nameSurname").value.trim(),
        loanDate: document.getElementById("loanDate").value,
        returnDate: document.getElementById("returnDate").value,
        principal: parseFloat(document.getElementById("principal").value) || 0,
        interestType: document.getElementById("interestType").value,
        interest: parseFloat(document.getElementById("interest").value) || 0,
        status: document.getElementById("status").value,
        summary: document.getElementById("summary").value.trim(),
        documents: document.getElementById("documents").value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const editId = loanForm.dataset.editId;
        
        if (editId) {
            await db.collection("loans").doc(editId).update(loanData);
            alert("อัปเดตข้อมูลเรียบร้อยแล้ว!");
        } else {
            loanData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("loans").add(loanData);
            alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
        }

        closeModalFunc();
        loadDashboardData();

    } catch (error) {
        console.error("❌ Save error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 บันทึกข้อมูล";
    }
});

function editLoan(id) {
    const loan = allLoans.find(l => l.id === id);
    if (!loan) return;

    loadCustomers().then(() => {
        document.getElementById("customerSelect").value = loan.customerId || '';
        document.getElementById("customerId").value = loan.customerId || '';
        document.getElementById("nickname").value = loan.nickname || '';
        document.getElementById("nameSurname").value = loan.nameSurname || '';
        document.getElementById("loanDate").value = loan.loanDate || '';
        document.getElementById("returnDate").value = loan.returnDate || '';
        document.getElementById("principal").value = loan.principal || '';
        document.getElementById("interestType").value = loan.interestType || 'รายเดือน';
        document.getElementById("interest").value = loan.interest || '';
        document.getElementById("status").value = loan.status || 'กำลังผ่อน';
        document.getElementById("summary").value = loan.summary || '';
        document.getElementById("documents").value = loan.documents || '';

        loanForm.dataset.editId = id;
        document.getElementById("modalTitle").textContent = "แก้ไขข้อมูลเงินกู้";
        loanModal.style.display = "block";
    });
}

async function deleteLoan(id) {
    if (!confirm("คุณต้องการลบข้อมูลนี้หรือไม่?")) return;

    try {
        await db.collection("loans").doc(id).delete();
        alert("ลบข้อมูลเรียบร้อยแล้ว!");
        loadDashboardData();
    } catch (error) {
        console.error("❌ Delete error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

// ============ EXPORT TO EXCEL ============
function exportToExcel() {
    if (allLoans.length === 0) {
        alert("ไม่มีข้อมูลให้ Export");
        return;
    }

    const headers = [
        "No.", "Nickname", "Name-Surname", "วันที่กู้", "วันที่คืน",
        "เงินต้น", "ประเภทดอกเบี้ย", "ดอกเบี้ย", "ต้น+ดอก", "สถานะ", "สรุป", "เอกสาร"
    ];

    const rows = allLoans.map((loan, index) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        return [
            index + 1,
            loan.nickname || '',
            loan.nameSurname || '',
            loan.loanDate || '',
            loan.returnDate || '',
            principal,
            loan.interestType || '',
            interest,
            principal + interest,
            loan.status || '',
            loan.summary || '',
            loan.documents || ''
        ].map(escapeCSV).join(',');
    });

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `loan_${thaiMonths[currentMonth]}_${currentYear + 543}.csv`;
    link.click();

    console.log("✅ Excel exported");
}

function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ============ IMPORT LOAN ============
let loanImportData = [];

function openImportLoanModal() {
    const modal = document.getElementById("importLoanModal");
    if (modal) {
        modal.style.display = "block";
        resetLoanImportModal();
        setupLoanDragDrop();
    }
}

function closeImportLoanModal() {
    const modal = document.getElementById("importLoanModal");
    if (modal) {
        modal.style.display = "none";
    }
    resetLoanImportModal();
}

function resetLoanImportModal() {
    const fileInput = document.getElementById("loanFileInput");
    const stats = document.getElementById("loanImportStats");
    const preview = document.getElementById("loanImportPreview");
    const progress = document.getElementById("loanImportProgress");
    const log = document.getElementById("loanImportLog");
    const startBtn = document.getElementById("startLoanImportBtn");
    const dropZone = document.getElementById("loanDropZone");
    
    if (fileInput) fileInput.value = "";
    if (stats) stats.style.display = "none";
    if (preview) preview.style.display = "none";
    if (progress) progress.style.display = "none";
    if (log) {
        log.style.display = "none";
        log.innerHTML = "";
    }
    if (startBtn) startBtn.style.display = "none";
    if (dropZone) dropZone.style.display = "block";
    
    loanImportData = [];
}

function setupLoanDragDrop() {
    const dropZone = document.getElementById("loanDropZone");
    if (!dropZone) return;
    
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    };
    
    dropZone.ondragleave = () => {
        dropZone.classList.remove("dragover");
    };
    
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) processLoanFile(file);
    };
}

function handleLoanFileSelect(event) {
    const file = event.target.files[0];
    if (file) processLoanFile(file);
}

function processLoanFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        alert("❌ กรุณาเลือกไฟล์ .xlsx, .xls หรือ .csv เท่านั้น");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            parseLoanImportData(jsonData);
        } catch (error) {
            console.error("Error parsing file:", error);
            alert("❌ ไม่สามารถอ่านไฟล์ได้: " + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseLoanImportData(jsonData) {
    loanImportData = [];
    let validCount = 0;
    let invalidCount = 0;
    
    // Column mapping - รองรับทั้งภาษาไทยและอังกฤษ
    const columnMap = {
        nickname: ['Nickname', 'nickname', 'ชื่อเล่น'],
        nameSurname: ['Name-Surname', 'nameSurname', 'ชื่อ-นามสกุล', 'ชื่อนามสกุล'],
        loanDate: ['วันที่กู้', 'loanDate', 'LoanDate'],
        returnDate: ['วันที่คืน', 'returnDate', 'ReturnDate'],
        principal: ['เงินต้น', 'principal', 'Principal'],
        interestType: ['ประเภทดอกเบี้ย', 'interestType', 'InterestType'],
        interest: ['ดอกเบี้ย', 'interest', 'Interest'],
        status: ['สถานะ', 'status', 'Status'],
        summary: ['สรุป', 'summary', 'Summary'],
        documents: ['เอกสาร', 'documents', 'Documents']
    };
    
    function getValue(row, keys) {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return String(row[key]).trim();
            }
        }
        return '';
    }
    
    function parseNumber(val) {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }
    
    function parseDate(val) {
        if (!val) return '';
        
        // ถ้าเป็น Excel serial date
        if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        
        val = String(val).trim();
        
        // รูปแบบ YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            return val;
        }
        
        // รูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY
        const parts = val.split(/[\/\-]/);
        if (parts.length === 3) {
            let [day, month, year] = parts;
            year = parseInt(year);
            if (year > 2500) year -= 543; // แปลง พ.ศ. เป็น ค.ศ.
            if (year < 100) year += 2000; // แปลง 2 หลักเป็น 4 หลัก
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return '';
    }
    
    jsonData.forEach((row) => {
        const nickname = getValue(row, columnMap.nickname);
        const loanDate = parseDate(getValue(row, columnMap.loanDate));
        const principal = parseNumber(getValue(row, columnMap.principal));
        
        // ต้องมี nickname, loanDate และ principal
        const isValid = nickname && loanDate && principal > 0;
        
        if (isValid) {
            validCount++;
        } else {
            invalidCount++;
        }
        
        loanImportData.push({
            nickname: nickname,
            nameSurname: getValue(row, columnMap.nameSurname),
            loanDate: loanDate,
            returnDate: parseDate(getValue(row, columnMap.returnDate)),
            principal: principal,
            interestType: getValue(row, columnMap.interestType) || 'รายเดือน',
            interest: parseNumber(getValue(row, columnMap.interest)),
            status: getValue(row, columnMap.status) || 'กำลังผ่อน',
            summary: getValue(row, columnMap.summary),
            documents: getValue(row, columnMap.documents),
            isValid: isValid
        });
    });
    
    // Update stats
    document.getElementById("loanStatTotal").textContent = loanImportData.length;
    document.getElementById("loanStatValid").textContent = validCount;
    document.getElementById("loanStatInvalid").textContent = invalidCount;
    document.getElementById("loanImportStats").style.display = "grid";
    
    // Render preview
    renderLoanImportPreview();
    
    // Show import button if there's valid data
    if (validCount > 0) {
        document.getElementById("startLoanImportBtn").style.display = "inline-block";
    }
    
    document.getElementById("loanDropZone").style.display = "none";
}

function renderLoanImportPreview() {
    const tbody = document.getElementById("loanPreviewTableBody");
    tbody.innerHTML = "";
    
    loanImportData.slice(0, 50).forEach((item) => {
        const row = document.createElement("tr");
        row.style.opacity = item.isValid ? "1" : "0.5";
        row.innerHTML = `
            <td>${item.isValid ? '✅' : '⚠️'}</td>
            <td>${item.nickname || '-'}</td>
            <td>${item.nameSurname || '-'}</td>
            <td>${item.loanDate || '-'}</td>
            <td>${item.principal.toLocaleString()}</td>
            <td>${item.interest.toLocaleString()}</td>
            <td>${item.status}</td>
        `;
        tbody.appendChild(row);
    });
    
    if (loanImportData.length > 50) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="7" style="text-align:center;color:#999;">... และอีก ${loanImportData.length - 50} รายการ</td>`;
        tbody.appendChild(row);
    }
    
    document.getElementById("loanImportPreview").style.display = "block";
}

async function startLoanImport() {
    const validItems = loanImportData.filter(item => item.isValid);
    if (validItems.length === 0) {
        alert("❌ ไม่มีข้อมูลที่ถูกต้องให้ Import");
        return;
    }
    
    if (!confirm(`ยืนยันการ Import ข้อมูลเงินกู้ ${validItems.length} รายการ?`)) return;
    
    const startBtn = document.getElementById("startLoanImportBtn");
    startBtn.disabled = true;
    startBtn.textContent = "กำลัง Import...";
    document.getElementById("loanImportProgress").style.display = "block";
    document.getElementById("loanImportLog").style.display = "block";
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        
        try {
            // ค้นหา customerId จาก nickname (ถ้ามี)
            let customerId = '';
            const customerMatch = allCustomers.find(c => 
                c.nickname && c.nickname.toLowerCase() === item.nickname.toLowerCase()
            );
            if (customerMatch) {
                customerId = customerMatch.id;
            }
            
            await db.collection("loans").add({
                customerId: customerId,
                nickname: item.nickname,
                nameSurname: item.nameSurname,
                loanDate: item.loanDate,
                returnDate: item.returnDate,
                principal: item.principal,
                interestType: item.interestType,
                interest: item.interest,
                status: item.status,
                summary: item.summary,
                documents: item.documents,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            success++;
            logLoanImport(`✅ ${item.nickname} - ${item.loanDate} - ${item.principal.toLocaleString()} บาท`, 'success');
            
        } catch (error) {
            failed++;
            logLoanImport(`❌ ${item.nickname} - ${error.message}`, 'error');
        }
        
        // Update progress
        const percent = Math.round(((i + 1) / validItems.length) * 100);
        document.getElementById("loanProgressFill").style.width = percent + '%';
        document.getElementById("loanProgressFill").textContent = percent + '%';
        
        await new Promise(r => setTimeout(r, 50));
    }
    
    logLoanImport(``, '');
    logLoanImport(`🎉 Import เสร็จสิ้น! สำเร็จ ${success} รายการ, ผิดพลาด ${failed} รายการ`, 'success');
    
    startBtn.textContent = "✅ Import เสร็จสิ้น";
    
    // Reload data
    setTimeout(() => {
        loadDashboardData();
    }, 1000);
}

function logLoanImport(message, type) {
    const log = document.getElementById("loanImportLog");
    const div = document.createElement("div");
    div.className = type;
    div.textContent = message;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function downloadLoanTemplate() {
    const headers = [
        "No.", "Nickname", "Name-Surname", "วันที่กู้", "วันที่คืน",
        "เงินต้น", "ประเภทดอกเบี้ย", "ดอกเบี้ย", "ต้น+ดอก", "สถานะ", "สรุป", "เอกสาร"
    ];
    const sample = [
        "1", "ตัวอย่าง", "นายตัวอย่าง ทดสอบ", "2024-01-15", "2024-02-15",
        "10000", "รายเดือน", "500", "10500", "กำลังผ่อน", "หมายเหตุ", ""
    ];
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + sample.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'loan_template.csv';
    link.click();
}

// Handle modal click outside
window.addEventListener('click', function(e) {
    const importModal = document.getElementById("importLoanModal");
    if (e.target === importModal) {
        closeImportLoanModal();
    }
});

// ============ AUTH CHECK ============
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("👤 Logged in as:", user.email);
        document.getElementById("userEmail").textContent = user.email;
        initMonthSelector();
        loadDashboardData();
        loadCustomers();
    } else {
        window.location.href = "index.html";
    }
});
