// ============ CUSTOMER MANAGEMENT ============
console.log("✅ customers.js loaded");

let allCustomers = [];

const customerModal = document.getElementById("customerModal");
const customerForm = document.getElementById("customerForm");
const customerList = document.getElementById("customerList");

// ============ MODAL FUNCTIONS ============
function openCustomerModal() {
    customerModal.style.display = "block";
    document.getElementById("customerModalTitle").textContent = "เพิ่มลูกค้าใหม่";
    customerForm.reset();
    delete customerForm.dataset.editId;
}

function closeCustomerModal() {
    customerModal.style.display = "none";
    customerForm.reset();
    delete customerForm.dataset.editId;
}

window.onclick = (e) => {
    if (e.target === customerModal) closeCustomerModal();
};

// ============ LOAD CUSTOMERS ============
async function loadCustomerList() {
    try {
        const snapshot = await db.collection("customers").orderBy("createdAt", "desc").get();
        
        allCustomers = [];
        snapshot.forEach(doc => {
            allCustomers.push({ id: doc.id, ...doc.data() });
        });

        renderCustomers(allCustomers);
        document.getElementById("customerCount").textContent = allCustomers.length;

        console.log("✅ Customers loaded:", allCustomers.length);

    } catch (error) {
        console.error("❌ Firebase Error:", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}

// ============ RENDER CUSTOMERS ============
function renderCustomers(customers) {
    customerList.innerHTML = "";
    
    if (customers.length === 0) {
        customerList.innerHTML = `
            <div class="empty-state">
                <h3>👥 ยังไม่มีข้อมูลลูกค้า</h3>
                <p>คลิกปุ่ม "เพิ่มลูกค้าใหม่" เพื่อเริ่มต้น</p>
            </div>
        `;
        return;
    }

    customers.forEach(customer => {
        const card = document.createElement("div");
        card.className = "customer-card";
        card.innerHTML = `
            <h4>👤 ${customer.nickname || 'ไม่ระบุชื่อเล่น'}</h4>
            <p><strong>ชื่อ-นามสกุล:</strong> ${customer.nameSurname || '-'}</p>
            <p><strong>เลขบัตร:</strong> ${maskIdCard(customer.idCard)}</p>
            <p><strong>โทรศัพท์:</strong> ${customer.telephone || '-'}</p>
            <p><strong>วันเกิด:</strong> ${formatDateThai(customer.birthday)}</p>
            <p><strong>ที่อยู่:</strong> ${truncateText(customer.address, 40) || '-'}</p>
            <div class="card-actions">
                <button class="btn-action btn-detail" onclick="viewCustomerHistory('${customer.id}')">📊 ประวัติ</button>
                <button class="btn-action btn-edit" onclick="editCustomer('${customer.id}')">✏️ แก้ไข</button>
                <button class="btn-action btn-delete" onclick="deleteCustomer('${customer.id}')">🗑️ ลบ</button>
            </div>
        `;
        customerList.appendChild(card);
    });
}

function maskIdCard(idCard) {
    if (!idCard) return '-';
    if (idCard.length !== 13) return idCard;
    return idCard.substring(0, 4) + '-XXXXX-' + idCard.substring(9);
}

function formatDateThai(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${parseInt(year) + 543}`;
}

function truncateText(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// ============ SEARCH ============
function searchCustomers() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderCustomers(allCustomers);
        return;
    }

    const filtered = allCustomers.filter(c => {
        return (c.nickname && c.nickname.toLowerCase().includes(searchTerm)) ||
               (c.nameSurname && c.nameSurname.toLowerCase().includes(searchTerm)) ||
               (c.idCard && c.idCard.includes(searchTerm)) ||
               (c.telephone && c.telephone.includes(searchTerm));
    });

    renderCustomers(filtered);
}

// ============ VIEW CUSTOMER HISTORY ============
async function viewCustomerHistory(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    try {
        // Get all loans for this customer
        const snapshot = await db.collection("loans")
            .where("customerId", "==", customerId)
            .orderBy("loanDate", "desc")
            .get();

        let loans = [];
        let totalPrincipal = 0;
        let totalInterest = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            loans.push(data);
            totalPrincipal += parseFloat(data.principal) || 0;
            totalInterest += parseFloat(data.interest) || 0;
        });

        let historyHtml = '';
        if (loans.length > 0) {
            historyHtml = loans.map((loan, i) => `
                <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 8px;">
                    <strong>${i + 1}. ${formatDateThai(loan.loanDate)}</strong><br>
                    เงินต้น: ${parseFloat(loan.principal || 0).toLocaleString()} ฿ | 
                    ดอกเบี้ย: ${parseFloat(loan.interest || 0).toLocaleString()} ฿ |
                    สถานะ: ${loan.status || '-'}
                </div>
            `).join('');
        } else {
            historyHtml = '<p style="color: #999; text-align: center;">ยังไม่มีประวัติการกู้</p>';
        }

        alert(`
📊 ประวัติการกู้ของ ${customer.nickname}

ชื่อ: ${customer.nameSurname}
รวมจำนวนครั้งที่กู้: ${loans.length} ครั้ง
รวมเงินต้นทั้งหมด: ${totalPrincipal.toLocaleString()} บาท
รวมดอกเบี้ยทั้งหมด: ${totalInterest.toLocaleString()} บาท
รวมทั้งสิ้น: ${(totalPrincipal + totalInterest).toLocaleString()} บาท
        `.trim());

    } catch (error) {
        console.error("Error loading history:", error);
        alert("ไม่สามารถโหลดประวัติได้");
    }
}

// ============ CRUD ============
customerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById("customerSaveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก...";

    const customerData = {
        nickname: document.getElementById("custNickname").value.trim(),
        nameSurname: document.getElementById("custNameSurname").value.trim(),
        idCard: document.getElementById("custIdCard").value.trim(),
        telephone: document.getElementById("custTelephone").value.trim(),
        birthday: document.getElementById("custBirthday").value,
        address: document.getElementById("custAddress").value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const editId = customerForm.dataset.editId;
        
        if (editId) {
            await db.collection("customers").doc(editId).update(customerData);
            alert("อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว!");
        } else {
            customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("customers").add(customerData);
            alert("เพิ่มลูกค้าใหม่เรียบร้อยแล้ว!");
        }

        closeCustomerModal();
        loadCustomerList();

    } catch (error) {
        console.error("❌ Save error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 บันทึกข้อมูล";
    }
});

function editCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;

    document.getElementById("custNickname").value = customer.nickname || '';
    document.getElementById("custNameSurname").value = customer.nameSurname || '';
    document.getElementById("custIdCard").value = customer.idCard || '';
    document.getElementById("custTelephone").value = customer.telephone || '';
    document.getElementById("custBirthday").value = customer.birthday || '';
    document.getElementById("custAddress").value = customer.address || '';

    customerForm.dataset.editId = id;
    document.getElementById("customerModalTitle").textContent = "แก้ไขข้อมูลลูกค้า";
    customerModal.style.display = "block";
}

async function deleteCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;

    if (!confirm(`คุณต้องการลบลูกค้า "${customer.nickname}" หรือไม่?`)) return;

    try {
        await db.collection("customers").doc(id).delete();
        alert("ลบข้อมูลลูกค้าเรียบร้อยแล้ว!");
        loadCustomerList();
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

// ============ EXPORT ============
function exportCustomersToExcel() {
    if (allCustomers.length === 0) {
        alert("ไม่มีข้อมูลลูกค้าให้ Export");
        return;
    }

    const headers = ["No.", "Nickname", "Name-Surname", "ID Card", "Telephone", "Birthday", "Address"];
    const rows = allCustomers.map((c, i) => [
        i + 1,
        c.nickname || '',
        c.nameSurname || '',
        c.idCard || '',
        c.telephone || '',
        c.birthday || '',
        c.address || ''
    ].map(escapeCSV).join(','));

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ============ AUTH CHECK ============
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        document.getElementById("userEmail").textContent = user.email;
        loadCustomerList();
    } else {
        window.location.href = "index.html";
    }
});
