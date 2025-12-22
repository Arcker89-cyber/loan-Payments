console.log("✅ loans.js loaded");

// Firebase Firestore ref
const db = firebase.firestore();
const loanTable = document.getElementById("loanTable").getElementsByTagName('tbody')[0];

// Modal
const modal = document.getElementById("loanModal");
const btnAddLoan = document.getElementById("addLoanBtn");
const spanClose = document.querySelector(".close");
const form = document.getElementById("loanForm");

// เปิด Modal
btnAddLoan.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if(event.target == modal) modal.style.display = "none"; }

// แสดงข้อมูลเงินกู้จาก Firestore
function loadLoans() {
  loanTable.innerHTML = "";
  db.collection("loans").orderBy("loanDate", "desc").get()
    .then(snapshot => {
      let i = 1;
      snapshot.forEach(doc => {
        const loan = doc.data();
        const row = loanTable.insertRow();
        row.innerHTML = `
          <td>${i++}</td>
          <td>${loan.nickname}</td>
          <td>${loan.principal}</td>
          <td>${loan.interest}</td>
          <td>${loan.status}</td>
        `;
      });
    })
    .catch(err => console.error(err));
}

// เพิ่มเงินกู้ใหม่
form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const newLoan = {
    nickname: document.getElementById("nickname").value,
    nameSurname: document.getElementById("nameSurname").value,
    idCard: document.getElementById("idCard").value,
    telephone: document.getElementById("telephone").value,
    birthday: document.getElementById("birthday").value,
    address: document.getElementById("address").value,
    loanDate: document.getElementById("loanDate").value,
    returnDate: document.getElementById("returnDate").value,
    principal: Number(document.getElementById("principal").value),
    interestType: document.getElementById("interestType").value,
    interest: Number(document.getElementById("interest").value),
    status: document.getElementById("status").value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection("loans").add(newLoan)
    .then(() => {
      console.log("💾 เพิ่มเงินกู้เรียบร้อย");
      form.reset();
      modal.style.display = "none";
      loadLoans();
    })
    .catch(err => console.error(err));
});

// โหลดตอนเริ่ม
firebase.auth().onAuthStateChanged(user => {
  if(user) {
    console.log("👤 Logged in as:", user.email);
    loadLoans();
  } else {
    window.location = "index.html"; // รีไดเรคไปหน้า login
  }
});
