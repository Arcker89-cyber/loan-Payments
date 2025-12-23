// ============ LOAN MANAGEMENT ============
console.log("✅ loans.js loaded");

// Global Variables
let loanChart = null;
let allLoans = [];
let allCustomers = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let selectedLoans = new Set(); // เก็บ ID ที่เลือก
let confirmCallback = null; // Callback สำหรับ confirm modal

// Thai Month Names
const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

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

// ============ INITIALIZE ============
function initMonthSelector() {
    const monthSelect = document.getElementById("monthSelect");
    const yearSelect = document.getElementById("yearSelect");
    
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = thaiMonths[i];
        if (i === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    }
    
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= thisYear - 5; y--) {
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
        renderTable(allLoans);
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
        renderTable(allLoans);
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
    renderTable(allLoans);
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

// ============ RENDER TABLE ============
function renderTable(loans) {
    loanTableBody.innerHTML = "";
    selectedLoans.clear();
    updateBulkActions();

    if (loans.length === 0) {
        loanTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 30px; color: #999;">
                    ไม่มีข้อมูลเงินกู้ในเดือนนี้
                </td>
            </tr>
        `;
        return;
    }

    loans.forEach((loan, index) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        const total = principal + interest;
        
        const statusClass = getStatusClass(loan.status);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${loan.id}" onchange="toggleSelection('${loan.id}')"></td>
            <td>${index + 1}</td>
            <td><strong>${loan.nickname || '-'}</strong></td>
            <td>${loan.nameSurname || '-'}</td>
            <td>${formatDate(loan.loanDate)}</td>
            <td>${formatDate(loan.returnDate)}</td>
            <td class="text-right">${principal.toLocaleString()}</td>
            <td>${loan.interestType || '-'}</td>
            <td class="text-right">${interest.toLocaleString()}</td>
            <td class="text-right"><strong>${total.toLocaleString()}</strong></td>
            <td><span class="status-badge ${statusClass}">${loan.status || '-'}</span></td>
            <td>
                <button class="btn-action btn-detail" onclick="viewLoanDetail('${loan.id}')" title="รายละเอียด">👁️</button>
                <button class="btn-action btn-edit" onclick="editLoan('${loan.id}')" title="แก้ไข">✏️</button>
                <button class="btn-action btn-delete" onclick="deleteLoan('${loan.id}')" title="ลบ">🗑️</button>
            </td>
        `;
        loanTableBody.appendChild(row);
    });
}

function getStatusClass(status) {
    const classes = {
        // สถานะใหม่
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
    return classes[status] || 'status-interest';
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

// ============ BULK OPERATIONS ============
async function bulkChangeStatus(newStatus) {
    if (selectedLoans.size === 0) return;
    
    showConfirm(
        'เปลี่ยนสถานะ',
        `ต้องการเปลี่ยนสถานะ ${selectedLoans.size} รายการเป็น "${newStatus}" หรือไม่?`,
        async () => {
            try {
                const batch = db.batch();
                
                selectedLoans.forEach(id => {
                    const ref = db.collection("loans").doc(id);
                    batch.update(ref, { status: newStatus });
                });
                
                await batch.commit();
                
                showToast(`เปลี่ยนสถานะ ${selectedLoans.size} รายการเรียบร้อย`, 'success');
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
            await db.collection("loans").doc(editId).update(loanData);
            showToast("อัปเดตข้อมูลเรียบร้อยแล้ว", 'success');
        } else {
            loanData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("loans").add(loanData);
            showToast("เพิ่มข้อมูลเงินกู้เรียบร้อยแล้ว", 'success');
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
    const ctx = document.getElementById('loanChart').getContext('2d');
    
    if (loanChart) {
        loanChart.destroy();
    }

    // Group by status
    const statusCount = {};
    allLoans.forEach(loan => {
        const status = loan.status || 'ไม่ระบุ';
        statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const labels = Object.keys(statusCount);
    const data = Object.values(statusCount);
    const colors = ['#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'];

    loanChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'สถานะเงินกู้'
                }
            }
        }
    });
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
    
    // ✅ ฟังก์ชันคำนวณวันที่คืน = วันที่กู้ + 1 เดือน
    function addOneMonth(dateStr) {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d); // month is 0-indexed
            date.setMonth(date.getMonth() + 1);
            
            const newY = date.getFullYear();
            const newM = String(date.getMonth() + 1).padStart(2, '0');
            const newD = String(date.getDate()).padStart(2, '0');
            
            return `${newY}-${newM}-${newD}`;
        } catch (e) {
            console.error('addOneMonth error:', e);
            return '';
        }
    }
    
    // ✅ ฟังก์ชันแปลงสถานะ
    function mapStatus(val) {
        if (!val) return 'ดอก';
        val = String(val).trim().toLowerCase();
        
        // แปลงสถานะเก่าเป็นใหม่
        if (val.includes('ปิด') || val.includes('จบ') || val.includes('คืน') || val.includes('ชำระแล้ว')) {
            return 'ปิดจบ';
        }
        if (val.includes('ต้น') || val.includes('เกิน') || val.includes('ค้าง')) {
            return 'ต้น+ดอก';
        }
        return 'ดอก'; // default
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
