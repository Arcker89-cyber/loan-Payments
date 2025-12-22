auth.onAuthStateChanged(user => {
    if (!user) return;
  
    db.collection("loans").onSnapshot(snapshot => {
      const tb = document.getElementById("loanTable");
      tb.innerHTML = "";
      let i = 1;
  
      snapshot.forEach(doc => {
        const d = doc.data();
        tb.innerHTML += `
          <tr>
            <td>${i++}</td>
            <td>${d.fullname}</td>
            <td>${d.principal}</td>
            <td>${d.interest}</td>
            <td>${d.status}</td>
          </tr>
        `;
      });
    });
  });
  