// ============ MONTHLY HISTORY ============
console.log("✅ history.js loaded");

const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

let allMonthlyReports = [];
let selectedMonthData = [];

// ============ LOAD MONTHLY REPORTS ============
async function loadMonthlyReports() {
    try {
        const snapshot = await db.collection("monthly_reports")
            .orderBy("year", "desc")
            .orderBy("month", "desc")
            .get();
        
        allMonthlyReports = [];
        snapshot.forEach(doc => {
            allMonthlyReports.push({ id: doc.id, ...doc.data() });
        });

        renderMonthlyCards();
        updateTotalStats();

        console.log("✅ Monthly reports loaded:", allMonthlyReports.length);

    } catch (error) {
        console.error("❌ Error:", error);
        // Try loading without orderBy
        loadMonthlyReportsFallback();
    }
}

async function loadMonthlyReportsFallback() {
    try {
        const snapshot = await db.collection("monthly_reports").get();
        
        allMonthlyReports = [];
        snapshot.forEach(doc => {
            allMonthlyReports.push({ id: doc.id, ...doc.data() });
        });

        // Sort in JavaScript
        allMonthlyReports.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        renderMonthlyCards();
        updateTotalStats();

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// ============ RENDER MONTHLY CARDS ============
function renderMonthlyCards() {
    const container = document.getElementById("historyGrid");
    container.innerHTML = "";

    if (allMonthlyReports.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>📅 ยังไม่มีข้อมูลรายเดือน</h3>
                <p>ข้อมูลจะถูกบันทึกอัตโนมัติเมื่อมีรายการเงินกู้</p>
            </div>
        `;
        return;
    }

    allMonthlyReports.forEach(report => {
        const card = document.createElement("div");
        card.className = "history-card";
        card.onclick = () => viewMonthDetail(report.id);
        
        card.innerHTML = `
            <div class="month-name">📅 ${thaiMonths[report.month]} ${report.year + 543}</div>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">${report.loanCount || 0}</div>
                    <div class="stat-label">รายการ</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${((report.totalPrincipal || 0) / 1000).toFixed(1)}K</div>
                    <div class="stat-label">เงินต้น</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${((report.totalSum || 0) / 1000).toFixed(1)}K</div>
                    <div class="stat-label">รวม</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ============ UPDATE TOTAL STATS ============
function updateTotalStats() {
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalCount = 0;

    allMonthlyReports.forEach(report => {
        totalPrincipal += report.totalPrincipal || 0;
        totalInterest += report.totalInterest || 0;
        totalCount += report.loanCount || 0;
    });

    document.getElementById("grandTotalPrincipal").textContent = totalPrincipal.toLocaleString() + " ฿";
    document.getElementById("grandTotalInterest").textContent = totalInterest.toLocaleString() + " ฿";
    document.getElementById("grandTotalSum").textContent = (totalPrincipal + totalInterest).toLocaleString() + " ฿";
    document.getElementById("grandTotalCount").textContent = totalCount + " รายการ";
}

// ============ VIEW MONTH DETAIL ============
async function viewMonthDetail(monthId) {
    const report = allMonthlyReports.find(r => r.id === monthId);
    if (!report) return;

    // Load actual loan data for this month
    const startDate = `${report.year}-${String(report.month).padStart(2, '0')}-01`;
    const endMonth = report.month === 12 ? 1 : report.month + 1;
    const endYear = report.month === 12 ? report.year + 1 : report.year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    try {
        const snapshot = await db.collection("loans")
            .where("loanDate", ">=", startDate)
            .where("loanDate", "<", endDate)
            .get();

        selectedMonthData = [];
        snapshot.forEach(doc => {
            selectedMonthData.push({ id: doc.id, ...doc.data() });
        });

        showMonthDetailModal(report);

    } catch (error) {
        console.error("Error loading month detail:", error);
        
        // Fallback: load all and filter
        const snapshot = await db.collection("loans").get();
        selectedMonthData = [];
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (data.loanDate) {
                const [year, month] = data.loanDate.split('-').map(Number);
                if (year === report.year && month === report.month) {
                    selectedMonthData.push(data);
                }
            }
        });
        showMonthDetailModal(report);
    }
}

function showMonthDetailModal(report) {
    document.getElementById("monthDetailTitle").textContent = 
        `📊 รายละเอียด ${thaiMonths[report.month]} ${report.year + 543}`;

    let tableRows = selectedMonthData.map((loan, i) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        return `
            <tr>
                <td>${i + 1}</td>
                <td>${loan.nickname || '-'}</td>
                <td>${loan.nameSurname || '-'}</td>
                <td>${formatDate(loan.loanDate)}</td>
                <td class="text-right">${principal.toLocaleString()}</td>
                <td class="text-right">${interest.toLocaleString()}</td>
                <td class="text-right"><strong>${(principal + interest).toLocaleString()}</strong></td>
                <td>${loan.status || '-'}</td>
            </tr>
        `;
    }).join('');

    if (selectedMonthData.length === 0) {
        tableRows = '<tr><td colspan="8" style="text-align: center; color: #999;">ไม่มีข้อมูล</td></tr>';
    }

    document.getElementById("monthDetailContent").innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>ชื่อเล่น</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>วันที่กู้</th>
                        <th>เงินต้น</th>
                        <th>ดอกเบี้ย</th>
                        <th>รวม</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn-excel" onclick="exportMonthToExcel('${report.id}')">
                📥 Export เดือนนี้เป็น Excel
            </button>
        </div>
    `;

    document.getElementById("monthDetailModal").style.display = "block";
}

function closeMonthDetailModal() {
    document.getElementById("monthDetailModal").style.display = "none";
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${parseInt(year) + 543}`;
}

// ============ EXPORT MONTH TO EXCEL ============
function exportMonthToExcel(monthId) {
    const report = allMonthlyReports.find(r => r.id === monthId);
    if (!report || selectedMonthData.length === 0) {
        alert("ไม่มีข้อมูลให้ Export");
        return;
    }

    const headers = ["No.", "Nickname", "Name-Surname", "วันที่กู้", "วันที่คืน", 
                     "เงินต้น", "ประเภทดอกเบี้ย", "ดอกเบี้ย", "ต้น+ดอก", "สถานะ"];

    const rows = selectedMonthData.map((loan, i) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        return [
            i + 1,
            loan.nickname || '',
            loan.nameSurname || '',
            loan.loanDate || '',
            loan.returnDate || '',
            principal,
            loan.interestType || '',
            interest,
            principal + interest,
            loan.status || ''
        ].map(escapeCSV).join(',');
    });

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `loan_${thaiMonths[report.month]}_${report.year + 543}.csv`;
    link.click();

    console.log("✅ Month exported");
}

