// ============ LOAN MANAGEMENT ============
console.log("✅ loans.js loaded");

// Global Variables
let loanChart = null;
let statusLineChart = null; // กราฟเส้นแสดงสถานะรายเดือน
let allLoans = [];
let filteredLoans = []; // เก็บข้อมูลที่ filter แล้ว
let allCustomers = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let selectedLoans = new Set(); // เก็บ ID ที่เลือก
let confirmCallback = null; // Callback สำหรับ confirm modal

// Sorting & Filtering
let currentSort = { field: 'loanDate', direction: 'asc' }; // default: เรียงตามวันที่กู้ (เก่าสุดก่อน)

// Thai Month Names
const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const thaiMonthsShort = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// DOM Elements
const loanModal = document.getElementById("loanModal");
const loanForm = document.getElementById("loanForm");
const loanTableBody = document.getElementById("loanTableBody");
const detailModal = document.getElementById("detailModal");

// ============ TOAST NOTIFICATION ============
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span>${icons[type] || 'ℹ️'}</span>
        <span>${message}</span>
        <span class="close-toast" onclick="this.parentElement.remove()">×</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============ CONFIRM MODAL ============
function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'block';
    confirmCallback = onConfirm;
}

function closeConfirm() {
    document.getElementById('confirmModal').style.display = 'none';
    confirmCallback = null;
}

document.getElementById('confirmYesBtn').onclick = function() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirm();
};

// ============ CALCULATE INTEREST ============
function calculateInterest() {
    const principal = parseFloat(document.getElementById('principal').value) || 0;
    const rate = parseFloat(document.getElementById('interestRate').value) || 0;
    
    const interest = principal * (rate / 100);
    document.getElementById('interest').value = interest.toFixed(2);
    
    const total = principal + interest;
    document.getElementById('totalDisplay').value = total.toLocaleString() + ' บาท';
}

// ============ CALCULATE RETURN DATE ============
// คำนวณวันที่คืน = วันที่กู้ + 1 เดือน (จัดการวันที่พิเศษ)
function calculateReturnDate() {
    const loanDateInput = document.getElementById('loanDate');
    const returnDateInput = document.getElementById('returnDate');
    
    if (!loanDateInput.value) return;
    
    const returnDate = addOneMonthSmart(loanDateInput.value);
    returnDateInput.value = returnDate;
}

// ฟังก์ชันบวก 1 เดือนอย่างฉลาด
function addOneMonthSmart(dateStr) {
    if (!dateStr) return '';
    
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // เดือนถัดไป
        let newMonth = month + 1;
        let newYear = year;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        
        // หาวันสุดท้ายของเดือนถัดไป
        const lastDayOfNextMonth = new Date(newYear, newMonth, 0).getDate();
        
        // กรณีพิเศษ: ถ้าวันที่กู้คือ 28 หรือ 29 กุมภาพันธ์ → วันที่คืนเป็น 30 มีนาคม
        if (month === 2 && (day === 28 || day === 29)) {
            return `${newYear}-${String(newMonth).padStart(2, '0')}-30`;
        }
        
        // กรณีทั่วไป: ถ้าวันที่มากกว่าวันสุดท้ายของเดือนถัดไป ใช้วันสุดท้าย
        // เช่น 30 ม.ค. → 28/29 ก.พ.
        // เช่น 31 ม.ค. → 28/29 ก.พ.
        // เช่น 31 พ.ค. → 30 มิ.ย.
        let newDay = day;
        if (day > lastDayOfNextMonth) {
            newDay = lastDayOfNextMonth;
        }
        
        return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
        
    } catch (e) {
        console.error('addOneMonthSmart error:', e);
        return '';
    }
}

// ============ INITIALIZE ============
function initMonthSelector() {
    const monthSelect = document.getElementById("monthSelect");
    const yearSelect = document.getElementById("yearSelect");
    
    // ใช้วันที่ปัจจุบัน (อัพเดทอัตโนมัติ)
    const now = new Date();
    currentMonth = now.getMonth() + 1;
    currentYear = now.getFullYear();
    
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = thaiMonths[i];
        if (i === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    }
    
    // เพิ่มปีย้อนหลัง 5 ปี และปีถัดไป 1 ปี
    const thisYear = now.getFullYear();
    for (let y = thisYear + 1; y >= thisYear - 5; y--) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = y + 543;
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
                customerSelect.innerHTML += `<option value="${c.id}">${c.nickname} - ${c.nameSurname || ''}</option>`;
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
    
    document.getElementById("loanDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("interestRate").value = "20";
    document.getElementById("totalDisplay").value = "";
    loadCustomers();
}

function closeModalFunc() {
    loanModal.style.display = "none";
    loanForm.reset();
}

function closeDetailModal() {
    detailModal.style.display = "none";
}

window.onclick = (e) => {
    if (e.target === loanModal) closeModalFunc();
    if (e.target === detailModal) closeDetailModal();
    if (e.target === document.getElementById('confirmModal')) closeConfirm();
    if (e.target === document.getElementById('importLoanModal')) closeImportLoanModal();
};

// ============ FILTER BY MONTH ============
function filterByMonth() {
    currentMonth = parseInt(document.getElementById("monthSelect").value);
    currentYear = parseInt(document.getElementById("yearSelect").value);
    updateMonthDisplay();
    loadDashboardData();
}

// ============ LOAD ALL LOANS ============
async function loadAllLoans() {
    try {
        document.getElementById("currentMonthDisplay").textContent = "📋 ทุกเดือน";
        
        const snapshot = await db.collection("loans").orderBy("loanDate", "desc").get();
        
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

            // รองรับทั้งสถานะเก่าและใหม่
            if (data.status === "ปิดจบ" || data.status === "คืนแล้ว" || data.status === "ชำระแล้ว") {
                totalPaid += (principal + interest);
            } else {
                activeCount++;
            }
        });

        updateDashboardCards(totalPrincipal, totalInterest, totalSum, totalPaid, activeCount, allLoans.length);
        applyFilters(); // ใช้ sorting และ filtering
        renderChart();

        showToast(`โหลดข้อมูลทั้งหมด ${allLoans.length} รายการ`, 'success');

    } catch (error) {
        console.error("❌ Firebase Error:", error);
        showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
    }
}

