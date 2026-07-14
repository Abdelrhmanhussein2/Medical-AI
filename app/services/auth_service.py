from typing import Optional
from app.core.database import db
from app.core.security import verify_password, create_access_token
from app.schemes.auth_schema import Token

class AuthService:
    @staticmethod
    async def authenticate_user(email: str, password: str, role: str) -> Optional[dict]:
        """
        Authenticate a user by email, password, and role (admin, doctor, patient).
        Returns the user record if valid, otherwise None.
        """
        table_map = {
            "admin": "admins",
            "department": "departments",
            "doctor": "doctors",
            "patient": "patients"
        }
        
        table = table_map.get(role)
        if not table:
            return None

        async with db.pool.acquire() as connection:
            query = f"SELECT * FROM {table} WHERE email = $1"
            user = await connection.fetchrow(query, email)
            
            if not user:
                return None
                
            # Patients might not have passwords in all implementations, but assuming they do here
            if "password_hash" not in user:
                return None
                
            if not verify_password(password, user["password_hash"]):
                return None
                
            # If doctor, check if they are active and approved
            if role == "doctor":
                if not user["is_active"]:
                    return None
                # Pending doctors can login but might have restricted access, 
                # we can return the user and let the controller decide what to do.

            return dict(user)

    @staticmethod
    def create_token(user_email: str, role: str) -> Token:
        access_token = create_access_token(subject=user_email)
        return Token(access_token=access_token, token_type="bearer")

auth_service = AuthService()
