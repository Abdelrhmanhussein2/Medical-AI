from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import db
from app.core.redis import redis_client
from typing import Optional

security = HTTPBearer(auto_error=False)

async def is_token_blacklisted(token: str) -> bool:
    if not redis_client.redis:
        await redis_client.connect()
    exists = await redis_client.redis.exists(f"bl:{token}")
    return exists > 0

async def blacklist_token(token: str, expire_seconds: int):
    if not redis_client.redis:
        await redis_client.connect()
    await redis_client.redis.set(f"bl:{token}", "1", ex=expire_seconds)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Dependency to validate the JWT bearer token (from Authorization header or access_token cookie)
    and return the logged in user's details.
    """
    token = None
    if credentials and credentials.credentials and credentials.credentials not in ("null", "undefined", ""):
        token = credentials.credentials
    else:
        token = request.cookies.get("access_token")

    if not token or token in ("null", "undefined", ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="تسجيل الدخول مطلوب للوصول إلى هذا المورد.",
        )

    # Check Redis Blacklist
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="تم إلغاء صلاحية هذا التوكن بسبب تسجيل الخروج.",
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing email subject",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    # Search for user across tables (since email is unique globally in this schema)
    async with db.pool.acquire() as connection:
        # Check doctors
        doc = await connection.fetchrow("SELECT id, email, name, 'doctor' as role, department_id, is_active, must_change_password FROM doctors WHERE email = $1", email)
        if doc:
            if not doc["is_active"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="هذا الحساب معطل حالياً من قبل الإدارة."
                )
            return dict(doc)
        # Check departments
        dept = await connection.fetchrow("SELECT id, email, name, 'department' as role, is_active FROM departments WHERE email = $1", email)
        if dept:
            if not dept["is_active"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="هذه المنظمة معطلة حالياً من قبل الإدارة."
                )
            return dict(dept)
        # Check admins
        admin = await connection.fetchrow("SELECT id, email, name, 'admin' as role FROM admins WHERE email = $1", email)
        if admin:
            return dict(admin)
        # Check patients
        pat = await connection.fetchrow("SELECT id, email, name, 'patient' as role FROM patients WHERE email = $1", email)
        if pat:
            return dict(pat)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User not found",
    )


def require_role(allowed_role: str):
    """
    Dependency factory to check if the current user has the required role.
    """
    async def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != allowed_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="غير مصرح لك بالوصول إلى هذا الجزء"
            )
        return current_user
    return dependency

# Helper dependencies
require_admin = require_role("admin")
require_doctor = require_role("doctor")
require_department = require_role("department")

