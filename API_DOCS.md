# 📝 Medical AI API Documentation

هذا الملف يوضح جميع الـ Endpoints المتاحة، والمدخلات (Inputs) المطلوبة لكل واحدة عشان تقدر تجربها بسهولة على Postman أو أي أداة تانية.

---

## 1. 👨‍⚕️ تسجيل دكتور جديد (Register Doctor)
- **المسار:** `POST /api/v1/doctors/register`
- **النوع:** `multipart/form-data` (عشان رفع الملفات)
- **المدخلات المطلوبة:**

| الحقل (Key) | النوع | القيمة المطلوبة |
|---|---|---|
| `name` | Text | اسم الدكتور (مثال: د. أحمد حسن) |
| `email` | Text | الإيميل (مثال: doctor@example.com) |
| `phone` | Text | رقم التليفون (مثال: 01012345678) |
| `password` | Text | كلمة السر |
| `certificate_file` | File | ملف إثبات المهنة/الشهادة (صورة أو PDF) |

---

## 2. 🔐 تسجيل الدخول (Login)
- **المسار:** `POST /api/v1/auth/login?role={role}`
- **النوع:** `application/json`
- **المدخلات في الرابط (Query Params):**
  - `role`: حدد نوع الحساب (`admin` أو `doctor` أو `patient`).
- **المدخلات في الـ Body (JSON):**
```json
{
  "email": "doctor@example.com",
  "password": "docpass123"
}
```

> **ملحوظة:** لتسجيل دخول كأدمن لتجربة النظام، استخدم الإيميل `admin@medical-ai.com` والباسورد `adminpassword123` مع تمرير `role=admin` في الرابط.

---

## 3. 🛡️ أدمن: عرض الدكاترة قيد المراجعة (Pending Doctors)
- **المسار:** `GET /api/v1/admins/doctors/pending`
- **النوع:** لا يوجد Body.
- **وصف:** يرجع قائمة بكل الدكاترة اللي سجلوا وحالتهم لسه `pending` عشان تطلع الـ `id` بتاع الدكتور وتوافق عليه.

---

## 4. 🛡️ أدمن: مراجعة دكتور (Approve / Reject)
- **المسار:** `POST /api/v1/admins/doctors/{doctor_id}/review`
- **النوع:** `application/json`
- **تغييرات الرابط:** استبدل `{doctor_id}` بالـ ID الخاص بالدكتور.
- **المدخلات المطلوبة:**
```json
{
  "admin_id": "497e7f05-e931-4eb1-b51b-a29bc9b8583d", 
  "status": "approved", 
  "rejection_reason": "" 
}
```
*(حالة `status` يجب أن تكون `approved` أو `rejected`)*

---

## 5. 🔑 طلب رمز التحقق (Request OTP)
- **المسار:** `POST /api/v1/auth/request-otp`
- **النوع:** `application/json`
- **المدخلات المطلوبة:**
```json
{
  "email": "doctor@example.com"
}
```
*(الـ API هترجعلك الـ OTP في الـ Response عشان تقدر تاخده وتجرب بيه في الخطوة اللي بعدها)*

---

## 6. ✔️ تأكيد رمز التحقق (Verify OTP)
- **المسار:** `POST /api/v1/auth/verify-otp`
- **النوع:** `application/json`
- **المدخلات المطلوبة:**
```json
{
  "email": "doctor@example.com",
  "otp": "123456"
}
```