// ============ LOAD DATA BY MONTH ============
async function loadDashboardData() {
    try {
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const endYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

        console.log(`🔍 Querying loans: ${startDate} to ${endDate}`);

        const snapshot = await db.collection("loans")
            .where("loanDate", ">=", startDate)
            .where("loanDate", "<", endDate)
            .orderBy("loanDate", "desc")
            .get();
        
        processLoanData(snapshot);

    } catch (error) {
        console.error("❌ Firebase Error:", error);
        
        if (error.code === 'failed-precondition') {
            console.log("⚠️ Index required. Loading with JS filter...");
            loadDataWithJsFilter();
        } else {
            showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
        }
    }
}

async function loadDataWithJsFilter() {
    try {
        const snapshot = await db.collection("loans").get();
        
        allLoans = [];
        let totalPrincipal = 0, totalInterest = 0, totalPaid = 0, activeCount = 0, totalSum = 0;
        
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            
            if (data.loanDate) {
                const [year, month] = data.loanDate.split('-').map(Number);
                if (year === currentYear && month === currentMonth) {
                    allLoans.push(data);
                    
                    const principal = parseFloat(data.principal) || 0;
                    const interest = parseFloat(data.interest) || 0;

                    totalPrincipal += principal;
                    totalInterest += interest;
                    totalSum += (principal + interest);

                    // รองรับทั้งสถานะเก่าและใหม่
                    if (data.status === "ปิดจบ" || data.status === "คืนแล้ว" || data.status === "ชำระแล้ว") {
                        totalPaid += (principal + interest);
                    } else {
                        activeCount++;
                    }
                }
            }
        });

        updateDashboardCards(totalPrincipal, totalInterest, totalSum, totalPaid, activeCount, allLoans.length);
        applyFilters(); // ใช้ sorting และ filtering
        renderChart();

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

function processLoanData(snapshot) {
    allLoans = [];
    let totalPrincipal = 0, totalInterest = 0, totalPaid = 0, activeCount = 0, totalSum = 0;

    snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        allLoans.push(data);

        const principal = parseFloat(data.principal) || 0;
        const interest = parseFloat(data.interest) || 0;

        totalPrincipal += principal;
        totalInterest += interest;
        totalSum += (principal + interest);

        // รองรับทั้งสถานะเก่าและใหม่
        if (data.status === "ปิดจบ" || data.status === "คืนแล้ว" || data.status === "ชำระแล้ว") {
            totalPaid += (principal + interest);
        } else {
            activeCount++;
        }
    });

    updateDashboardCards(totalPrincipal, totalInterest, totalSum, totalPaid, activeCount, allLoans.length);
    applyFilters(); // ใช้ sorting และ filtering
    renderChart();
    saveMonthlyData(totalPrincipal, totalInterest, totalPaid, allLoans.length, activeCount);

    console.log("✅ Data loaded:", allLoans.length, "records");
}

function updateDashboardCards(principal, interest, sum, paid, active, count) {
    document.getElementById("totalLoans").textContent = principal.toLocaleString() + " ฿";
    document.getElementById("totalInterest").textContent = interest.toLocaleString() + " ฿";
    document.getElementById("totalSum").textContent = sum.toLocaleString() + " ฿";
    document.getElementById("paidAmount").textContent = paid.toLocaleString() + " ฿";
    document.getElementById("activeLoans").textContent = active + " รายการ";
    document.getElementById("loanCount").textContent = count + " รายการ";
}

// ============ SORTING & FILTERING ============
function sortTable(field) {
    // Toggle direction if same field
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // Update UI
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('active-sort');
        th.querySelector('.sort-icon').textContent = '⇅';
    });
    
    const activeHeader = document.querySelector(`th.sortable[onclick="sortTable('${field}')"]`);
    if (activeHeader) {
        activeHeader.classList.add('active-sort');
        activeHeader.querySelector('.sort-icon').textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }
    
    applyFilters();
}

