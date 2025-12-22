firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    console.log("Logged in as", user.email);
  }
});

function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "index.html";
  });
}
