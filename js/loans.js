// ============ LOAN MANAGEMENT ============
console.log("✅ loans.js loaded");

// Global Variables
let loanChart = null;
let allLoans = [];
let allCustomers = [];

// DOM Elements
const loanModal = document.getElementById("loanModal");
const loanForm = document.getElementById("loanForm");
const loanTableBody = document.getElementById("loanTableBody");

// ============ LOAD CUSTOMERS FOR DROPDOWN ============
async function loadCustomers() {
    try {
        const snapshot = await db.collection("customers").orderBy("nickname").get();
        allCustomers = [];
        
        snapshot.forEach(doc => {
            allCustomers.push({ id: doc.id, ...doc.data() });
        });

        // Populate dropdown
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

// Fill customer data when selected from dropdown
function fillCustomerData() {
    const customerSelect = document.getElementById("customerSelect");
    const selectedId = customerSelect.value;
    
    if (!selectedId) {
        // Clear form if no selection
        return;
    }

    const customer = allCustomers.find(c => c.id === selectedId);
    if (customer) {
        document.getElementById("nickname").value = customer.nickname || '';
        document.getElementById("nameSurname").value = customer.nameSurname || '';
        document.getElementById("idCard").value = customer.idCard || '';
        document.getElementById("telephone").value = customer.telephone || '';
        document.getElementById("birthday").value = customer.birthday || '';
        document.getElementById("address").value = customer.address || '';
    }
}

// ============ MODAL FUNCTIONS ============
function openModal() {
    loanModal.style.display = "block";
    document.getElementById("modalTitle").textContent = "เพิ่มข้อมูลเงินกู้ใหม่";
    loanForm.reset();
    delete loanForm.dataset.editId;
    loadCustomers(); // Reload customers
}

function closeModalFunc() {
    loanModal.style.display = "none";
    loanForm.reset();
    delete loanForm.dataset.editId;
}

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target === loanModal) {
        closeModalFunc();
    }
};

// ============ LOAD DATA ============
async function loadDashboardData(startDate = null, endDate = null) {
    try {
        let query = db.collection("loans");

        // Apply date filter if provided
        if (startDate && endDate) {
            query = query.where("loanDate", ">=", startDate).where("loanDate", "<=", endDate);
        }

        const snapshot = await query.orderBy("loanDate", "desc").get();
        
        allLoans = [];
        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        let activeCount = 0;
        let monthlyData = {};

        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            allLoans.push(data);

            const principal = parseFloat(data.principal) || 0;
            const interest = parseFloat(data.interest) || 0;
            const loanDate = data.loanDate || "";

            totalPrincipal += principal;
            totalInterest += interest;

            if (data.status === "คืนแล้ว" || data.status === "ชำระแล้ว") {
                totalPaid += (principal + interest);
            } else {
                activeCount++;
            }

            // Group by month for chart
            if (loanDate) {
                const monthYear = loanDate.substring(0, 7); // YYYY-MM
                monthlyData[monthYear] = (monthlyData[monthYear] || 0) + principal;
            }
        });

        // Update dashboard cards
        document.getElementById("totalLoans").textContent = totalPrincipal.toLocaleString() + " ฿";
        document.getElementById("totalInterest").textContent = totalInterest.toLocaleString() + " ฿";
        document.getElementById("paidAmount").textContent = totalPaid.toLocaleString() + " ฿";
        document.getElementById("activeLoans").textContent = activeCount + " รายการ";

        // Render chart and table
        renderChart(monthlyData);
        renderTable(allLoans);

        console.log("✅ Data loaded:", allLoans.length, "records");

    } catch (error) {
        console.error("❌ Firebase Error:", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}

// ============ RENDER TABLE (17 COLUMNS) ============
function renderTable(loans) {
    loanTableBody.innerHTML = "";
    
    if (loans.length === 0) {
        loanTableBody.innerHTML = `
            <tr>
                <td colspan="17" style="text-align: center; padding: 30px; color: #999;">
                    ยังไม่มีข้อมูลเงินกู้
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
            <td>${loan.idCard || '-'}</td>
            <td>${loan.telephone || '-'}</td>
            <td>${formatDate(loan.birthday) || '-'}</td>
            <td title="${loan.address || ''}">${truncate(loan.address, 20) || '-'}</td>
            <td>${formatDate(loan.loanDate) || '-'}</td>
            <td>${formatDate(loan.returnDate) || '-'}</td>
            <td>${principal.toLocaleString()}</td>
            <td>${loan.interestType || '-'}</td>
            <td>${interest.toLocaleString()}</td>
            <td><strong>${total.toLocaleString()}</strong></td>
            <td title="${loan.summary || ''}">${truncate(loan.summary, 15) || '-'}</td>
            <td><span class="status-badge ${statusClass}">${loan.status || '-'}</span></td>
            <td title="${loan.documents || ''}">${truncate(loan.documents, 15) || '-'}</td>
            <td>
                <button class="btn-action btn-view" onclick="viewLoan('${loan.id}')">ดู</button>
                <button class="btn-action btn-edit" onclick="editLoan('${loan.id}')">แก้ไข</button>
                <button class="btn-action btn-delete" onclick="deleteLoan('${loan.id}')">ลบ</button>
            </td>
        `;
        loanTableBody.appendChild(row);
    });
}

