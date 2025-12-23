// ============ CUSTOMER MANAGEMENT ============
console.log("✅ customers.js loaded");

let allCustomers = [];
let editingId = null; // เก็บ ID ที่กำลังแก้ไข

const customerModal = document.getElementById("customerModal");
const customerForm = document.getElementById("customerForm");
const customerTableBody = document.getElementById("customerTableBody");

// ============ THAI ALPHABET SORT ============
function sortThaiAlphabet(a, b) {
    // เรียงตามชื่อเล่น ก-ฮ
    const nameA = (a.nickname || '').toLowerCase();
    const nameB = (b.nickname || '').toLowerCase();
    return nameA.localeCompare(nameB, 'th');
}

// ============ MODAL FUNCTIONS ============
function openCustomerModal() {
    customerModal.style.display = "block";
    document.getElementById("customerModalTitle").textContent = "เพิ่มลูกค้าใหม่";
    document.getElementById("duplicateWarning").style.display = "none";
    customerForm.reset();
    editingId = null;
}

function closeCustomerModal() {
    customerModal.style.display = "none";
    customerForm.reset();
    editingId = null;
    document.getElementById("duplicateWarning").style.display = "none";
}

window.onclick = (e) => {
    if (e.target === customerModal) closeCustomerModal();
};

// ============ CHECK DUPLICATE ============
function checkDuplicate() {
    const nickname = document.getElementById("custNickname").value.trim().toLowerCase();
    const warning = document.getElementById("duplicateWarning");
    const saveBtn = document.getElementById("customerSaveBtn");
    
    if (!nickname) {
        warning.style.display = "none";
        saveBtn.disabled = false;
        return false;
    }
    
    // เช็คว่ามีชื่อซ้ำไหม (ยกเว้นตัวเองถ้ากำลังแก้ไข)
    const isDuplicate = allCustomers.some(c => {
        if (editingId && c.id === editingId) return false; // ข้ามตัวเอง
        return (c.nickname || '').toLowerCase() === nickname;
    });
    
    if (isDuplicate) {
        warning.style.display = "block";
        saveBtn.disabled = true;
        return true;
    } else {
        warning.style.display = "none";
        saveBtn.disabled = false;
        return false;
    }
}

