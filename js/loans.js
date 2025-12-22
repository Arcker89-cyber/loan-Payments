
// ===============================
// loans.js
// ===============================

// 1️⃣ เช็กว่าไฟล์นี้ถูกโหลดจริง
console.log("✅ loans.js loaded");

// 2️⃣ ป้องกันการเข้า dashboard ถ้าไม่ได้ login
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    console.warn("⛔ Not logged in, redirect to login");
    window.location.href = "index.html";
  } else {
    console.log("👤 Logged in as:", user.email);
    loadLoans(); // เรียกโหลดข้อมูลเงินกู้
  }
});

// 3️⃣ ฟังก์ชันออกจากระบบ
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "index.html";
  });
}

// 4️⃣ โหลดข้อมูลเงินกู้ (ทดสอบก่อน)
function loadLoans() {
  const container = document.getElementById("loanList");
  if (!container) return;

  container.innerHTML = `
    <p>📄 กำลังโหลดข้อมูลเงินกู้...</p>
  `;

  // 🔹 ทดสอบด้วยข้อมูลจำลองก่อน
  setTimeout(() => {
    container.innerHTML = `
      <table border="1" cellpadding="6">
        <tr>
          <th>No.</th>
          <th>ชื่อเล่น</th>
          <th>เงินต้น</th>
          <th>ดอกเบี้ย</th>
          <th>สถานะ</th>
        </tr>
        <tr>
          <td>1</td>
          <td>สมชาย</td>
          <td>10,000</td>
          <td>500</td>
          <td>กำลังกู้</td>
        </tr>
      </table>
    `;
  }, 500);
}