function applyFilters() {
    // Get filter values
    const filterNickname = document.getElementById('filterNickname')?.value.toLowerCase() || '';
    const filterName = document.getElementById('filterName')?.value.toLowerCase() || '';
    const filterLoanDate = document.getElementById('filterLoanDate')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    
    // Filter
    filteredLoans = allLoans.filter(loan => {
        if (filterNickname && !(loan.nickname || '').toLowerCase().includes(filterNickname)) return false;
        if (filterName && !(loan.nameSurname || '').toLowerCase().includes(filterName)) return false;
        if (filterLoanDate && loan.loanDate !== filterLoanDate) return false;
        if (filterStatus && loan.status !== filterStatus) return false;
        return true;
    });
    
    // Sort
    filteredLoans.sort((a, b) => {
        let valA, valB;
        
        switch (currentSort.field) {
            case 'no':
                valA = allLoans.indexOf(a);
                valB = allLoans.indexOf(b);
                break;
            case 'nickname':
                valA = (a.nickname || '').toLowerCase();
                valB = (b.nickname || '').toLowerCase();
                break;
            case 'nameSurname':
                valA = (a.nameSurname || '').toLowerCase();
                valB = (b.nameSurname || '').toLowerCase();
                break;
            case 'loanDate':
                valA = a.loanDate || '';
                valB = b.loanDate || '';
                break;
            case 'returnDate':
                valA = a.returnDate || '';
                valB = b.returnDate || '';
                break;
            case 'principal':
                valA = parseFloat(a.principal) || 0;
                valB = parseFloat(b.principal) || 0;
                break;
            case 'interest':
                valA = parseFloat(a.interest) || 0;
                valB = parseFloat(b.interest) || 0;
                break;
            case 'total':
                valA = (parseFloat(a.principal) || 0) + (parseFloat(a.interest) || 0);
                valB = (parseFloat(b.principal) || 0) + (parseFloat(b.interest) || 0);
                break;
            case 'payAmount':
                valA = calculatePayAmount(a);
                valB = calculatePayAmount(b);
                break;
            case 'status':
                valA = a.status || '';
                valB = b.status || '';
                break;
            default:
                valA = a.loanDate || '';
                valB = b.loanDate || '';
        }
        
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderTable(filteredLoans);
}

function clearFilters() {
    document.getElementById('filterNickname').value = '';
    document.getElementById('filterName').value = '';
    document.getElementById('filterLoanDate').value = '';
    document.getElementById('filterStatus').value = '';
    
    applyFilters();
    showToast('ล้าง Filter แล้ว', 'info');
}

// ============ CALCULATE PAY AMOUNT ============
// คำนวณยอดจ่ายตามสถานะ
function calculatePayAmount(loan) {
    const principal = parseFloat(loan.principal) || 0;
    const interest = parseFloat(loan.interest) || 0;
    const status = loan.status || 'ว่าง';
    
    // ถ้ามี payAmount ที่บันทึกไว้แล้ว (กรณี ต้น+ดอก ที่ใส่เอง)
    if (loan.payAmount !== undefined && loan.payAmount !== null && status === 'ต้น+ดอก') {
        return parseFloat(loan.payAmount) || 0;
    }
    
    switch (status) {
        case 'ว่าง':
            return 0;
        case 'ดอก':
            return interest; // จ่ายแค่ดอกเบี้ย
        case 'ต้น+ดอก':
            return principal + interest; // default ถ้ายังไม่ได้ใส่
        case 'ปิดจบ':
            // ต้น + ดอก 15%
            return principal + (principal * 0.15);
        default:
            return 0;
    }
}

// ============ RENDER TABLE ============
function renderTable(loans) {
    loanTableBody.innerHTML = "";
    selectedLoans.clear();
    updateBulkActions();

    if (loans.length === 0) {
        loanTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 30px; color: #999;">
                    ไม่มีข้อมูลเงินกู้ที่ตรงกับเงื่อนไข
                </td>
            </tr>
        `;
        return;
    }

    loans.forEach((loan, index) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        const total = principal + interest;
        const payAmount = calculatePayAmount(loan);
        const status = loan.status || 'ว่าง';
        
        const statusClass = getStatusClass(status);
        
        // สร้าง HTML สำหรับยอดจ่าย
        let payAmountHtml = '';
        if (status === 'ต้น+ดอก') {
            // แสดงเป็น input ให้แก้ไขได้
            payAmountHtml = `<input type="number" class="pay-amount-input" value="${payAmount}" 
                onchange="updatePayAmount('${loan.id}', this.value)">`;
        } else if (status === 'ว่าง') {
            payAmountHtml = '<span class="text-muted">-</span>';
        } else {
            payAmountHtml = `<strong class="text-success">${payAmount.toLocaleString()}</strong>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="col-checkbox"><input type="checkbox" class="row-checkbox" data-id="${loan.id}" onchange="toggleSelection('${loan.id}')"></td>
            <td class="col-no">${index + 1}</td>
            <td class="col-nickname"><strong>${loan.nickname || '-'}</strong></td>
            <td class="col-name">${loan.nameSurname || '-'}</td>
            <td class="col-date">${formatDate(loan.loanDate)}</td>
            <td class="col-date">${formatDate(loan.returnDate)}</td>
            <td class="col-money text-right">${principal.toLocaleString()}</td>
            <td class="col-money text-right">${interest.toLocaleString()}</td>
            <td class="col-money text-right"><strong>${total.toLocaleString()}</strong></td>
            <td class="col-money text-right">${payAmountHtml}</td>
            <td class="col-status"><span class="status-badge ${statusClass}">${status}</span></td>
            <td class="col-action">
                <button class="btn-action btn-detail" onclick="viewLoanDetail('${loan.id}')" title="รายละเอียด">👁️</button>
                <button class="btn-action btn-edit" onclick="editLoan('${loan.id}')" title="แก้ไข">✏️</button>
                <button class="btn-action btn-delete" onclick="deleteLoan('${loan.id}')" title="ลบ">🗑️</button>
            </td>
        `;
        loanTableBody.appendChild(row);
    });
}

// อัพเดทยอดจ่าย (สำหรับสถานะ ต้น+ดอก)
async function updatePayAmount(loanId, value) {
    try {
        const payAmount = parseFloat(value) || 0;
        await db.collection("loans").doc(loanId).update({
            payAmount: payAmount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // อัพเดท allLoans
        const loan = allLoans.find(l => l.id === loanId);
        if (loan) {
            loan.payAmount = payAmount;
        }
        
        showToast('บันทึกยอดจ่ายเรียบร้อย', 'success');
    } catch (error) {
        console.error("Error updating pay amount:", error);
        showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

function getStatusClass(status) {
    const classes = {
        // สถานะใหม่
        'ว่าง': 'status-empty',
        'ดอก': 'status-interest',
        'ต้น+ดอก': 'status-principal',
        'ปิดจบ': 'status-closed',
        // สถานะเก่า (สำหรับ backward compatibility)
        'กำลังผ่อน': 'status-interest',
        'ค้างชำระ': 'status-principal',
        'เกินกำหนด': 'status-principal',
        'คืนแล้ว': 'status-closed',
        'ชำระแล้ว': 'status-closed'
    };
    return classes[status] || 'status-empty';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${parseInt(year) + 543}`;
    } catch {
        return dateStr;
    }
}

// ============ BULK SELECTION ============
function toggleSelection(id) {
    if (selectedLoans.has(id)) {
        selectedLoans.delete(id);
    } else {
        selectedLoans.add(id);
    }
    updateBulkActions();
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.row-checkbox[data-id]');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const id = cb.dataset.id;
        if (selectAll.checked) {
            selectedLoans.add(id);
        } else {
            selectedLoans.delete(id);
        }
    });
    
    updateBulkActions();
}

function clearSelection() {
    selectedLoans.clear();
    document.getElementById('selectAll').checked = false;
    document.querySelectorAll('.row-checkbox[data-id]').forEach(cb => cb.checked = false);
    updateBulkActions();
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const count = selectedLoans.size;
    
    if (count > 0) {
        bulkActions.classList.add('show');
        document.getElementById('selectedCount').textContent = count;
    } else {
        bulkActions.classList.remove('show');
    }
}

