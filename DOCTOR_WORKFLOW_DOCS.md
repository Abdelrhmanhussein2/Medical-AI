# 📋 الـ Endpoints الجديدة (Doctor Workflow)

> **Base URL:** `http://localhost:8000/api/v1`

---

## 4. 👤 Patients

### ➕ إضافة مريض جديد
```
POST /api/v1/patients/
Content-Type: application/json
```
```json
{
  "name": "محمد علي",
  "phone": "01012345678",
  "email": "patient@example.com",
  "national_id": "30001011234567",
  "date_of_birth": "2000-01-01",
  "gender": "male"
}
```
> `email`, `national_id`, `date_of_birth`, `gender` كلها اختيارية — الإلزامي بس `name` و `phone`

---

### 🔍 البحث عن مريض (بالاسم أو التليفون)
```
GET /api/v1/patients/?q=محمد
GET /api/v1/patients/?q=0101234
```
> بتكتب أي جزء من الاسم أو التليفون وهيجيبلك النتايج

---

### 🔎 جلب مريض بالـ ID
```
GET /api/v1/patients/{patient_id}
```
**مثال:**
```
GET /api/v1/patients/afe06dbf-28f1-43aa-9e1b-d096dd713a84
```

---

## 5. 📅 Appointments (المواعيد)

### ➕ حجز موعد جديد
```
POST /api/v1/appointments/
Content-Type: application/json
```
```json
{
  "doctor_id": "UUID_الدكتور_هنا",
  "patient_id": "UUID_المريض_هنا",
  "appointment_date": "2026-07-15",
  "appointment_time": "10:00:00",
  "duration_minutes": 30,
  "description": "كشف دوري",
  "patient_phone": "01012345678"
}
```
> `description`, `patient_phone`, `duration_minutes` اختيارية

---

### 📋 مواعيد الدكتور (كلها)
```
GET /api/v1/appointments/my?doctor_id=UUID_الدكتور_هنا
```

---

### 📋 مواعيد الدكتور (يوم معين)
```
GET /api/v1/appointments/my?doctor_id=UUID_الدكتور_هنا&date=2026-07-15
```

---

### 🔎 تفاصيل موعد معين
```
GET /api/v1/appointments/{appointment_id}
```

---

### ✏️ تغيير حالة موعد
```
PATCH /api/v1/appointments/{appointment_id}/status
Content-Type: application/json
```
```json
{
  "status": "confirmed"
}
```
**الحالات المتاحة:**
| الحالة | المعنى |
|---|---|
| `scheduled` | محجوز (الافتراضي) |
| `confirmed` | مؤكد |
| `completed` | تم |
| `cancelled` | ملغي |
| `no_show` | المريض لم يحضر |

---

## 6. 📝 Visits (السامري الطبي)

### ➕ إنشاء سامري زيارة
```
POST /api/v1/visits/
Content-Type: application/json
```
```json
{
  "patient_id": "UUID_المريض_هنا",
  "doctor_id": "UUID_الدكتور_هنا",
  "appointment_id": null,
  "visit_date": "2026-07-11",
  "description": "المريض يشكو من صداع مستمر لمدة 3 أيام",
  "diagnosis": "صداع توتري",
  "notes": "تم وصف مسكنات وراحة تامة لمدة يومين"
}
```
> `appointment_id`, `visit_date`, `description`, `diagnosis`, `notes` كلها اختيارية
> `visit_date` لو مش محدود هيحط تاريخ اليوم تلقائياً

---

### 📋 التاريخ الطبي لمريض (كل زياراته)
```
GET /api/v1/visits/patient/{patient_id}
```
**مثال:**
```
GET /api/v1/visits/patient/afe06dbf-28f1-43aa-9e1b-d096dd713a84
```

---

### 🔎 تفاصيل زيارة واحدة
```
GET /api/v1/visits/{visit_id}
```

---

## 🔄 الـ Flow الكامل خطوة خطوة

```
1. Login Doctor          → POST /auth/login?role=doctor
                           ← هتاخد access_token

2. سرش على مريض         → GET /patients/?q=اسم أو تليفون
   لو مش موجود أضفه     → POST /patients/

3. احجز موعد            → POST /appointments/
                           (حط doctor_id + patient_id)

4. شوف مواعيد اليوم     → GET /appointments/my?doctor_id=...&date=2026-07-11

5. بعد الكشف غير الحالة → PATCH /appointments/{id}/status
                           {"status": "completed"}

6. اكتب السامري         → POST /visits/
                           (وصف + تشخيص + ملاحظات)

7. شوف التاريخ الطبي    → GET /visits/patient/{patient_id}
```