// ============ EXPORT ALL TO EXCEL ============
async function exportAllToExcel() {
    if (allMonthlyReports.length === 0) {
        alert("ไม่มีข้อมูลให้ Export");
        return;
    }

    // Load all loans
    const snapshot = await db.collection("loans").orderBy("loanDate", "desc").get();
    let allLoans = [];
    snapshot.forEach(doc => {
        allLoans.push({ id: doc.id, ...doc.data() });
    });

    if (allLoans.length === 0) {
        alert("ไม่มีข้อมูลให้ Export");
        return;
    }

    const headers = ["No.", "Nickname", "Name-Surname", "วันที่กู้", "วันที่คืน",
                     "เงินต้น", "ประเภทดอกเบี้ย", "ดอกเบี้ย", "ต้น+ดอก", "สถานะ"];

    const rows = allLoans.map((loan, i) => {
        const principal = parseFloat(loan.principal) || 0;
        const interest = parseFloat(loan.interest) || 0;
        return [
            i + 1,
            loan.nickname || '',
            loan.nameSurname || '',
            loan.loanDate || '',
            loan.returnDate || '',
            principal,
            loan.interestType || '',
            interest,
            principal + interest,
            loan.status || ''
        ].map(escapeCSV).join(',');
    });

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `all_loans_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    console.log("✅ All data exported");
}

function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ============ CLOSE MODAL ============
window.onclick = (e) => {
    const modal = document.getElementById("monthDetailModal");
    if (e.target === modal) closeMonthDetailModal();
};

// ============ AUTH CHECK ============
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        document.getElementById("userEmail").textContent = user.email;
        loadMonthlyReports();
    } else {
        window.location.href = "index.html";
    }
});
