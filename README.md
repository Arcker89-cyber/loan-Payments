# 💰 Loan Payment System

ระบบจัดการเงินกู้ - สำหรับบันทึกและติดตามข้อมูลการปล่อยกู้

## ✨ Features

- 🔐 ระบบ Login ด้วย Firebase Authentication
- 📊 Dashboard แสดงสรุปยอดเงินกู้
- 📈 กราฟแสดงยอดปล่อยกู้รายเดือน
- 📋 ตารางรายการเงินกู้ครบ 17 คอลัมน์
- 👥 ระบบจัดการข้อมูลลูกค้าแยกต่างหาก
- 🔍 กรองข้อมูลตามช่วงวันที่
- 📥 Export ข้อมูลเป็น CSV
- 📱 Responsive Design

## 📊 คอลัมน์ในตาราง Dashboard

| # | คอลัมน์ | คำอธิบาย |
|---|---------|----------|
| 1 | No. | ลำดับ |
| 2 | Nickname | ชื่อเล่น |
| 3 | Name - Surname | ชื่อ-นามสกุล |
| 4 | ID Card | เลขบัตรประชาชน |
| 5 | Telephone | เบอร์โทรศัพท์ |
| 6 | Birthday | วันเกิด |
| 7 | Addresses | ที่อยู่ |
| 8 | วันที่กู้ | วันที่ทำสัญญา |
| 9 | วันที่คืน | วันครบกำหนด |
| 10 | เงินต้น | จำนวนเงินต้น |
| 11 | ประเภทดอกเบี้ย | รายวัน/รายสัปดาห์/รายเดือน/คงที่ |
| 12 | ดอกเบี้ย | จำนวนดอกเบี้ย |
| 13 | ต้น + ดอก | รวมเงินต้นและดอกเบี้ย |
| 14 | สรุป | หมายเหตุ/สรุป |
| 15 | สถานะการกู้ | กำลังผ่อน/ค้างชำระ/คืนแล้ว |
| 16 | เอกสาร | เอกสารที่เกี่ยวข้อง |
| 17 | จัดการ | ปุ่ม ดู/แก้ไข/ลบ |

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Firebase
  - Authentication (Email/Password)
  - Firestore Database
- **Chart:** Chart.js

## 📁 โครงสร้างโปรเจกต์

```
loan-system/
├── css/
│   └── style.css        # Stylesheet
├── js/
│   ├── firebase.js      # Firebase configuration
│   ├── auth.js          # Authentication functions
│   ├── loans.js         # Loan management + Export CSV
│   └── customers.js     # Customer management
├── index.html           # Login page
├── dashboard.html       # Main dashboard
├── customers.html       # Customer management page
├── README.md
└── .gitignore
```

## 🚀 Setup & Installation

### 1. สร้าง Firebase Project

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. สร้าง Project ใหม่
3. เปิดใช้งาน **Authentication** > Sign-in method > Email/Password
4. สร้าง **Firestore Database**

### 2. ตั้งค่า Firebase Config

แก้ไขไฟล์ `js/firebase.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. สร้าง Firestore Index

หากพบ Error เรื่อง Index ใน Console ให้คลิกลิงก์ที่แสดงเพื่อสร้าง Index

### 4. สร้าง User สำหรับ Login

ใน Firebase Console > Authentication > Users > Add user

## 📝 Firestore Structure

### Collection: `loans`
```
loans (collection)
├── {documentId}
│   ├── nickname: string
│   ├── nameSurname: string
│   ├── idCard: string
│   ├── telephone: string
│   ├── birthday: string (YYYY-MM-DD)
│   ├── address: string
│   ├── loanDate: string (YYYY-MM-DD)
│   ├── returnDate: string (YYYY-MM-DD)
│   ├── principal: number
│   ├── interestType: string
│   ├── interest: number
│   ├── status: string
│   ├── summary: string
│   ├── documents: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
```

### Collection: `customers`
```
customers (collection)
├── {documentId}
│   ├── nickname: string
│   ├── nameSurname: string
│   ├── idCard: string
│   ├── telephone: string
│   ├── birthday: string (YYYY-MM-DD)
│   ├── address: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
```

## 🔒 Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /loans/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /customers/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📜 License

MIT License

---

Made with ❤️ for loan management
