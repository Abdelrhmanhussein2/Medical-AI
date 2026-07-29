import re
from app.core.config import settings

def normalize_phone(phone: str, default_country_code: str = None) -> str:
    """
    Normalizes phone numbers to standard format for WhatsApp/Evolution API.
    Evolution API expects format: <country_code><number> (e.g. 966512345678)
    without leading '+', '00', or any spaces/dashes.
    
    Default country code is taken from settings (default: '966' for Saudi Arabia).
    """
    if not phone:
        return ""
        
    if default_country_code is None:
        default_country_code = settings.PHONE_DEFAULT_COUNTRY_CODE

    # Strip all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Strip leading '00' if it was added as international prefix
    if phone.startswith('00') and len(digits) > 2:
        digits = digits[2:]

    # Auto-detect Egypt (20) locally formatted numbers starting with 01 (11 digits)
    if digits.startswith("01") and len(digits) == 11:
        return "20" + digits[1:]

    # For Saudi Arabia (966):
    if default_country_code == "966":
        # Case: 05xxxxxxxx (10 digits local) -> 9665xxxxxxxx
        if digits.startswith("05") and len(digits) == 10:
            return "966" + digits[1:]
        # Case: 5xxxxxxxx (9 digits bare) -> 9665xxxxxxxx
        if digits.startswith("5") and len(digits) == 9:
            return "966" + digits
        # Case: already prefixed with 966
        if digits.startswith("966"):
            # Sometimes users write 96605xxxxxxxx (13 digits) or similar by mistake
            if len(digits) == 13 and digits[3] == "0":
                return "966" + digits[4:]
            if len(digits) == 12 and digits[3] == "0":
                return "966" + digits[4:]
            return digits
            
    # Generic fallback normalization:
    # If the number starts with 0 and we want to prepend country code:
    if digits.startswith("0") and len(digits) > 4:
        return default_country_code + digits[1:]
    
    # If it already seems to have country code or doesn't start with 0
    if len(digits) > 7 and not digits.startswith(default_country_code):
        # If it doesn't start with the default country code, but has enough length,
        # it might have another country code, return as is.
        return digits
        
    if not digits.startswith(default_country_code):
        return default_country_code + digits
        
    return digits