// Helper: Truncate text
function truncate(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Helper: Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr; // Already in YYYY-MM-DD format
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

// ============ EXPORT TO CSV ============
function exportToCSV() {
    if (allLoans.length === 0) {
        alert("ไม่มีข้อมูลให้ Export");
        return;
    }

    // CSV Headers
    const headers = [
        "No.",
        "Nickname",
        "Name - Surname",
        "ID Card",
        "Telephone",
        "Birthday",
        "Addresses",
        "วันที่กู้",
        "วันที่คืน",
        "เงินต้น",
        "ประเภทดอกเบี้ย",
        "ดอกเบี้ย",
        "ต้น + ดอก",
        "สรุป",
        "สถานะการกู้",
        "เอกสาร"
    ];

    // CSV Rows
    const rows = allLoans.map((loan, index) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        const total = principal + interest;

        return [
            index + 1,
            escapeCSV(loan.nickname || ''),
            escapeCSV(loan.nameSurname || ''),
            escapeCSV(loan.idCard || ''),
            escapeCSV(loan.telephone || ''),
            escapeCSV(loan.birthday || ''),
            escapeCSV(loan.address || ''),
            escapeCSV(loan.loanDate || ''),
            escapeCSV(loan.returnDate || ''),
            principal,
            escapeCSV(loan.interestType || ''),
            interest,
            total,
            escapeCSV(loan.summary || ''),
            escapeCSV(loan.status || ''),
            escapeCSV(loan.documents || '')
        ].join(',');
    });

    // Combine headers and rows
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `loan_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("✅ CSV exported successfully");
}

// Helper: Escape CSV special characters
function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ============ RENDER CHART ============
function renderChart(monthlyData) {
    const ctx = document.getElementById('loanChart');
    if (!ctx) return;

    if (loanChart) {
        loanChart.destroy();
    }

    const labels = Object.keys(monthlyData).sort();
    const values = labels.map(key => monthlyData[key]);

    // Format labels to Thai month names
    const formattedLabels = labels.map(label => {
        const [year, month] = label.split('-');
        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543}`;
    });

    loanChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: formattedLabels,
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
                    grid: { color: '#f0f0f0' },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ฿';
                        }
                    }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' บาท';
                        }
                    }
                }
            }
        }
    });
}