// ============ CREATE NEXT MONTH LOAN ============
// สร้าง loan เดือนถัดไปอัตโนมัติสำหรับสถานะ "ดอก"
async function createNextMonthLoan(loan) {
    try {
        // คำนวณวันที่กู้ใหม่ = วันที่คืนเดิม
        const newLoanDate = loan.returnDate;
        if (!newLoanDate) {
            console.log("ไม่มีวันที่คืน ไม่สร้าง loan เดือนหน้า");
            return null;
        }
        
        // คำนวณวันที่คืนใหม่ = วันที่กู้ใหม่ + 1 เดือน
        const newReturnDate = addOneMonthSmart(newLoanDate);
        
        // ตรวจสอบว่ามี loan ในเดือนนั้นแล้วหรือยัง
        const [year, month] = newLoanDate.split('-');
        const monthStart = `${year}-${month}-01`;
        const monthEnd = `${year}-${month}-31`;
        
        const existingLoan = await db.collection("loans")
            .where("nickname", "==", loan.nickname)
            .where("loanDate", ">=", monthStart)
            .where("loanDate", "<=", monthEnd)
            .get();
        
        if (!existingLoan.empty) {
            console.log(`มี loan ของ ${loan.nickname} ในเดือน ${month}/${year} แล้ว ไม่สร้างซ้ำ`);
            return null;
        }
        
        // สร้าง loan ใหม่
        const newLoan = {
            customerId: loan.customerId || '',
            nickname: loan.nickname,
            nameSurname: loan.nameSurname || '',
            idCard: loan.idCard || '',
            telephone: loan.telephone || '',
            birthday: loan.birthday || '',
            address: loan.address || '',
            loanDate: newLoanDate,
            returnDate: newReturnDate,
            principal: loan.principal,
            interestType: loan.interestType || 'รายเดือน',
            interestRate: loan.interestRate || 20,
            interest: loan.interest,
            status: 'ว่าง', // สถานะเริ่มต้นเป็น "ว่าง"
            summary: `ต่อจากเดือนก่อน (${loan.nickname})`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection("loans").add(newLoan);
        console.log(`✅ สร้าง loan เดือนหน้าสำหรับ ${loan.nickname} สำเร็จ (ID: ${docRef.id})`);
        return docRef.id;
        
    } catch (error) {
        console.error("Error creating next month loan:", error);
        return null;
    }
}

// ============ BULK OPERATIONS ============
async function bulkChangeStatus(newStatus) {
    if (selectedLoans.size === 0) return;
    
    let confirmMessage = `ต้องการเปลี่ยนสถานะ ${selectedLoans.size} รายการเป็น "${newStatus}" หรือไม่?`;
    if (newStatus === 'ดอก') {
        confirmMessage += '\n\n💡 ระบบจะสร้างรายการเดือนถัดไปให้อัตโนมัติ';
    }
    
    showConfirm(
        'เปลี่ยนสถานะ',
        confirmMessage,
        async () => {
            try {
                const batch = db.batch();
                let loansToCreateNextMonth = [];
                
                // เก็บ loan ที่ต้องสร้างเดือนหน้า
                if (newStatus === 'ดอก') {
                    selectedLoans.forEach(id => {
                        const loan = allLoans.find(l => l.id === id);
                        if (loan) {
                            loansToCreateNextMonth.push(loan);
                        }
                    });
                }
                
                // อัพเดทสถานะ
                selectedLoans.forEach(id => {
                    const ref = db.collection("loans").doc(id);
                    batch.update(ref, { status: newStatus });
                });
                
                await batch.commit();
                
                // สร้าง loan เดือนหน้า
                let createdCount = 0;
                if (newStatus === 'ดอก') {
                    for (const loan of loansToCreateNextMonth) {
                        const result = await createNextMonthLoan(loan);
                        if (result) createdCount++;
                    }
                }
                
                let message = `เปลี่ยนสถานะ ${selectedLoans.size} รายการเรียบร้อย`;
                if (createdCount > 0) {
                    message += ` และสร้างรายการเดือนหน้า ${createdCount} รายการ`;
                }
                
                showToast(message, 'success');
                clearSelection();
                loadDashboardData();
                
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
            }
        }
    );
}

async function bulkDelete() {
    if (selectedLoans.size === 0) return;
    
    showConfirm(
        '⚠️ ยืนยันการลบ',
        `ต้องการลบข้อมูล ${selectedLoans.size} รายการ? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        async () => {
            try {
                const batch = db.batch();
                
                selectedLoans.forEach(id => {
                    const ref = db.collection("loans").doc(id);
                    batch.delete(ref);
                });
                
                await batch.commit();
                
                showToast(`ลบข้อมูล ${selectedLoans.size} รายการเรียบร้อย`, 'success');
                clearSelection();
                loadDashboardData();
                
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
            }
        }
    );
}

// ============ CRUD OPERATIONS ============
loanForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก...";

    const loanData = {
        customerId: document.getElementById("customerId").value || '',
        nickname: document.getElementById("nickname").value.trim(),
        nameSurname: document.getElementById("nameSurname").value.trim(),
        loanDate: document.getElementById("loanDate").value,
        returnDate: document.getElementById("returnDate").value,
        principal: parseFloat(document.getElementById("principal").value) || 0,
        interestType: document.getElementById("interestType").value,
        interestRate: parseFloat(document.getElementById("interestRate").value) || 0,
        interest: parseFloat(document.getElementById("interest").value) || 0,
        status: document.getElementById("status").value,
        summary: document.getElementById("summary").value.trim(),
        documents: document.getElementById("documents").value.trim()
    };

    try {
        const editId = loanForm.dataset.editId;
        
        if (editId) {
            // ดึง loan เดิมเพื่อเช็คว่าสถานะเปลี่ยนเป็น "ดอก" หรือไม่
            const oldLoan = allLoans.find(l => l.id === editId);
            const wasNotDok = oldLoan && oldLoan.status !== 'ดอก';
            const isNowDok = loanData.status === 'ดอก';
            
            await db.collection("loans").doc(editId).update(loanData);
            
            // ถ้าเปลี่ยนจากสถานะอื่นเป็น "ดอก" ให้สร้าง loan เดือนหน้า
            if (wasNotDok && isNowDok) {
                const loanWithId = { ...loanData, id: editId };
                const created = await createNextMonthLoan(loanWithId);
                if (created) {
                    showToast("อัปเดตข้อมูลเรียบร้อย และสร้างรายการเดือนหน้าแล้ว", 'success');
                } else {
                    showToast("อัปเดตข้อมูลเรียบร้อยแล้ว", 'success');
                }
            } else {
                showToast("อัปเดตข้อมูลเรียบร้อยแล้ว", 'success');
            }
        } else {
            loanData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("loans").add(loanData);
            
            // ถ้าเพิ่มใหม่และสถานะเป็น "ดอก" ให้สร้าง loan เดือนหน้า
            if (loanData.status === 'ดอก') {
                const loanWithId = { ...loanData, id: docRef.id };
                const created = await createNextMonthLoan(loanWithId);
                if (created) {
                    showToast("เพิ่มข้อมูลเงินกู้เรียบร้อย และสร้างรายการเดือนหน้าแล้ว", 'success');
                } else {
                    showToast("เพิ่มข้อมูลเงินกู้เรียบร้อยแล้ว", 'success');
                }
            } else {
                showToast("เพิ่มข้อมูลเงินกู้เรียบร้อยแล้ว", 'success');
            }
        }

        closeModalFunc();
        loadDashboardData();

    } catch (error) {
        showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 บันทึกข้อมูล";
    }
});

function editLoan(id) {
    const loan = allLoans.find(l => l.id === id);
    if (!loan) return;

    document.getElementById("nickname").value = loan.nickname || '';
    document.getElementById("nameSurname").value = loan.nameSurname || '';
    document.getElementById("customerId").value = loan.customerId || '';
    document.getElementById("loanDate").value = loan.loanDate || '';
    document.getElementById("returnDate").value = loan.returnDate || '';
    document.getElementById("principal").value = loan.principal || '';
    document.getElementById("interestType").value = loan.interestType || 'รายเดือน';
    document.getElementById("interestRate").value = loan.interestRate || 20;
    document.getElementById("interest").value = loan.interest || '';
    document.getElementById("status").value = loan.status || 'กำลังผ่อน';
    document.getElementById("summary").value = loan.summary || '';
    document.getElementById("documents").value = loan.documents || '';

    calculateInterest();
    
    loanForm.dataset.editId = id;
    document.getElementById("modalTitle").textContent = "แก้ไขข้อมูลเงินกู้";
    loanModal.style.display = "block";
    loadCustomers();
}

function deleteLoan(id) {
    const loan = allLoans.find(l => l.id === id);
    if (!loan) return;

    showConfirm(
        '⚠️ ยืนยันการลบ',
        `ต้องการลบข้อมูลเงินกู้ของ "${loan.nickname}" หรือไม่?`,
        async () => {
            try {
                await db.collection("loans").doc(id).delete();
                showToast("ลบข้อมูลเรียบร้อยแล้ว", 'success');
                loadDashboardData();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
            }
        }
    );
}

function viewLoanDetail(id) {
    const loan = allLoans.find(l => l.id === id);
    if (!loan) return;

    const principal = parseFloat(loan.principal) || 0;
    const interest = parseFloat(loan.interest) || 0;

    document.getElementById("detailContent").innerHTML = `
        <div style="display: grid; gap: 15px;">
            <div style="padding: 15px; background: #f8f9fa; border-radius: 10px;">
                <h4 style="color: #007bff; margin-bottom: 10px;">👤 ข้อมูลผู้กู้</h4>
                <p><strong>ชื่อเล่น:</strong> ${loan.nickname || '-'}</p>
                <p><strong>ชื่อ-นามสกุล:</strong> ${loan.nameSurname || '-'}</p>
            </div>
            <div style="padding: 15px; background: #f0fff0; border-radius: 10px;">
                <h4 style="color: #28a745; margin-bottom: 10px;">💰 ข้อมูลเงินกู้</h4>
                <p><strong>วันที่กู้:</strong> ${formatDate(loan.loanDate)}</p>
                <p><strong>วันที่คืน:</strong> ${formatDate(loan.returnDate)}</p>
                <p><strong>เงินต้น:</strong> ${principal.toLocaleString()} บาท</p>
                <p><strong>ประเภทดอกเบี้ย:</strong> ${loan.interestType || '-'}</p>
                <p><strong>อัตราดอกเบี้ย:</strong> ${loan.interestRate || 0}%</p>
                <p><strong>ดอกเบี้ย:</strong> ${interest.toLocaleString()} บาท</p>
                <p style="font-size: 1.2rem; color: #007bff;"><strong>ยอดรวม:</strong> ${(principal + interest).toLocaleString()} บาท</p>
            </div>
            <div style="padding: 15px; background: #fff8e1; border-radius: 10px;">
                <h4 style="color: #ff9800; margin-bottom: 10px;">📋 สถานะ</h4>
                <p><strong>สถานะ:</strong> <span class="status-badge ${getStatusClass(loan.status)}">${loan.status || '-'}</span></p>
                <p><strong>หมายเหตุ:</strong> ${loan.summary || '-'}</p>
                <p><strong>เอกสาร:</strong> ${loan.documents || '-'}</p>
            </div>
        </div>
    `;

    detailModal.style.display = "block";
}

// ============ CHART ============
function renderChart() {
    const ctx = document.getElementById('loanChart');
    if (!ctx) return;
    
    if (loanChart) {
        loanChart.destroy();
    }

    // Group by status
    const statusCount = {
        'ว่าง': 0,
        'ดอก': 0,
        'ต้น+ดอก': 0,
        'ปิดจบ': 0
    };
    
    allLoans.forEach(loan => {
        const status = loan.status || 'ว่าง';
        if (statusCount[status] !== undefined) {
            statusCount[status]++;
        } else {
            statusCount['ว่าง']++;
        }
    });

    const labels = Object.keys(statusCount);
    const data = Object.values(statusCount);
    const colors = ['#6c757d', '#ffc107', '#dc3545', '#28a745']; // เทา, เหลือง, แดง, เขียว

    loanChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 } }
                }
            }
        }
    });
    
    // เรียก render กราฟเส้น
    renderStatusLineChart();
}

// ============ STATUS LINE CHART ============
async function renderStatusLineChart() {
    const ctx = document.getElementById('statusLineChart');
    if (!ctx) return;
    
    if (statusLineChart) {
        statusLineChart.destroy();
    }
    
    try {
        // ดึงข้อมูลย้อนหลัง 6 เดือน
        const now = new Date();
        const labels = [];
        const dataEmpty = [];  // ว่าง
        const dataInterest = []; // ดอก
        const dataPrincipal = []; // ต้น+ดอก
        const dataClosed = []; // ปิดจบ
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            labels.push(`${thaiMonthsShort[month]} ${(year + 543) % 100}`);
            
            // นับจำนวนแต่ละสถานะในเดือนนั้น
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            
            let empty = 0, interest = 0, principal = 0, closed = 0;
            
            // Query loans for this month
            const snapshot = await db.collection("loans")
                .where("loanDate", ">=", `${monthStr}-01`)
                .where("loanDate", "<=", `${monthStr}-31`)
                .get();
            
            snapshot.forEach(doc => {
                const status = doc.data().status || 'ว่าง';
                if (status === 'ว่าง') empty++;
                else if (status === 'ดอก' || status === 'กำลังผ่อน') interest++;
                else if (status === 'ต้น+ดอก' || status === 'ค้างชำระ' || status === 'เกินกำหนด') principal++;
                else if (status === 'ปิดจบ' || status === 'ชำระแล้ว' || status === 'คืนแล้ว') closed++;
                else empty++;
            });
            
            dataEmpty.push(empty);
            dataInterest.push(interest);
            dataPrincipal.push(principal);
            dataClosed.push(closed);
        }
        
        statusLineChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'ว่าง',
                        data: dataEmpty,
                        borderColor: '#6c757d',
                        backgroundColor: 'rgba(108,117,125,0.1)',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'ดอก',
                        data: dataInterest,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255,193,7,0.1)',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'ต้น+ดอก',
                        data: dataPrincipal,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220,53,69,0.1)',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'ปิดจบ',
                        data: dataClosed,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40,167,69,0.1)',
                        fill: false,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 10 }, boxWidth: 12 }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("Error rendering status line chart:", error);
    }
}

// ============ SAVE MONTHLY DATA ============
async function saveMonthlyData(principal, interest, paid, count, active) {
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    // นับจำนวนแต่ละสถานะ
    let statusCounts = { 'ว่าง': 0, 'ดอก': 0, 'ต้น+ดอก': 0, 'ปิดจบ': 0 };
    allLoans.forEach(loan => {
        const status = loan.status || 'ว่าง';
        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
        }
    });
    
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
            statusCounts: statusCounts, // เก็บจำนวนแต่ละสถานะ
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Save monthly error:", error);
    }
}

// ============ EXPORT TO EXCEL ============
function exportToExcel() {
    if (allLoans.length === 0) {
        showToast("ไม่มีข้อมูลให้ Export", 'warning');
        return;
    }

    const headers = [
        "No.", "Nickname", "Name-Surname", "วันที่กู้", "วันที่คืน",
        "เงินต้น", "ประเภทดอกเบี้ย", "ดอกเบี้ย(%)", "ดอกเบี้ย", "ต้น+ดอก", "สถานะ", "สรุป", "เอกสาร"
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
            loan.interestRate || 0,
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

    showToast("Export ข้อมูลเรียบร้อย", 'success');
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
    if (log) { log.style.display = "none"; log.innerHTML = ""; }
    if (startBtn) { startBtn.style.display = "none"; startBtn.disabled = false; startBtn.textContent = "🚀 เริ่ม Import ข้อมูล"; }
    if (dropZone) dropZone.style.display = "block";
    
    loanImportData = [];
}

function setupLoanDragDrop() {
    const dropZone = document.getElementById("loanDropZone");
    if (!dropZone) return;
    
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add("dragover"); };
    dropZone.ondragleave = () => { dropZone.classList.remove("dragover"); };
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
        showToast("กรุณาเลือกไฟล์ .xlsx, .xls หรือ .csv", 'error');
        return;
    }
    
    const reader = new FileReader();
    
    if (ext === 'csv') {
        reader.onload = (e) => {
            try {
                let csvText = e.target.result;
                if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.substring(1);
                csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                
                const workbook = XLSX.read(csvText, { type: 'string' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // ใช้ raw: true เพื่อให้ได้ค่าดิบ
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });
                
                console.log("📂 CSV Data sample:", jsonData.slice(0, 3));
                parseLoanImportData(jsonData);
            } catch (error) {
                console.error("CSV Error:", error);
                showToast("ไม่สามารถอ่านไฟล์ CSV ได้: " + error.message, 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
    } else {
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // ไม่ใช้ cellDates เพื่อให้ได้ค่า serial number ดิบ
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // ใช้ raw: true เพื่อให้ได้ค่าดิบ (serial number สำหรับวันที่)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });
                
                console.log("📂 Excel Data sample:", jsonData.slice(0, 3));
                parseLoanImportData(jsonData);
            } catch (error) {
                console.error("Excel Error:", error);
                showToast("ไม่สามารถอ่านไฟล์ได้: " + error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

function parseLoanImportData(jsonData) {
    loanImportData = [];
    let validCount = 0, invalidCount = 0;
    
    // Debug: แสดง column names ที่พบ
    if (jsonData.length > 0) {
        console.log("📋 Columns found:", Object.keys(jsonData[0]));
        console.log("📋 First row data:", jsonData[0]);
    }
    
    const columnMap = {
        nickname: ['Nickname', 'nickname', 'ชื่อเล่น', 'ชื่อ'],
        nameSurname: ['Name-Surname', 'nameSurname', 'ชื่อ-นามสกุล', 'ชื่อนามสกุล', 'ชื่อ-สกุล'],
        loanDate: ['วันที่กู้', 'loanDate', 'วันกู้', 'วันที่'],
        returnDate: ['วันที่คืน', 'returnDate', 'วันคืน', 'กำหนดคืน'],
        principal: ['เงินต้น', 'principal', 'ยอดกู้', 'จำนวนเงิน'],
        interestRate: ['ดอกเบี้ย(%)', 'interestRate', 'อัตราดอกเบี้ย', 'อัตรา%', 'อัตรา', 'ประเภทดอกเบี้ย'],
        interest: ['ดอกเบี้ย', 'interest'],
        interestType: ['ประเภทดอกเบี้ย', 'interestType'],
        status: ['สถานะ', 'status'],
        summary: ['สรุป', 'summary', 'หมายเหตุ'],
        documents: ['เอกสาร', 'documents']
    };
    
    function getValue(row, keys) {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return row[key];
            }
        }
        return '';
    }
    
    function parseNumber(val) {
        if (!val) return 0;
        return parseFloat(String(val).replace(/,/g, '')) || 0;
    }
    
    // ✅ ฟังก์ชันแปลงวันที่ - รองรับ Excel Serial Number
    function parseDate(val) {
        if (!val && val !== 0) return '';
        
        console.log(`📅 parseDate input:`, val, `type:`, typeof val);
        
        // ถ้าเป็น Date object
        if (val instanceof Date) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            console.log(`📅 Date object → ${y}-${m}-${d}`);
            return `${y}-${m}-${d}`;
        }
        
        // ✅ Excel serial number (ตัวเลข เช่น 45992 = 1/12/2025)
        if (typeof val === 'number' && val > 25569) {
            // Excel epoch: 30 Dec 1899 = 0
            // JavaScript epoch: 1 Jan 1970 = 0
            // Difference: 25569 days
            const utc_days = Math.floor(val - 25569);
            const utc_value = utc_days * 86400; // seconds
            const date_info = new Date(utc_value * 1000);
            
            const y = date_info.getUTCFullYear();
            const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date_info.getUTCDate()).padStart(2, '0');
            
            console.log(`📅 Excel serial ${val} → ${y}-${m}-${d}`);
            return `${y}-${m}-${d}`;
        }
        
        val = String(val).trim();
        
        // รูปแบบ YYYY-MM-DD
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(val)) {
            const [y, m, d] = val.split('-');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        
        // รูปแบบ D/M/YYYY หรือ DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
            const parts = val.split('/');
            let [day, month, year] = parts.map(p => parseInt(p.trim()));
            
            // ถ้า day > 12 แน่นอนว่าเป็น DD/MM/YYYY
            // ถ้า month > 12 แน่นอนว่าเป็น MM/DD/YYYY
            // ถ้าทั้งคู่ <= 12 สมมติเป็น D/M/YYYY (แบบไทย)
            if (day > 12 && month <= 12) {
                // ปกติ DD/MM/YYYY
            } else if (month > 12 && day <= 12) {
                // MM/DD/YYYY - สลับ
                [day, month] = [month, day];
            }
            // ถ้าทั้งคู่ <= 12 ใช้ค่าเดิม (D/M/YYYY)
            
            if (year > 2500) year -= 543;
            
            const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            console.log(`📅 Parsed "${val}" → ${result}`);
            return result;
        }
        
        // รูปแบบ DD-MM-YYYY หรือ DD.MM.YYYY
        const parts = val.split(/[\-\.]/);
        if (parts.length === 3) {
            let [day, month, year] = parts.map(p => parseInt(p.trim()));
            if (year > 2500) year -= 543;
            if (year < 100) year += 2000;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        console.log(`⚠️ Cannot parse date: "${val}"`);
        return '';
    }
    
    // ✅ ฟังก์ชันคำนวณวันที่คืน = วันที่กู้ + 1 เดือน (จัดการวันที่พิเศษ)
    function addOneMonth(dateStr) {
        if (!dateStr) return '';
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            
            // เดือนถัดไป
            let newMonth = month + 1;
            let newYear = year;
            
            if (newMonth > 12) {
                newMonth = 1;
                newYear++;
            }
            
            // หาวันสุดท้ายของเดือนถัดไป
            const lastDayOfNextMonth = new Date(newYear, newMonth, 0).getDate();
            
            // กรณีพิเศษ: ถ้าวันที่กู้คือ 28 หรือ 29 กุมภาพันธ์ → วันที่คืนเป็น 30 มีนาคม
            if (month === 2 && (day === 28 || day === 29)) {
                return `${newYear}-${String(newMonth).padStart(2, '0')}-30`;
            }
            
            // กรณีทั่วไป: ถ้าวันที่มากกว่าวันสุดท้ายของเดือนถัดไป ใช้วันสุดท้าย
            let newDay = day;
            if (day > lastDayOfNextMonth) {
                newDay = lastDayOfNextMonth;
            }
            
            return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
        } catch (e) {
            console.error('addOneMonth error:', e);
            return '';
        }
    }
    
    // ✅ ฟังก์ชันแปลงสถานะ
    function mapStatus(val) {
        if (!val) return 'ว่าง'; // default เป็น "ว่าง"
        val = String(val).trim().toLowerCase();
        
        // แปลงสถานะเก่าเป็นใหม่
        if (val.includes('ปิด') || val.includes('จบ') || val.includes('คืน') || val.includes('ชำระแล้ว')) {
            return 'ปิดจบ';
        }
        if (val.includes('ต้น') || val.includes('เกิน') || val.includes('ค้าง')) {
            return 'ต้น+ดอก';
        }
        if (val.includes('ดอก') || val.includes('กำลัง') || val.includes('ผ่อน')) {
            return 'ดอก';
        }
        if (val.includes('ว่าง')) {
            return 'ว่าง';
        }
        return 'ว่าง'; // default เป็น "ว่าง"
    }
    
    jsonData.forEach((row, index) => {
        const nickname = String(getValue(row, columnMap.nickname) || '').trim();
        const rawLoanDate = getValue(row, columnMap.loanDate);
        let loanDate = parseDate(rawLoanDate);
        const principal = parseNumber(getValue(row, columnMap.principal));
        
        // Debug: แสดงค่าวันที่ดิบ
        if (index < 5) {
            console.log(`📝 Row ${index + 1}: rawLoanDate =`, rawLoanDate, `(${typeof rawLoanDate}) → parsed =`, loanDate);
        }
        
        // อัตราดอกเบี้ย - ถ้าไม่ระบุใช้ 20% เป็น default
        let interestRateVal = getValue(row, columnMap.interestRate);
        if (typeof interestRateVal === 'string') {
            interestRateVal = interestRateVal.replace('%', '').trim();
        }
        const interestRate = parseNumber(interestRateVal) || 20;
        
        // ✅ คำนวณดอกเบี้ยอัตโนมัติ: เงินต้น × อัตราดอกเบี้ย%
        const interest = principal * (interestRate / 100);
        
        // ✅ คำนวณวันที่คืน = วันที่กู้ + 1 เดือน
        const returnDate = addOneMonth(loanDate);
        
        // ✅ แปลงสถานะ
        const status = mapStatus(getValue(row, columnMap.status));
        
        // ต้องมี nickname และ principal > 0 (ถ้าไม่มีวันที่จะ invalid)
        const isValid = nickname && loanDate && principal > 0;
        
        if (isValid) validCount++;
        else invalidCount++;
        
        // Debug first 5 rows
        if (index < 5) {
            console.log(`📝 Row ${index + 1}:`, { nickname, loanDate, returnDate, principal, interestRate, interest, status, isValid });
        }
        
        loanImportData.push({
            nickname, 
            nameSurname: String(getValue(row, columnMap.nameSurname) || '').trim(),
            loanDate,
            returnDate, // ✅ คำนวณอัตโนมัติ
            principal, 
            interestRate,
            interest,
            interestType: 'รายเดือน',
            status, // ✅ สถานะใหม่: ดอก, ต้น+ดอก, ปิดจบ
            summary: String(getValue(row, columnMap.summary) || '').trim(),
            documents: String(getValue(row, columnMap.documents) || '').trim(),
            isValid
        });
    });
    
    document.getElementById("loanStatTotal").textContent = loanImportData.length;
    document.getElementById("loanStatValid").textContent = validCount;
    document.getElementById("loanStatInvalid").textContent = invalidCount;
    document.getElementById("loanImportStats").style.display = "grid";
    
    renderLoanImportPreview();
    
    if (validCount > 0) {
        document.getElementById("startLoanImportBtn").style.display = "inline-block";
    }
    
    document.getElementById("loanDropZone").style.display = "none";
}

function renderLoanImportPreview() {
    const tbody = document.getElementById("loanPreviewTableBody");
    tbody.innerHTML = "";
    
    loanImportData.slice(0, 50).forEach(item => {
        const total = item.principal + item.interest;
        const row = document.createElement("tr");
        row.style.opacity = item.isValid ? "1" : "0.5";
        row.innerHTML = `
            <td>${item.isValid ? '✅' : '⚠️'}</td>
            <td>${item.nickname || '-'}</td>
            <td>${item.nameSurname || '-'}</td>
            <td style="${!item.loanDate ? 'color:#dc3545' : ''}">${formatDateThai(item.loanDate) || '-'}</td>
            <td style="color:#17a2b8">${formatDateThai(item.returnDate) || '-'}</td>
            <td style="text-align:right">${item.principal.toLocaleString()}</td>
            <td style="text-align:center;color:#28a745">${item.interestRate}%</td>
            <td style="text-align:right;color:#007bff">${item.interest.toLocaleString()}</td>
            <td style="text-align:right;font-weight:bold">${total.toLocaleString()}</td>
            <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    if (loanImportData.length > 50) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="10" style="text-align:center;color:#999;">... และอีก ${loanImportData.length - 50} รายการ</td>`;
        tbody.appendChild(row);
    }
    
    document.getElementById("loanImportPreview").style.display = "block";
}

// ฟังก์ชันแสดงวันที่แบบไทย
function formatDateThai(dateStr) {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${parseInt(year) + 543}`;
    } catch {
        return dateStr;
    }
}

async function startLoanImport() {
    const validItems = loanImportData.filter(item => item.isValid);
    if (validItems.length === 0) {
        showToast("ไม่มีข้อมูลที่ถูกต้องให้ Import", 'error');
        return;
    }
    
    showConfirm(
        'ยืนยันการ Import',
        `ต้องการ Import ข้อมูลเงินกู้ ${validItems.length} รายการ?`,
        async () => {
            const startBtn = document.getElementById("startLoanImportBtn");
            startBtn.disabled = true;
            startBtn.textContent = "กำลัง Import...";
            document.getElementById("loanImportProgress").style.display = "block";
            document.getElementById("loanImportLog").style.display = "block";
            
            let success = 0, failed = 0;
            
            for (let i = 0; i < validItems.length; i++) {
                const item = validItems[i];
                
                try {
                    let customerId = '';
                    const match = allCustomers.find(c => c.nickname && c.nickname.toLowerCase() === item.nickname.toLowerCase());
                    if (match) customerId = match.id;
                    
                    await db.collection("loans").add({
                        customerId,
                        nickname: item.nickname,
                        nameSurname: item.nameSurname,
                        loanDate: item.loanDate,
                        returnDate: item.returnDate,
                        principal: item.principal,
                        interestType: item.interestType,
                        interestRate: item.interestRate,
                        interest: item.interest,
                        status: item.status,
                        summary: item.summary,
                        documents: item.documents,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    success++;
                    logLoanImport(`✅ ${item.nickname} - ${item.principal.toLocaleString()} บาท`, 'success');
                    
                } catch (error) {
                    failed++;
                    logLoanImport(`❌ ${item.nickname} - ${error.message}`, 'error');
                }
                
                const percent = Math.round(((i + 1) / validItems.length) * 100);
                document.getElementById("loanProgressFill").style.width = percent + '%';
                document.getElementById("loanProgressFill").textContent = percent + '%';
                
                await new Promise(r => setTimeout(r, 50));
            }
            
            logLoanImport(`🎉 Import เสร็จสิ้น! สำเร็จ ${success}, ผิดพลาด ${failed}`, 'success');
            startBtn.textContent = "✅ Import เสร็จสิ้น";
            
            showToast(`Import สำเร็จ ${success} รายการ`, 'success');
            
            setTimeout(() => loadDashboardData(), 1000);
        }
    );
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
        "เงินต้น", "ดอกเบี้ย(%)", "สถานะ", "สรุป", "เอกสาร"
    ];
    const sample = [
        "1", "ตัวอย่าง", "นายตัวอย่าง ทดสอบ", "15/01/2568", "15/02/2568",
        "10000", "20", "กำลังผ่อน", "หมายเหตุ", ""
    ];
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + sample.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'loan_template.csv';
    link.click();
    
    showToast("ดาวน์โหลด Template เรียบร้อย", 'success');
}

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
