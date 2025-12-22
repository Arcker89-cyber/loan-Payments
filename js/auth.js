function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        window.location.href = "dashboard.html";
      })
      .catch(err => alert(err.message));
  }
  
  function logout() {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  }
  
  // ป้องกันเข้า dashboard โดยไม่ login
  auth.onAuthStateChanged(user => {
    if (!user && location.pathname.includes("dashboard")) {
      window.location.href = "index.html";
    }
  });
  