// ============ CUSTOMER MANAGEMENT ============
console.log("✅ customers.js loaded");

let allCustomers = [];
let editingId = null;
let importData = [];

// DOM Elements - จะถูก assign หลัง DOM ready
let customerModal, customerForm, customerTableBody, importModal;

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', function() {
    customerModal = document.getElementById("customerModal");
    customerForm = document.getElementById("customerForm");
    customerTableBody = document.getElementById("customerTableBody");
    importModal = document.getElementById("importModal");
    
    // Setup form submit
    if (customerForm) {
        customerForm.addEventListener("submit", handleCustomerSubmit);
    }
    
    // Setup drag & drop
    setupDragDrop();
    
    console.log("✅ DOM ready, elements initialized");
});

// ============ DRAG & DROP SETUP ============
function setupDragDrop() {
    const dropZone = document.getElementById("dropZone");
    if (!dropZone) return;
    
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
}

// ============ THAI ALPHABET SORT ============
function sortThaiAlphabet(a, b) {
    const nameA = (a.nickname || '').toLowerCase();
    const nameB = (b.nickname || '').toLowerCase();
    return nameA.localeCompare(nameB, 'th');
}

// ============ CUSTOMER MODAL ============
function openCustomerModal() {
    const modal = document.getElementById("customerModal");
    modal.style.display = "block";
    document.getElementById("customerModalTitle").textContent = "เพิ่มลูกค้าใหม่";
    document.getElementById("duplicateWarning").style.display = "none";
    document.getElementById("customerForm").reset();
    editingId = null;
}

function closeCustomerModal() {
    const modal = document.getElementById("customerModal");
    modal.style.display = "none";
    document.getElementById("customerForm").reset();
    editingId = null;
}

// ============ IMPORT MODAL ============
function openImportModal() {
    const modal = document.getElementById("importModal");
    if (!modal) {
        console.error("Import modal not found!");
        return;
    }
    modal.style.display = "block";
    resetImportModal();
}

function closeImportModal() {
    const modal = document.getElementById("importModal");
    if (modal) {
        modal.style.display = "none";
    }
    resetImportModal();
}

function resetImportModal() {
    const fileInput = document.getElementById("fileInput");
    const importStats = document.getElementById("importStats");
    const importPreview = document.getElementById("importPreview");
    const importProgress = document.getElementById("importProgress");
    const importLog = document.getElementById("importLog");
    const startImportBtn = document.getElementById("startImportBtn");
    const dropZone = document.getElementById("dropZone");
    
    if (fileInput) fileInput.value = "";
    if (importStats) importStats.style.display = "none";
    if (importPreview) importPreview.style.display = "none";
    if (importProgress) importProgress.style.display = "none";
    if (importLog) {
        importLog.style.display = "none";
        importLog.innerHTML = "";
    }
    if (startImportBtn) startImportBtn.style.display = "none";
    if (dropZone) dropZone.style.display = "block";
    
    importData = [];
}

// ============ WINDOW CLICK HANDLER ============
window.onclick = function(e) {
    const custModal = document.getElementById("customerModal");
    const impModal = document.getElementById("importModal");
    
    if (e.target === custModal) closeCustomerModal();
    if (e.target === impModal) closeImportModal();
};