// ============ CRUD OPERATIONS ============
// Add/Update Loan
loanForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก...";

    const loanData = {
        nickname: document.getElementById("nickname").value.trim(),
        nameSurname: document.getElementById("nameSurname").value.trim(),
        idCard: document.getElementById("idCard").value.trim(),
        telephone: document.getElementById("telephone").value.trim(),
        birthday: document.getElementById("birthday").value,
        address: document.getElementById("address").value.trim(),
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
            // Update existing
            await db.collection("loans").doc(editId).update(loanData);
            console.log("✅ Updated loan:", editId);
            alert("อัปเดตข้อมูลเรียบร้อยแล้ว!");
        } else {
            // Add new
            loanData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("loans").add(loanData);
            console.log("✅ Added new loan");
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

// View Loan Detail
function viewLoan(id) {
    const loan = allLoans.find(l => l.id === id);
    if (!loan) return;

    const principal = parseFloat(loan.principal) || 0;
    const interest = parseFloat(loan.interest) || 0;
    const total = principal + interest;

    const detail = `
📋 รายละเอียดเงินกู้

👤 ข้อมูลผู้กู้
━━━━━━━━━━━━━━━━
ชื่อเล่น: ${loan.nickname || '-'}
ชื่อ-นามสกุล: ${loan.nameSurname || '-'}
เลขบัตร: ${loan.idCard || '-'}
โทรศัพท์: ${loan.telephone || '-'}
วันเกิด: ${loan.birthday || '-'}
ที่อยู่: ${loan.address || '-'}

💰 ข้อมูลเงินกู้
━━━━━━━━━━━━━━━━
เงินต้น: ${principal.toLocaleString()} บาท
ประเภทดอกเบี้ย: ${loan.interestType || '-'}
ดอกเบี้ย: ${interest.toLocaleString()} บาท
ต้น + ดอก: ${total.toLocaleString()} บาท

📅 วันที่กู้: ${loan.loanDate || '-'}
📅 วันครบกำหนด: ${loan.returnDate || '-'}
📌 สถานะ: ${loan.status || '-'}

📝 สรุป: ${loan.summary || '-'}
📎 เอกสาร: ${loan.documents || '-'}
    `.trim();

    alert(detail);
}

// Edit Loan
function editLoan(id) {
    const loan = allLoans.find(l => l.id === id);
    if (!loan) return;

    loadCustomers().then(() => {
        // Fill form with existing data
        document.getElementById("customerSelect").value = '';
        document.getElementById("nickname").value = loan.nickname || '';
        document.getElementById("nameSurname").value = loan.nameSurname || '';
        document.getElementById("idCard").value = loan.idCard || '';
        document.getElementById("telephone").value = loan.telephone || '';
        document.getElementById("birthday").value = loan.birthday || '';
        document.getElementById("address").value = loan.address || '';
        document.getElementById("loanDate").value = loan.loanDate || '';
        document.getElementById("returnDate").value = loan.returnDate || '';
        document.getElementById("principal").value = loan.principal || '';
        document.getElementById("interestType").value = loan.interestType || 'รายเดือน';
        document.getElementById("interest").value = loan.interest || '';
        document.getElementById("status").value = loan.status || 'กำลังผ่อน';
        document.getElementById("summary").value = loan.summary || '';
        document.getElementById("documents").value = loan.documents || '';

        // Set edit mode
        loanForm.dataset.editId = id;
        document.getElementById("modalTitle").textContent = "แก้ไขข้อมูลเงินกู้";
        loanModal.style.display = "block";
    });
}

// Delete Loan
async function deleteLoan(id) {
    if (!confirm("คุณต้องการลบข้อมูลนี้หรือไม่?")) return;

    try {
        await db.collection("loans").doc(id).delete();
        console.log("✅ Deleted loan:", id);
        alert("ลบข้อมูลเรียบร้อยแล้ว!");
        loadDashboardData();
    } catch (error) {
        console.error("❌ Delete error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

// ============ FILTER FUNCTIONS ============
function applyFilter() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    
    if (startDate && endDate) {
        if (startDate > endDate) {
            alert("วันที่เริ่มต้นต้องน้อยกว่าวันที่สิ้นสุด");
            return;
        }
        loadDashboardData(startDate, endDate);
    } else {
        alert("กรุณาระบุวันที่ให้ครบทั้งสองช่อง");
    }
}

function resetFilter() {
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    loadDashboardData();
}

// ============ AUTH CHECK ============
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("👤 Logged in as:", user.email);
        document.getElementById("userEmail").textContent = user.email;
        loadDashboardData();
        loadCustomers();
    } else {
        console.log("❌ Not logged in, redirecting...");
        window.location.href = "index.html";
    }
});
