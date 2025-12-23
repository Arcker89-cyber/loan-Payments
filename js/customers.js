// ============ CUSTOMER MANAGEMENT ============
console.log("✅ customers.js loaded");

// Global Variables
let allCustomers = [];

// DOM Elements
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

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target === customerModal) {
        closeCustomerModal();
    }
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
        updateCustomerCount();

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
            <p><strong>เลขบัตร:</strong> ${customer.idCard || '-'}</p>
            <p><strong>โทรศัพท์:</strong> ${customer.telephone || '-'}</p>
            <p><strong>วันเกิด:</strong> ${customer.birthday || '-'}</p>
            <p><strong>ที่อยู่:</strong> ${truncateText(customer.address, 50) || '-'}</p>
            <div class="card-actions">
                <button class="btn-action btn-edit" onclick="editCustomer('${customer.id}')">✏️ แก้ไข</button>
                <button class="btn-action btn-delete" onclick="deleteCustomer('${customer.id}')">🗑️ ลบ</button>
            </div>
        `;
        customerList.appendChild(card);
    });
}

// Helper: Truncate text
function truncateText(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Update customer count
function updateCustomerCount() {
    const countEl = document.getElementById("customerCount");
    if (countEl) {
        countEl.textContent = allCustomers.length;
    }
}

// ============ SEARCH CUSTOMERS ============
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

// ============ CRUD OPERATIONS ============
// Add/Update Customer
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
            // Update existing
            await db.collection("customers").doc(editId).update(customerData);
            console.log("✅ Updated customer:", editId);
            alert("อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว!");
        } else {
            // Add new
            customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("customers").add(customerData);
            console.log("✅ Added new customer");
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

// Edit Customer
function editCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;

    // Fill form with existing data
    document.getElementById("custNickname").value = customer.nickname || '';
    document.getElementById("custNameSurname").value = customer.nameSurname || '';
    document.getElementById("custIdCard").value = customer.idCard || '';
    document.getElementById("custTelephone").value = customer.telephone || '';
    document.getElementById("custBirthday").value = customer.birthday || '';
    document.getElementById("custAddress").value = customer.address || '';

    // Set edit mode
    customerForm.dataset.editId = id;
    document.getElementById("customerModalTitle").textContent = "แก้ไขข้อมูลลูกค้า";
    customerModal.style.display = "block";
}

// Delete Customer
async function deleteCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;

    if (!confirm(`คุณต้องการลบลูกค้า "${customer.nickname || customer.nameSurname}" หรือไม่?`)) return;

    try {
        await db.collection("customers").doc(id).delete();
        console.log("✅ Deleted customer:", id);
        alert("ลบข้อมูลลูกค้าเรียบร้อยแล้ว!");
        loadCustomerList();
    } catch (error) {
        console.error("❌ Delete error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

// ============ EXPORT CUSTOMERS TO CSV ============
function exportCustomersToCSV() {
    if (allCustomers.length === 0) {
        alert("ไม่มีข้อมูลลูกค้าให้ Export");
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
        "Address"
    ];

    // CSV Rows
    const rows = allCustomers.map((customer, index) => {
        return [
            index + 1,
            escapeCSV(customer.nickname || ''),
            escapeCSV(customer.nameSurname || ''),
            escapeCSV(customer.idCard || ''),
            escapeCSV(customer.telephone || ''),
            escapeCSV(customer.birthday || ''),
            escapeCSV(customer.address || '')
        ].join(',');
    });

    // Combine headers and rows
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("✅ Customers CSV exported successfully");
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

// ============ AUTH CHECK ============
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("👤 Logged in as:", user.email);
        document.getElementById("userEmail").textContent = user.email;
        loadCustomerList();
    } else {
        console.log("❌ Not logged in, redirecting...");
        window.location.href = "index.html";
    }
});
