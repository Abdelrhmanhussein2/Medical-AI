import re
from fastapi import HTTPException, status

def validate_password_strength(password: str) -> None:
    """
    التحقق من قوة كلمة المرور قبل الحفظ.
    """
    errors = []
    if len(password) < 8:
        errors.append("لا تقل عن 8 أحرف")
    if not re.search(r"[A-Z]", password):
        errors.append("حرف كبير واحد على الأقل (A-Z)")
    if not re.search(r"[a-z]", password):
        errors.append("حرف صغير واحد على الأقل (a-z)")
    if not re.search(r"\d", password):
        errors.append("رقم واحد على الأقل (0-9)")
        
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"كلمة المرور ضعيفة. المطلوب: {' + '.join(errors)}"
        )
