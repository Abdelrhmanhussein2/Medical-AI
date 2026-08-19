from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
#  Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class PaymentInitiateRequest(BaseModel):
    """
    Request body to initiate a Moyasar payment using a tokenized card.

    idempotency_key:
      The frontend MUST generate a UUID when the user starts a checkout
      attempt and store it in sessionStorage.  All retries of the SAME
      attempt (network failure, page refresh) send the SAME key — the
      backend returns the cached order and transaction_url immediately.

      Starting a fresh payment (new 'Pay' click, navigating back) MUST
      use a NEW UUID.  If the key is omitted the service generates a
      server-side fallback, but retry deduplication is then forfeited.
    """
    bundle_id:        UUID
    token:            str           # Moyasar card token (tok_xxxx)
    idempotency_key:  Optional[UUID] = None   # Client-generated checkout-attempt UUID

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("token_"):
            raise ValueError("رمز البطاقة (Token) غير صالح.")
        return v


class PaymentInitiateResponse(BaseModel):
    """Response after creating a Moyasar payment order."""
    payment_order_id: UUID          # Our internal DB UUID
    moyasar_payment_id: str         # Moyasar's payment ID
    amount: float                   # Amount in SAR (from DB, not frontend)
    currency: str                   # "SAR"
    status: str                     # "initiated"
    transaction_url: Optional[str]  # 3DS redirect URL (if required)
    message: str
    idempotent: bool = False        # True if this response was served from an existing order (duplicate request)



class PaymentCallbackVerifyResponse(BaseModel):
    """Returned by GET /payments/callback after server-side verification."""
    moyasar_payment_id: str
    status: str                     # Our internal status (paid/failed/etc.)
    moyasar_status: str             # Raw status string from Moyasar
    already_confirmed: bool = False
    message: Optional[str] = None   # Detailed decline reason from Moyasar credit card source


class PaymentOrderStatusResponse(BaseModel):
    """Status of a specific payment order (for frontend polling)."""
    payment_order_id: str
    moyasar_payment_id: Optional[str]
    amount: float
    currency: str
    status: str
    bundle_id: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  Moyasar Webhook payload schemas (for documentation / optional validation)
# ─────────────────────────────────────────────────────────────────────────────

class MoyasarWebhookSourceData(BaseModel):
    type: Optional[str] = None
    company: Optional[str] = None
    name: Optional[str] = None
    message: Optional[str] = None

    class Config:
        extra = "allow"


class MoyasarWebhookData(BaseModel):
    """Inner data object from Moyasar webhook payload."""
    id: str                             # Moyasar payment ID
    status: str                         # paid | failed | refunded
    amount: int                         # In halalas
    currency: str                       # SAR
    description: Optional[str] = None
    given_id: Optional[str] = None      # Our payment_order_id
    source: Optional[MoyasarWebhookSourceData] = None
    metadata: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        extra = "allow"


class MoyasarWebhookPayload(BaseModel):
    """Top-level Moyasar webhook envelope."""
    type: str                           # payment_paid | payment_failed | payment_refunded
    data: MoyasarWebhookData

    class Config:
        extra = "allow"
