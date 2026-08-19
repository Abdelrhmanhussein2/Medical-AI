"""
payment_controller.py
=====================
FastAPI endpoints for the Moyasar payment gateway.

Endpoints:
  POST /payments/initiate     — Authenticated; creates Moyasar payment with real DB amount
  GET  /payments/callback     — Public; server-side verification after 3DS redirect
  POST /payments/webhook      — Public (HMAC-verified); Moyasar server callback
  GET  /payments/order/{id}   — Authenticated; query payment order status
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Header, status, Response
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.schemes.payment_schema import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentCallbackVerifyResponse,
)
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


# ─────────────────────────────────────────────────────────────────────────────
#  1. Initiate Payment
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/config")
async def get_payment_config():
    """
    Returns public config required by frontend to interact with Moyasar directly.
    Only the Publishable Key and Currency are exposed.
    """
    return {
        "publishable_key": settings.MOYASAR_PUBLISHABLE_KEY,
        "currency": settings.MOYASAR_CURRENCY
    }


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    body: PaymentInitiateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Creates a Moyasar payment using a tokenized card and returns the 3DS `transaction_url`.

    Security guarantees:
    - Amount is fetched from PostgreSQL (bundle price) — frontend cannot inject an amount.
    - Card details are tokenized directly from the browser to Moyasar (never reaches our server).
    - `given_id` = payment_order UUID → Moyasar native idempotency (safe to retry).

    Flow:
      1. Fetch real bundle price from DB
      2. Create payment_order (status=pending)
      3. Call Moyasar POST /payments with the token + given_id
      4. Update payment_order (status=initiated, moyasar_payment_id)
      5. Return transaction_url for 3DS redirect
    """
    user_id = str(current_user["id"])
    role = current_user.get("role", "doctor")
    is_department = role in ("department", "org")

    # Build callback URL: Moyasar redirects the customer here after 3DS
    callback_url = f"{settings.FRONTEND_URL}/payment/callback"

    try:
        result = await PaymentService.initiate_payment(
            user_id=user_id,
            bundle_id=str(body.bundle_id),
            is_department=is_department,
            callback_url=callback_url,
            token=body.token,
            idempotency_key=str(body.idempotency_key) if body.idempotency_key else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("initiate_payment failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="فشل في إنشاء طلب الدفع. يرجى المحاولة مجدداً.",
        )

    return PaymentInitiateResponse(**result)


# ─────────────────────────────────────────────────────────────────────────────
#  2. Payment Callback (Frontend redirect after 3DS)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/callback", response_model=PaymentCallbackVerifyResponse)
async def payment_callback(
    response: Response,                # Inject response to add cache control headers
    id: Optional[str] = None,          # Moyasar payment ID
    status: Optional[str] = None,      # URL param from Moyasar (not trusted)
    message: Optional[str] = None,     # Human-readable from Moyasar
):
    """
    Called by PaymentCallback.jsx (React page) after the customer completes 3DS.

    Moyasar appends: ?id=<payment_id>&status=<status>&message=<msg>
    We IGNORE the URL `status` param and re-verify directly with Moyasar API.

    Security:
    - status in URL is NOT trusted — we fetch from Moyasar server-side.
    - Amount + currency are verified against our stored payment_order.
    - Subscription is only activated if amount/currency/status match.
    """
    if not id:
        raise HTTPException(status_code=400, detail="Missing payment ID in callback.")

    try:
        result = await PaymentService.verify_payment_callback(moyasar_payment_id=id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("payment_callback verification failed for %s: %s", id, exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="فشل في التحقق من حالة الدفع.",
        )

    # Set strict cache prevention headers
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return PaymentCallbackVerifyResponse(**result)


# ─────────────────────────────────────────────────────────────────────────────
#  3. Moyasar Webhook (Server-to-Server)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/webhook", status_code=200)
async def moyasar_webhook(
    request: Request,
):
    """
    Receives server-to-server webhook events from Moyasar.

    Security pipeline (in order):
      1. Read raw body.
      2. Parse payload and verify secret_token inside JSON body.
      3. Redis idempotency lock (SET NX, 24h TTL).
      4. Fetch payment_order from DB by given_id (idempotency_key).
      5. Verify amount + currency match (tamper prevention).
      6. DB-level idempotency: UPDATE WHERE status NOT IN ('paid','refunded').
      7. Activate subscription.

    Always returns HTTP 200 — even on internal errors — to prevent
    Moyasar from retrying endlessly and causing duplicate activations.
    Errors are logged with full details.
    """
    raw_body = await request.body()

    try:
        result = await PaymentService.handle_webhook(
            raw_body=raw_body,
        )
    except PermissionError as exc:
        logger.warning("Webhook secret token verification failed: %s", exc)
        raise HTTPException(status_code=403, detail="Invalid webhook secret token")
    except ValueError as exc:
        logger.warning("Webhook bad payload: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Webhook processing error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=200,
            content={"status": "error_logged", "detail": "Processing error — check server logs"},
        )

    return {"status": "ok", **result}


# ─────────────────────────────────────────────────────────────────────────────
#  4. Query Payment Order Status (for frontend polling)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/order/{payment_order_id}")
async def get_payment_order(
    payment_order_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the current status of a payment order.
    Only the owner (doctor or department) can query their own order.
    """
    from app.core.database import db

    async with db.pool.acquire() as conn:
        user_id = current_user["id"]
        role = current_user.get("role", "doctor")
        is_department = role in ("department", "org")

        if is_department:
            order = await conn.fetchrow(
                "SELECT * FROM payment_orders WHERE id = $1 AND department_id = $2",
                payment_order_id, user_id,
            )
        else:
            order = await conn.fetchrow(
                "SELECT * FROM payment_orders WHERE id = $1 AND doctor_id = $2",
                payment_order_id, user_id,
            )

        if not order:
            raise HTTPException(status_code=404, detail="طلب الدفع غير موجود.")

        return {
            "payment_order_id": str(order["id"]),
            "moyasar_payment_id": order["moyasar_payment_id"],
            "amount": float(order["amount"]),
            "currency": order["currency"],
            "status": order["status"],
            "bundle_id": str(order["bundle_id"]),
            "created_at": order["created_at"].isoformat(),
            "updated_at": order["updated_at"].isoformat(),
        }
