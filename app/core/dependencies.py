from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import db

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to validate the JWT bearer token and return the logged in user's details.
    """
    token = credentials.credentials
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
        doc = await connection.fetchrow("SELECT id, email, name, 'doctor' as role, department_id, is_active FROM doctors WHERE email = $1", email)
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