// ============ LOAD CUSTOMERS ============
async function loadCustomerList() {
    try {
        const snapshot = await db.collection("customers").get();
        
        allCustomers = [];
        snapshot.forEach(doc => {
            allCustomers.push({ id: doc.id, ...doc.data() });
        });

        // เรียงตาม ก-ฮ
        allCustomers.sort(sortThaiAlphabet);

        renderCustomerTable(allCustomers);
        document.getElementById("customerCount").textContent = allCustomers.length;

        console.log("✅ Customers loaded:", allCustomers.length);

    } catch (error) {
        console.error("❌ Firebase Error:", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}

// ============ RENDER TABLE ============
function renderCustomerTable(customers) {
    customerTableBody.innerHTML = "";
    
    if (customers.length === 0) {
        customerTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: #999;">
                    ยังไม่มีข้อมูลลูกค้า
                </td>
            </tr>
        `;
        return;
    }

    customers.forEach((customer, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${customer.nickname || '-'}</strong></td>
            <td>${customer.nameSurname || '-'}</td>
            <td class="id-card-masked">${maskIdCard(customer.idCard)}</td>
            <td>${customer.telephone || '-'}</td>
            <td>${formatDateThai(customer.birthday)}</td>
            <td class="address-cell" title="${customer.address || ''}">${truncateText(customer.address, 30) || '-'}</td>
            <td class="actions">
                <button class="btn-action btn-detail" onclick="viewCustomerHistory('${customer.id}')">📊</button>
                <button class="btn-action btn-edit" onclick="editCustomer('${customer.id}')">✏️</button>
                <button class="btn-action btn-delete" onclick="deleteCustomer('${customer.id}')">🗑️</button>
            </td>
        `;
        customerTableBody.appendChild(row);
    });
}

// ============ HELPER FUNCTIONS ============
function maskIdCard(idCard) {
    if (!idCard) return '-';
    if (idCard.length !== 13) return idCard;
    return idCard.substring(0, 1) + '-' + idCard.substring(1, 5) + '-XXXXX-' + idCard.substring(10, 12) + '-' + idCard.substring(12);
}

function formatDateThai(dateStr) {
    if (!dateStr) return '-';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${parseInt(year) + 543}`;
    } catch {
        return dateStr;
    }
}

function truncateText(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// ============ SEARCH ============
function searchCustomers() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderCustomerTable(allCustomers);
        return;
    }

    const filtered = allCustomers.filter(c => {
        return (c.nickname && c.nickname.toLowerCase().includes(searchTerm)) ||
               (c.nameSurname && c.nameSurname.toLowerCase().includes(searchTerm)) ||
               (c.idCard && c.idCard.includes(searchTerm)) ||
               (c.telephone && c.telephone.includes(searchTerm)) ||
               (c.address && c.address.toLowerCase().includes(searchTerm));
    });

    renderCustomerTable(filtered);
}

// ============ VIEW CUSTOMER HISTORY ============
async function viewCustomerHistory(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    try {
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

        alert(`
📊 ประวัติการกู้ของ ${customer.nickname}

👤 ข้อมูลลูกค้า
━━━━━━━━━━━━━━━━
ชื่อ-นามสกุล: ${customer.nameSurname || '-'}
เลขบัตร: ${customer.idCard || '-'}
เบอร์โทร: ${customer.telephone || '-'}
ที่อยู่: ${customer.address || '-'}

💰 สรุปการกู้
━━━━━━━━━━━━━━━━
จำนวนครั้งที่กู้: ${loans.length} ครั้ง
รวมเงินต้น: ${totalPrincipal.toLocaleString()} บาท
รวมดอกเบี้ย: ${totalInterest.toLocaleString()} บาท
รวมทั้งสิ้น: ${(totalPrincipal + totalInterest).toLocaleString()} บาท
        `.trim());

    } catch (error) {
        console.error("Error loading history:", error);
        
        // ถ้า query ไม่ได้ ลองแบบไม่มี orderBy
        try {
            const snapshot = await db.collection("loans").where("customerId", "==", customerId).get();
            let count = 0, total = 0;
            snapshot.forEach(doc => {
                count++;
                total += parseFloat(doc.data().principal) || 0;
            });
            alert(`📊 ${customer.nickname}\nจำนวนครั้งที่กู้: ${count} ครั้ง\nรวมเงินต้น: ${total.toLocaleString()} บาท`);
        } catch (e) {
            alert(`📊 ${customer.nickname}\nยังไม่มีประวัติการกู้`);
        }
    }
}

// ============ CRUD OPERATIONS ============
customerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // เช็คซ้ำอีกครั้ง
    if (checkDuplicate()) {
        alert("❌ ไม่สามารถบันทึกได้ เนื่องจากชื่อเล่นนี้มีอยู่ในระบบแล้ว");
        return;
    }
    
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
        if (editingId) {
            // Update existing
            await db.collection("customers").doc(editingId).update(customerData);
            alert("✅ อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว!");
        } else {
            // Add new - เช็คซ้ำอีกรอบก่อน save จริง
            const existingQuery = await db.collection("customers")
                .where("nickname", "==", customerData.nickname)
                .get();
            
            if (!existingQuery.empty) {
                alert("❌ ไม่สามารถบันทึกได้ เนื่องจากชื่อเล่นนี้มีอยู่ในระบบแล้ว");
                saveBtn.disabled = false;
                saveBtn.textContent = "💾 บันทึกข้อมูล";
                return;
            }
            
            customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("customers").add(customerData);
            alert("✅ เพิ่มลูกค้าใหม่เรียบร้อยแล้ว!");
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

    editingId = id;
    document.getElementById("customerModalTitle").textContent = "แก้ไขข้อมูลลูกค้า";
    document.getElementById("duplicateWarning").style.display = "none";
    document.getElementById("customerSaveBtn").disabled = false;
    customerModal.style.display = "block";
}

async function deleteCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;

    if (!confirm(`คุณต้องการลบลูกค้า "${customer.nickname}" หรือไม่?`)) return;

    try {
        await db.collection("customers").doc(id).delete();
        alert("✅ ลบข้อมูลลูกค้าเรียบร้อยแล้ว!");
        loadCustomerList();
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

// ============ EXPORT TO EXCEL ============
function exportCustomersToExcel() {
    if (allCustomers.length === 0) {
        alert("ไม่มีข้อมูลลูกค้าให้ Export");
        return;
    }

    const headers = ["No.", "ชื่อเล่น", "ชื่อ-นามสกุล", "เลขบัตรประชาชน", "เบอร์โทรศัพท์", "วันเกิด", "ที่อยู่"];
    
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

    console.log("✅ Customers exported");
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