// ============ FILE HANDLING ============
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
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
            
            parseImportData(jsonData);
        } catch (error) {
            console.error("Error parsing file:", error);
            alert("❌ ไม่สามารถอ่านไฟล์ได้: " + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// ============ PARSE IMPORT DATA ============
function parseImportData(jsonData) {
    importData = [];
    let duplicateCount = 0;
    let newCount = 0;
    
    const columnMap = {
        nickname: ['nickname', 'ชื่อเล่น', 'Nickname'],
        nameSurname: ['Name - Surname', 'ชื่อ-นามสกุล', 'nameSurname', 'ชื่อนามสกุล', 'name'],
        idCard: ['ID Card', 'เลขบัตร', 'เลขบัตรประชาชน', 'idCard', 'IDCard'],
        telephone: ['Telephone', 'Telephone.', 'เบอร์โทร', 'เบอร์โทรศัพท์', 'telephone', 'phone'],
        birthday: ['Birthday', 'วันเกิด', 'birthday'],
        address: ['Addresses', 'Address', 'ที่อยู่', 'address']
    };
    
    function getValue(row, keys) {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return String(row[key]).trim();
            }
        }
        return '';
    }
    
    const existingNicknames = new Set(allCustomers.map(c => (c.nickname || '').toLowerCase()));
    const importedNicknames = new Set();
    
    jsonData.forEach((row) => {
        const nickname = getValue(row, columnMap.nickname);
        if (!nickname) return;
        
        const nicknameLower = nickname.toLowerCase();
        const isDuplicate = existingNicknames.has(nicknameLower) || importedNicknames.has(nicknameLower);
        
        if (isDuplicate) {
            duplicateCount++;
        } else {
            newCount++;
            importedNicknames.add(nicknameLower);
        }
        
        let birthday = getValue(row, columnMap.birthday);
        if (birthday && birthday.includes('/')) {
            const parts = birthday.split('/');
            if (parts.length === 3) {
                let [day, month, year] = parts;
                year = parseInt(year);
                if (year > 2500) year -= 543;
                birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
        
        let telephone = getValue(row, columnMap.telephone);
        if (telephone) {
            telephone = String(telephone).replace(/\D/g, '');
            if (telephone.length === 9) telephone = '0' + telephone;
        }
        
        let idCard = getValue(row, columnMap.idCard);
        if (idCard) {
            idCard = String(idCard).replace(/\D/g, '');
            if (idCard.length < 13 && idCard.length > 0) {
                idCard = idCard.padStart(13, '0');
            }
            if (idCard.length !== 13) idCard = '';
        }
        
        importData.push({
            nickname: nickname,
            nameSurname: getValue(row, columnMap.nameSurname),
            idCard: idCard,
            telephone: telephone,
            birthday: birthday,
            address: getValue(row, columnMap.address),
            isDuplicate: isDuplicate
        });
    });
    
    document.getElementById("statTotal").textContent = importData.length;
    document.getElementById("statNew").textContent = newCount;
    document.getElementById("statDuplicate").textContent = duplicateCount;
    document.getElementById("importStats").style.display = "grid";
    
    renderImportPreview();
    
    if (newCount > 0) {
        document.getElementById("startImportBtn").style.display = "inline-block";
    }
    
    document.getElementById("dropZone").style.display = "none";
}

// ============ RENDER IMPORT PREVIEW ============
function renderImportPreview() {
    const tbody = document.getElementById("previewTableBody");
    tbody.innerHTML = "";
    
    importData.slice(0, 50).forEach((item) => {
        const row = document.createElement("tr");
        row.style.opacity = item.isDuplicate ? "0.5" : "1";
        row.innerHTML = `
            <td>${item.isDuplicate ? '⚠️ ซ้ำ' : '✅ ใหม่'}</td>
            <td>${item.nickname}</td>
            <td>${item.nameSurname || '-'}</td>
            <td>${item.idCard ? item.idCard.substring(0, 4) + '...' : '-'}</td>
            <td>${item.telephone || '-'}</td>
        `;
        tbody.appendChild(row);
    });
    
    if (importData.length > 50) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="5" style="text-align:center;color:#999;">... และอีก ${importData.length - 50} รายการ</td>`;
        tbody.appendChild(row);
    }
    
    document.getElementById("importPreview").style.display = "block";
}

// ============ START IMPORT ============
async function startImport() {
    const newItems = importData.filter(item => !item.isDuplicate);
    if (newItems.length === 0) {
        alert("❌ ไม่มีข้อมูลใหม่ให้ Import");
        return;
    }
    
    if (!confirm(`ยืนยันการ Import ข้อมูล ${newItems.length} รายการ?`)) return;
    
    const startBtn = document.getElementById("startImportBtn");
    startBtn.disabled = true;
    startBtn.textContent = "กำลัง Import...";
    document.getElementById("importProgress").style.display = "block";
    document.getElementById("importLog").style.display = "block";
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        
        try {
            await db.collection("customers").add({
                nickname: item.nickname,
                nameSurname: item.nameSurname,
                idCard: item.idCard,
                telephone: item.telephone,
                birthday: item.birthday,
                address: item.address,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            success++;
            logImport(`✅ ${item.nickname} - สำเร็จ`, 'success');
            
        } catch (error) {
            failed++;
            logImport(`❌ ${item.nickname} - ${error.message}`, 'error');
        }
        
        const percent = Math.round(((i + 1) / newItems.length) * 100);
        document.getElementById("progressFill").style.width = percent + '%';
        document.getElementById("progressFill").textContent = percent + '%';
        
        await new Promise(r => setTimeout(r, 50));
    }
    
    logImport(``, '');
    logImport(`🎉 Import เสร็จสิ้น! สำเร็จ ${success} รายการ, ผิดพลาด ${failed} รายการ`, 'success');
    
    startBtn.textContent = "✅ Import เสร็จสิ้น";
    
    setTimeout(() => {
        loadCustomerList();
    }, 1000);
}

function logImport(message, type) {
    const log = document.getElementById("importLog");
    const div = document.createElement("div");
    div.className = type;
    div.textContent = message;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// ============ DOWNLOAD TEMPLATE ============
function downloadTemplate() {
    const headers = ["nickname", "Name - Surname", "ID Card", "Telephone", "Birthday", "Addresses"];
    const sample = ["ตัวอย่าง", "นายตัวอย่าง ทดสอบ", "1234567890123", "0812345678", "01/01/2530", "123 หมู่ 1 ต.ตัวอย่าง อ.ทดสอบ จ.ทดสอบ"];
    
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + sample.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'customer_template.csv';
    link.click();
}

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
    
    const isDuplicate = allCustomers.some(c => {
        if (editingId && c.id === editingId) return false;
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

        allCustomers.sort(sortThaiAlphabet);
        renderCustomerTable(allCustomers);
        document.getElementById("customerCount").textContent = allCustomers.length;

        console.log("✅ Customers loaded:", allCustomers.length);

    } catch (error) {
        console.error("❌ Firebase Error:", error);
    }
}

// ============ RENDER TABLE ============
function renderCustomerTable(customers) {
    const tbody = document.getElementById("customerTableBody");
    tbody.innerHTML = "";
    
    if (customers.length === 0) {
        tbody.innerHTML = `
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
                <button class="btn-action btn-detail" onclick="viewCustomerHistory('${customer.id}')" title="ประวัติ">📊</button>
                <button class="btn-action btn-edit" onclick="editCustomer('${customer.id}')" title="แก้ไข">✏️</button>
                <button class="btn-action btn-delete" onclick="deleteCustomer('${customer.id}')" title="ลบ">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
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

// ============ VIEW HISTORY ============
async function viewCustomerHistory(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    try {
        const snapshot = await db.collection("loans").where("customerId", "==", customerId).get();
        
        let totalPrincipal = 0;
        let totalInterest = 0;
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            count++;
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
จำนวนครั้งที่กู้: ${count} ครั้ง
รวมเงินต้น: ${totalPrincipal.toLocaleString()} บาท
รวมดอกเบี้ย: ${totalInterest.toLocaleString()} บาท
รวมทั้งสิ้น: ${(totalPrincipal + totalInterest).toLocaleString()} บาท
        `.trim());

    } catch (error) {
        alert(`📊 ${customer.nickname}\nยังไม่มีประวัติการกู้`);
    }
}

// ============ FORM SUBMIT HANDLER ============
async function handleCustomerSubmit(e) {
    e.preventDefault();
    
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
            await db.collection("customers").doc(editingId).update(customerData);
            alert("✅ อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว!");
        } else {
            const existing = await db.collection("customers").where("nickname", "==", customerData.nickname).get();
            if (!existing.empty) {
                alert("❌ ชื่อเล่นนี้มีอยู่ในระบบแล้ว");
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
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 บันทึกข้อมูล";
    }
}

// ============ EDIT CUSTOMER ============
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
    document.getElementById("customerModal").style.display = "block";
}

// ============ DELETE CUSTOMER ============
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

// ============ EXPORT ============
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
