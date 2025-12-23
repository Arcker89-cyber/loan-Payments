// ============ AUTH FUNCTIONS ============

// Login Function
function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("errorMsg");
    const loginBtn = document.querySelector(".login-container button");

    // Clear previous error
    errorMsg.textContent = "";

    // Validation
    if (!email || !password) {
        errorMsg.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
        return;
    }

    // Disable button while processing
    loginBtn.disabled = true;
    loginBtn.textContent = "กำลังเข้าสู่ระบบ...";

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("✅ Login successful:", userCredential.user.email);
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            console.error("❌ Login error:", error);
            
            // แปลง error message เป็นภาษาไทย
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMsg.textContent = "ไม่พบผู้ใช้งานนี้ในระบบ";
                    break;
                case 'auth/wrong-password':
                    errorMsg.textContent = "รหัสผ่านไม่ถูกต้อง";
                    break;
                case 'auth/invalid-email':
                    errorMsg.textContent = "รูปแบบอีเมลไม่ถูกต้อง";
                    break;
                case 'auth/too-many-requests':
                    errorMsg.textContent = "มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่";
                    break;
                default:
                    errorMsg.textContent = error.message;
            }
        })
        .finally(() => {
            loginBtn.disabled = false;
            loginBtn.textContent = "เข้าสู่ระบบ";
        });
}

// Logout Function
function logout() {
    auth.signOut()
        .then(() => {
            console.log("✅ Logout successful");
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("❌ Logout error:", error);
            alert("เกิดข้อผิดพลาดในการออกจากระบบ");
        });
}

// Allow login with Enter key
document.addEventListener("DOMContentLoaded", function() {
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                login();
            }
        });
    }
    
    const emailInput = document.getElementById("email");
    if (emailInput) {
        emailInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                document.getElementById("password").focus();
            }
        });
    }
});

console.log("✅ auth.js loaded");
