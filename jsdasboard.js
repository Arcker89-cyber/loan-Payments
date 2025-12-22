// ---------------- Firebase Setup ----------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------------- โหลดข้อมูล ----------------
async function loadData(start=null, end=null){
  let query = db.collection('loans');
  if(start && end){
    query = query.where('loanDate', '>=', start).where('loanDate', '<=', end);
  }
  const snapshot = await query.get();
  let total = 0, paid = 0;
  const monthlyData = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    total += data.principal || 0;
    paid += data.paid || 0;

    const month = new Date(data.loanDate.seconds*1000).toLocaleString('th-TH', { month: 'short', year: 'numeric'});
    if(!monthlyData[month]) monthlyData[month] = 0;
    monthlyData[month] += data.principal || 0;
  });

  document.getElementById('totalLoans').innerText = total.toLocaleString() + ' ฿';
  document.getElementById('paidAmount').innerText = paid.toLocaleString() + ' ฿';

  renderChart(monthlyData);
}

// ---------------- แสดงกราฟ ----------------
let chartInstance = null;
function renderChart(dataObj){
  const labels = Object.keys(dataObj);
  const data = Object.values(dataObj);

  const ctx = document.getElementById('loanChart').getContext('2d');
  if(chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'ยอดเงินกู้รายเดือน',
        data: data,
        backgroundColor: '#007bff'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

// ---------------- ฟิลเตอร์ ----------------
document.getElementById('filterBtn').addEventListener('click', () => {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  if(start && end){
    loadData(new Date(start), new Date(end));
  } else {
    loadData();
  }
});

// ---------------- Modal ----------------
const modal = document.getElementById('loanModal');
document.getElementById('openModalBtn').onclick = () => { modal.style.display = 'block'; }
document.querySelector('.modal .close').onclick = () => { modal.style.display = 'none'; }
window.onclick = (e) => { if(e.target==modal) modal.style.display = 'none'; }

// ---------------- Form เพิ่มเงินกู้ ----------------
document.getElementById('loanForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const newLoan = {
    nickname: document.getElementById('nickname').value,
    nameSurname: document.getElementById('nameSurname').value,
    idCard: document.getElementById('idCard').value,
    telephone: document.getElementById('telephone').value,
    birthday: document.getElementById('birthday').value,
    address: document.getElementById('address').value,
    loanDate: new Date(document.getElementById('loanDate').value),
    returnDate: new Date(document.getElementById('returnDate').value),
    principal: Number(document.getElementById('principal').value),
    interestType: document.getElementById('interestType').value,
    interest: Number(document.getElementById('interest').value),
    status: document.getElementById('status').value,
    paid: 0
  };
  await db.collection('loans').add(newLoan);
  modal.style.display = 'none';
  loadData();
  document.getElementById('loanForm').reset();
});

// โหลดเริ่มต้น
loadData();
