// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXtDqWSxlFxkHjXmbG3V7P3-niJmV47yA",
  authDomain: "loan-payments-a302b.firebaseapp.com",
  projectId: "loan-payments-a302b",
  storageBucket: "loan-payments-a302b.appspot.com",
  messagingSenderId: "989223042934",
  appId: "1:989223042934:web:5f13e17eadea1000b88457",
  measurementId: "G-TG1941VPKD"
};

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);

// Global objects
const auth = firebase.auth();
const db = firebase.firestore();
