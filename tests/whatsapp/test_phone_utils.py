from app.services.whatsapp.phone_utils import normalize_phone

def test_normalize_phone_saudi_local():
    # 05xxxxxxxx -> 9665xxxxxxxx
    assert normalize_phone("0512345678", "966") == "966512345678"

def test_normalize_phone_saudi_bare():
    # 5xxxxxxxx -> 9665xxxxxxxx
    assert normalize_phone("512345678", "966") == "966512345678"

def test_normalize_phone_saudi_international_plus():
    # +9665xxxxxxxx -> 9665xxxxxxxx
    assert normalize_phone("+966512345678", "966") == "966512345678"

def test_normalize_phone_saudi_international_no_plus():
    # 9665xxxxxxxx -> 9665xxxxxxxx
    assert normalize_phone("966512345678", "966") == "966512345678"

def test_normalize_phone_saudi_spaces_dashes():
    # spaces and dashes removed
    assert normalize_phone(" +966 51-234-5678 ", "966") == "966512345678"

def test_normalize_phone_saudi_accidental_zero():
    # 96605xxxxxxxx -> 9665xxxxxxxx
    assert normalize_phone("9660512345678", "966") == "966512345678"

def test_normalize_phone_generic_other_country():
    # E.g. Egypt (20) with local number 01012345678
    assert normalize_phone("01012345678", "20") == "201012345678"
    assert normalize_phone("+201012345678", "20") == "201012345678"
