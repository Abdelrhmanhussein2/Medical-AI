import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta
from uuid import uuid4

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.core.database import db
from app.core.dependencies import is_token_blacklisted

client = TestClient(app)

# Test users
DOCTOR_EMAIL = "doctor_tamper_test@example.com"
ADMIN_EMAIL = "admin_tamper_test@example.com"

doctor_db_record = {
    "id": str(uuid4()),
    "email": DOCTOR_EMAIL,
    "name": "Dr. Test",
    "role": "doctor",
    "department_id": None,
    "is_active": True,
    "must_change_password": False
}

admin_db_record = {
    "id": str(uuid4()),
    "email": ADMIN_EMAIL,
    "name": "Admin Tester",
    "role": "admin"
}


@pytest.fixture(autouse=True)
def mock_redis_blacklist():
    """Mock Redis blacklist check to always return False for tests."""
    with patch("app.core.dependencies.is_token_blacklisted", new_callable=AsyncMock) as mock_bl:
        mock_bl.return_value = False
        yield mock_bl


# ─────────────────────────────────────────────────────────────
# 1. الطبيب يسجل دخول ويحصل على توكن دور "doctor" شرعي
#    يحاول الوصول لصفحات الإدارة -> يرجع 403 Forbidden
# ─────────────────────────────────────────────────────────────
def test_legitimate_doctor_token_accessing_admin_endpoint_forbidden():
    """
    طبيب معه توكن حقيقي موقع من السيرفر بصلاحية 'doctor'.
    يحاول فتح مسار إداري /api/v1/admins/dashboard/stats
    النتيجة المتوقعة: 403 Forbidden (غير مصرح).
    """
    token = create_access_token(subject=DOCTOR_EMAIL, role="doctor")

    async def mock_fetchrow(query, email):
        if "doctors" in query and email == DOCTOR_EMAIL:
            return doctor_db_record
        return None

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(side_effect=mock_fetchrow)

    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

    with patch.object(db, "pool", mock_pool):
        response = client.get(
            "/api/v1/admins/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 403
        assert "غير مصرح لك بالوصول" in response.json()["detail"]


# ─────────────────────────────────────────────────────────────
# 2. المهاجم يعبث بالتوكن ويغير الرول إلى "admin" بمفتاح تزوير
#    (Tampered / Forged JWT Token with wrong signature)
# ─────────────────────────────────────────────────────────────
def test_tampered_role_with_fake_signature_unauthorized():
    """
    المهاجم فك التوكن وغير role إلى 'admin' ثم وقّعه بمفتاح عشوائي غير مفتاح السيرفر.
    النتيجة المتوقعة: 401 Unauthorized (فشل التوقيع الرقمي).
    """
    fake_secret = "attacker-fake-secret-key-123456"
    tampered_payload = {
        "sub": DOCTOR_EMAIL,
        "role": "admin",
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    tampered_token = jwt.encode(tampered_payload, fake_secret, algorithm="HS256")

    response = client.get(
        "/api/v1/admins/dashboard/stats",
        headers={"Authorization": f"Bearer {tampered_token}"}
    )

    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]


# ─────────────────────────────────────────────────────────────
# 3. محاولة تزوير رول لمستخدم غير موجود في جدول الأدمن
#    حتى لو التوكن حمل role='admin'، السيرفر يفحص جدول admins حصراً
# ─────────────────────────────────────────────────────────────
def test_forged_admin_role_not_found_in_admins_table():
    """
    لو توكن يحمل إيميل طبيب تم تزوير دوره لـ admin:
    get_current_user ستبحث في جدول admins فقط ولن تجده!
    النتيجة المتوقعة: 401 Unauthorized.
    """
    forged_token = create_access_token(subject=DOCTOR_EMAIL, role="admin")

    async def mock_fetchrow(query, email):
        # البحث في جدول admins فقط
        if "admins" in query and email == DOCTOR_EMAIL:
            return None # الطبيب غير موجود في جدول الأدمنز
        return None

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(side_effect=mock_fetchrow)

    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

    with patch.object(db, "pool", mock_pool):
        response = client.get(
            "/api/v1/admins/dashboard/stats",
            headers={"Authorization": f"Bearer {forged_token}"}
        )

        assert response.status_code == 401
        assert "المستخدم غير موجود أو الصلاحية غير متطابقة" in response.json()["detail"]


# ─────────────────────────────────────────────────────────────
# 4. توكن يفتقر لحقل role (توكن قديم أو غير مكتمل)
# ─────────────────────────────────────────────────────────────
def test_token_missing_role_rejected():
    """
    توكن لا يحتوي على ادعاء role على الإطلاق.
    النتيجة المتوقعة: 401 Unauthorized (يفتقر إلى بيانات الصلاحية).
    """
    to_encode = {
        "sub": DOCTOR_EMAIL,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    token_without_role = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

    response = client.get(
        "/api/v1/admins/dashboard/stats",
        headers={"Authorization": f"Bearer {token_without_role}"}
    )

    assert response.status_code == 401
    assert "يفتقر إلى بيانات الصلاحية" in response.json()["detail"]


# ─────────────────────────────────────────────────────────────
# 5. الأدمن الحقيقي الشرعي يدخل بنجاح
# ─────────────────────────────────────────────────────────────
def test_legitimate_admin_allowed():
    """
    أدمن حقيقي معه توكن شرعي بـ role='admin' وموجود فعلاً في جدول admins.
    النتيجة المتوقعة: 200 OK.
    """
    admin_token = create_access_token(subject=ADMIN_EMAIL, role="admin")

    async def mock_fetchrow(query, email):
        if "admins" in query and email == ADMIN_EMAIL:
            return admin_db_record
        return None

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(side_effect=mock_fetchrow)

    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

    with patch.object(db, "pool", mock_pool), \
         patch("app.services.admin_service.admin_service.get_dashboard_stats", new_callable=AsyncMock) as mock_stats:
        
        mock_stats.return_value = {"total_doctors": 5, "total_patients": 20}

        response = client.get(
            "/api/v1/admins/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        assert response.json() == {"total_doctors": 5, "total_patients": 20}

