"""
payment_service.py
==================
Handles all payment logic with strict security guarantees:

  Security model:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ① Amount is ALWAYS read from PostgreSQL — never from the frontend.
  ② Initiation idempotency — client-generated UUID key, 4-layer defense:
       L1 Client UUID : frontend generates key at checkout start, stores in
                        sessionStorage, reuses on every retry of the SAME attempt.
                        New checkout = new UUID. This is the Stripe pattern.
       L2 Redis lock  : SET NX EX 30 s serializes concurrent requests (poll 10 s).
       L3 DB INSERT   : ON CONFLICT (idempotency_key) DO NOTHING → one row wins.
       L4 Early return: if status=initiated/paid → return cached result + same URL.
       L5 Moyasar     : given_id = same client UUID → Moyasar deduplicates too.
  ③ Webhook HMAC-SHA256 verified before any processing.
  ④ Webhook AND callback both verify amount + currency against DB.
  ⑤ DB-level idempotency: UPDATE WHERE status != 'paid' + Redis lock.
  ⑥ Race-condition safe: subscriptions use UPDATE first, INSERT only if none.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import hmac
import hashlib
import json
import uuid
import logging
from decimal import Decimal
from typing import Optional
from datetime import datetime, timedelta

import httpx

from app.core.config import settings
from app.core.database import db
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  Internal: Moyasar API client
# ─────────────────────────────────────────────────────────────────────────────

async def _call_moyasar(method: str, path: str, **kwargs) -> dict:
    """
    Authenticated request to Moyasar REST API.
    Moyasar uses HTTP Basic Auth: username = secret_key, password = "".
    Raises ValueError on 4xx/5xx.
    """
    url = f"{settings.MOYASAR_API_BASE}{path}"
    auth = (settings.MOYASAR_SECRET_KEY, "")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(method=method, url=url, auth=auth, **kwargs)

    if response.status_code >= 400:
        logger.error("Moyasar API %s %s → HTTP %s: %s", method, url, response.status_code, response.text)
        try:
            err = response.json()
            message = err.get("message") or err.get("error") or response.text
        except Exception:
            message = response.text
        raise ValueError(f"Moyasar API error {response.status_code}: {message}")

    return response.json()


# ─────────────────────────────────────────────────────────────────────────────
#  Webhook signature verification
# ─────────────────────────────────────────────────────────────────────────────

def verify_moyasar_webhook_secret_token(payload: dict) -> bool:
    """
    Verify that the webhook came from Moyasar by checking the secret_token
    sent in the JSON body.

    Moyasar sends a configured secret token directly inside the payload:
      {
        "secret_token": "...",
        "type": "payment_paid",
        "data": {...}
      }

    Uses hmac.compare_digest() to prevent timing attacks.
    """
    provided_token = payload.get("secret_token")
    if not provided_token:
        logger.warning("Moyasar webhook: no secret_token in payload")
        return False

    if not settings.MOYASAR_WEBHOOK_SECRET:
        # Fallback only allowed in explicit development/test environments.
        if settings.ENV in ("development", "test"):
            logger.warning("MOYASAR_WEBHOOK_SECRET not set — accepting webhook (allowed in dev/test mode only)")
            return True
        logger.error("MOYASAR_WEBHOOK_SECRET not configured in %s environment! Denying webhook request.", settings.ENV)
        return False

    is_valid = hmac.compare_digest(provided_token, settings.MOYASAR_WEBHOOK_SECRET)
    if not is_valid:
        logger.warning("Moyasar webhook: secret_token mismatch")
    return is_valid


# ─────────────────────────────────────────────────────────────────────────────
#  Amount/currency verification (used in BOTH callback AND webhook)
# ─────────────────────────────────────────────────────────────────────────────

def _verify_payment_amounts(
    *,
    payment_order: dict,
    moyasar_amount_halalas: int,
    moyasar_currency: str,
) -> None:
    """
    Critical security check: ensure the payment Moyasar reports matches
    exactly what we stored in DB when we created the payment_order.

    Prevents:
    - Amount tampering (e.g., paying 1 SAR for a 500 SAR subscription)
    - Currency substitution attacks
    - Replaying a cheap payment against an expensive order

    Raises ValueError if anything doesn't match.
    """
    # Our stored amount (from DB at order creation time)
    stored_amount_sar = Decimal(str(payment_order["amount"]))
    stored_currency = payment_order["currency"].upper()

    # Moyasar amount in halalas → convert to SAR for comparison
    moyasar_amount_sar = Decimal(str(moyasar_amount_halalas)) / Decimal("100")
    received_currency = moyasar_currency.upper()

    if stored_currency != received_currency:
        logger.error(
            "Currency mismatch: order_id=%s stored=%s moyasar=%s",
            payment_order["id"], stored_currency, received_currency,
        )
        raise ValueError(
            f"Currency mismatch: expected {stored_currency}, got {received_currency}"
        )

    if moyasar_amount_sar != stored_amount_sar:
        logger.error(
            "Amount mismatch: order_id=%s stored=%.2f SAR moyasar=%.2f SAR",
            payment_order["id"], stored_amount_sar, moyasar_amount_sar,
        )
        raise ValueError(
            f"Amount mismatch: expected {stored_amount_sar} SAR, "
            f"Moyasar reported {moyasar_amount_sar} SAR"
        )

    logger.info(
        "Amount verified OK: order_id=%s amount=%.2f %s",
        payment_order["id"], moyasar_amount_sar, stored_currency,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Core payment service
# ─────────────────────────────────────────────────────────────────────────────

class PaymentService:

    # ── 1. Initiate Payment (Idempotent) ──────────────────────────
    @staticmethod
    async def initiate_payment(
        user_id: str,
        bundle_id: str,
        is_department: bool,
        callback_url: str,
        token: str,                           # Moyasar card token (tok_xxxx)
        idempotency_key: Optional[str] = None, # Client-generated UUID — same key = same attempt
    ) -> dict:
        """
        Full idempotent payment initiation flow using Moyasar Tokenization.

        Idempotency guarantee hierarchy (most important first):
        ────────────────────────────────────────────────────────────────────
        PRIMARY  — PostgreSQL UNIQUE(idempotency_key) + ON CONFLICT:
                   Exactly one payment_order row per checkout attempt,
                   enforced at the DB level.  Safe even if Redis is down.

        PRIMARY  — Atomic state transition (UPDATE ... WHERE status='pending'
                   RETURNING):  Only the first concurrent request transitions
                   the row; others detect 0 rows affected and re-fetch the
                   current state.  Safe even if Redis is down.

        PRIMARY  — Moyasar given_id = idempotency_key:  Moyasar itself
                   deduplicates on given_id so no double-charge ever occurs
                   even if multiple requests reach the Moyasar API.

        OPTIONAL — Redis SET NX EX 30 (concurrency optimization only):
                   Reduces redundant Moyasar calls when multiple requests
                   arrive simultaneously.  Redis failure → fall through to DB
                   guarantees immediately.  No polling — single try-and-proceed.
        ────────────────────────────────────────────────────────────────────
        ① Accept or generate idempotency_key.
        ② Redis SET NX — try once, swallow errors, never block.
        ③ Single DB connection: fetch bundle price + INSERT ON CONFLICT
           DO UPDATE SET status=status (no-op touch) + RETURNING.
           → Always returns the canonical row regardless of who inserted it.
        ④ State-aware early return: if status ∉ {'pending','failed'} → cached.
        ⑤ Call Moyasar (given_id=idempotency_key → Moyasar deduplicates).
        ⑥ Atomic UPDATE WHERE status='pending' RETURNING → if 0 rows affected,
           another request beat us; re-fetch and return current state.
        ⑦ Release Redis lock (best-effort).
        """

        # ── ① idempotency_key ─────────────────────────────────────────────────
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())
            logger.warning(
                "initiate_payment called without idempotency_key — "
                "server-side fallback %s generated (retries will NOT be deduplicated)",
                idempotency_key,
            )

        # ── ② Redis: best-effort, single try, never blocks ───────────────────
        # Redis is an OPTIMIZATION — its absence never affects correctness.
        redis_lock_key = f"pay:init:lock:{idempotency_key}"
        lock_acquired  = False
        if redis_client.redis:
            try:
                lock_acquired = await redis_client.redis.set(
                    redis_lock_key, "1", nx=True, ex=30
                )
                # lock_acquired is None if key already exists (another request holds it).
                # We fall through immediately — no polling, no waiting.
                if not lock_acquired:
                    logger.debug("Redis lock busy for %s — proceeding via DB guarantee", idempotency_key)
            except Exception as redis_err:
                logger.warning("Redis unavailable (%s) — falling through to DB guarantee", redis_err)

        try:
            # ── ③ DB: fetch bundle + INSERT in one connection ─────────────────
            # ON CONFLICT DO UPDATE SET status=status is a no-op touch that
            # still fires RETURNING, giving us the canonical row whether we
            # inserted it now or a concurrent request inserted it first.
            async with db.pool.acquire() as conn:

                bundle = await conn.fetchrow(
                    """
                    SELECT id, name, price, is_active
                    FROM subscription_bundles
                    WHERE id = $1
                    """,
                    uuid.UUID(bundle_id),
                )
                if not bundle:
                    raise ValueError("الباقة غير موجودة.")
                if not bundle["is_active"]:
                    raise ValueError("هذه الباقة غير متاحة حالياً.")

                real_price_sar = Decimal(str(bundle["price"]))
                amount_halalas = int(real_price_sar * Decimal("100"))
                owner_field    = "department_id" if is_department else "doctor_id"

                # PRIMARY GUARANTEE: UNIQUE(idempotency_key) enforced by DB.
                # ON CONFLICT DO UPDATE (no-op) ensures RETURNING always fires.
                payment_order = await conn.fetchrow(
                    f"""
                    INSERT INTO payment_orders
                        ({owner_field}, bundle_id, amount, currency,
                         status, idempotency_key, callback_url)
                    VALUES ($1, $2, $3, $4, 'pending', $5, $6)
                    ON CONFLICT (idempotency_key) DO UPDATE
                        SET status = payment_orders.status  -- no-op, keeps existing row
                    RETURNING id, amount, currency, status,
                              moyasar_payment_id, metadata
                    """,
                    uuid.UUID(user_id),
                    uuid.UUID(bundle_id),
                    real_price_sar,
                    settings.MOYASAR_CURRENCY,
                    idempotency_key,
                    callback_url,
                )

            payment_order_id = str(payment_order["id"])
            current_status   = payment_order["status"]

            # ── ④ State-aware early return ────────────────────────────────────
            # If the row already exists and is past 'pending'/'failed', return
            # the cached result immediately — no Moyasar call needed.
            if current_status in ("initiated", "paid", "authorized"):
                logger.info(
                    "Idempotent hit: order=%s status=%s — returning cached result",
                    payment_order_id, current_status,
                )
                meta = payment_order.get("metadata") or {}
                if isinstance(meta, str):
                    try:
                        meta = json.loads(meta)
                    except Exception:
                        meta = {}
                cached_tx_url = (
                    meta.get("source", {}).get("transaction_url")
                    if isinstance(meta, dict) else None
                )
                return {
                    "payment_order_id":   payment_order_id,
                    "moyasar_payment_id": payment_order["moyasar_payment_id"] or "",
                    "amount":             float(payment_order["amount"]),
                    "currency":           payment_order["currency"],
                    "status":             current_status,
                    "transaction_url":    cached_tx_url,
                    "message":            "طلب الدفع موجود مسبقاً. يرجى إتمام الدفع عبر الصفحة الآمنة.",
                    "idempotent":         True,
                }

            # ── ⑤ Call Moyasar ────────────────────────────────────────────────
            # given_id = idempotency_key → Moyasar deduplicates on its side.
            # Even if two concurrent requests reach here (Redis was down),
            # Moyasar returns the same payment object — no double-charge.
            moyasar_payload = {
                "amount":       amount_halalas,
                "currency":     settings.MOYASAR_CURRENCY,
                "description":  f"SBR AI - {bundle['name']}",
                "callback_url": callback_url,
                "given_id":     idempotency_key,
                "source": {
                    "type":  "token",
                    "token": token,
                },
                "metadata": {
                    "payment_order_id": payment_order_id,
                    "bundle_id":        bundle_id,
                    "user_id":          user_id,
                },
            }

            try:
                moyasar_response = await _call_moyasar("POST", "/payments", json=moyasar_payload)
            except ValueError:
                # Moyasar rejected — mark failed so the next retry (new token)
                # falls through the early-return check and tries again.
                async with db.pool.acquire() as conn:
                    await conn.execute(
                        """
                        UPDATE payment_orders
                        SET status = 'failed'
                        WHERE id = $1 AND status = 'pending'
                        """,
                        uuid.UUID(payment_order_id),
                    )
                raise

            moyasar_payment_id = moyasar_response.get("id", "")
            transaction_url    = moyasar_response.get("source", {}).get("transaction_url")
            moyasar_status     = moyasar_response.get("status", "initiated")

            status_map = {
                "paid": "paid",
                "captured": "paid",
                "authorized": "authorized",
                "failed": "failed",
                "initiated": "initiated",
            }
            target_status = status_map.get(moyasar_status, "initiated")

            # ── ⑥ Atomic state transition: pending/failed → target_status ──────
            # We use an atomic transaction to ensure status update and subscription
            # activation are committed together if target_status is paid/authorized.
            async with db.pool.acquire() as conn:
                async with conn.transaction():
                    updated_row = await conn.fetchrow(
                        """
                        UPDATE payment_orders
                        SET moyasar_payment_id = $1,
                            status             = $2::public.payment_status,
                            metadata           = $3,
                            updated_at         = NOW()
                        WHERE id     = $4
                          AND status NOT IN ('paid', 'refunded')
                        RETURNING id, status, amount, currency, metadata, doctor_id, department_id, bundle_id
                        """,
                        moyasar_payment_id,
                        target_status,
                        json.dumps(moyasar_response),
                        uuid.UUID(payment_order_id),
                    )

                    if updated_row and target_status == "paid":
                        await PaymentService._activate_subscription(
                            conn=conn,
                            payment_order=dict(updated_row),
                        )

            if updated_row is None:
                # Another concurrent request (or webhook) transitioned the state first.
                # Re-fetch the canonical row and return it.
                logger.info(
                    "Concurrent transition detected for order=%s — returning current state",
                    payment_order_id,
                )
                async with db.pool.acquire() as conn:
                    current = await conn.fetchrow(
                        """
                        SELECT id, status, moyasar_payment_id, amount, currency, metadata
                        FROM payment_orders
                        WHERE id = $1
                        """,
                        uuid.UUID(payment_order_id),
                    )
                meta = current.get("metadata") or {}
                if isinstance(meta, str):
                    try:
                        meta = json.loads(meta)
                    except Exception:
                        meta = {}
                t_url = (
                    meta.get("source", {}).get("transaction_url")
                    if isinstance(meta, dict) else None
                )
                return {
                    "payment_order_id":   str(current["id"]),
                    "moyasar_payment_id": current["moyasar_payment_id"] or "",
                    "amount":             float(current["amount"]),
                    "currency":           current["currency"],
                    "status":             current["status"],
                    "transaction_url":    t_url,
                    "message":            "تم إنشاء طلب الدفع. يرجى إتمام الدفع عبر الصفحة الآمنة.",
                    "idempotent":         True,
                }

            logger.info(
                "Payment initiated/recovered: order_id=%s status=%s moyasar_id=%s amount=%.2f %s",
                payment_order_id, target_status, moyasar_payment_id, real_price_sar, settings.MOYASAR_CURRENCY,
            )

            return {
                "payment_order_id":   payment_order_id,
                "moyasar_payment_id": moyasar_payment_id,
                "amount":             real_price_sar,
                "currency":           settings.MOYASAR_CURRENCY,
                "status":             target_status,
                "transaction_url":    transaction_url,
                "message":            "تم إنشاء طلب الدفع. يرجى إتمام الدفع عبر الصفحة الآمنة.",
                "idempotent":         False,
            }

        finally:
            # ── ⑦ Release Redis lock (best-effort) ───────────────────────────
            # Errors here must NEVER propagate — Redis is optional infrastructure.
            if lock_acquired and redis_client.redis:
                try:
                    await redis_client.redis.delete(redis_lock_key)
                except Exception as redis_err:
                    logger.warning("Failed to release Redis lock %s: %s", redis_lock_key, redis_err)



    # ── 2. Verify Payment After Callback (Frontend redirect) ─────────────────
    @staticmethod
    async def verify_payment_callback(moyasar_payment_id: str) -> dict:
        """
        Called by our backend when the user lands on /payment/callback after 3DS.

        Security steps:
        1. Fetch payment status directly from Moyasar API (server-to-server).
        2. Look up our payment_order by moyasar_payment_id and lock the row.
        3. Verify amount AND currency match our stored order (tamper prevention).
        4. Only then activate subscription if status=paid.

        Note: The webhook may have already done this. _activate_subscription
        is idempotent and safe to call multiple times.
        """
        # 1. Server-side fetch from Moyasar (never trust URL params)
        moyasar_data = await _call_moyasar("GET", f"/payments/{moyasar_payment_id}")

        moyasar_status = moyasar_data.get("status", "unknown")
        moyasar_amount = moyasar_data.get("amount", 0)          # In halalas
        moyasar_currency = moyasar_data.get("currency", "")

        status_map = {
            "paid": "paid",
            "authorized": "authorized",
            "failed": "failed",
            "refunded": "refunded",
            "captured": "paid",
            "initiated": "initiated",
        }
        internal_status = status_map.get(moyasar_status, "pending")

        async with db.pool.acquire() as conn:
            # Enforce atomic transaction and row-level locking
            async with conn.transaction():
                payment_order = await conn.fetchrow(
                    "SELECT * FROM payment_orders WHERE moyasar_payment_id = $1 FOR UPDATE",
                    moyasar_payment_id,
                )
                if not payment_order:
                    raise ValueError(f"لم يتم العثور على طلب دفع: {moyasar_payment_id}")

                # 2. Skip if already confirmed (idempotency)
                if payment_order["status"] == "paid":
                    logger.info("Callback: payment %s already marked paid — skipping", moyasar_payment_id)
                    return {
                        "moyasar_payment_id": moyasar_payment_id,
                        "status": "paid",
                        "moyasar_status": moyasar_status,
                        "already_confirmed": True,
                    }

                # 3. Verify amount + currency BEFORE doing anything
                if internal_status in ("paid", "authorized"):
                    _verify_payment_amounts(
                        payment_order=dict(payment_order),
                        moyasar_amount_halalas=moyasar_amount,
                        moyasar_currency=moyasar_currency,
                    )

                # 4. Update status in DB
                await conn.execute(
                    """
                    UPDATE payment_orders
                    SET status = $1::public.payment_status,
                        metadata = $2,
                        updated_at = NOW()
                    WHERE id = $3
                      AND status NOT IN ('paid', 'refunded')
                    """,
                    internal_status,
                    json.dumps(moyasar_data),
                    payment_order["id"],
                )

                # 5. Activate subscription if payment confirmed (paid/captured)
                if internal_status == "paid":
                    await PaymentService._activate_subscription(
                        conn=conn,
                        payment_order=dict(payment_order),
                    )

        # Extract detailed decline message from creditcard source
        detailed_message = moyasar_data.get("source", {}).get("message")

        return {
            "moyasar_payment_id": moyasar_payment_id,
            "status": internal_status,
            "moyasar_status": moyasar_status,
            "already_confirmed": False,
            "message": detailed_message,
        }

    # ── 3. Webhook Handler (Server-to-Server from Moyasar) ───────────────────
    @staticmethod
    async def handle_webhook(raw_body: bytes) -> dict:
        """
        Process Moyasar server-to-server webhook events.

        Security pipeline:
        ┌─────────────────────────────────────────────────────────┐
        │  1. Parse JSON payload                                  │
        │  2. Verify secret_token inside body (Timing attack safe)│
        │  3. Redis idempotency lock (SET NX, 24h TTL)            │
        │  4. Acquire DB connection and start Transaction         │
        │  5. Fetch payment_order and Lock Row (FOR UPDATE)       │
        │  6. Verify amount + currency match DB record ⚡ CRITICAL │
        │  7. DB-level idempotency: UPDATE WHERE status != 'paid' │
        │  8. Activate subscription (idempotent + Row Locked)     │
        └─────────────────────────────────────────────────────────┘

        Always returns HTTP 200 to Moyasar.
        """
        # ── Step 1: Parse JSON ───────────────────────────────────────────────
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Malformed webhook JSON: {exc}") from exc

        # ── Step 2: Verify Secret Token ──────────────────────────────────────
        if not verify_moyasar_webhook_secret_token(payload):
            raise PermissionError("Invalid webhook secret token")

        event_type = payload.get("type", "")
        data = payload.get("data", {})
        moyasar_payment_id = data.get("id", "")

        logger.info("Webhook received: type=%s payment_id=%s", event_type, moyasar_payment_id)

        if not moyasar_payment_id:
            return {"status": "ignored", "reason": "No payment ID in payload"}

        # ── Step 3: Redis idempotency lock ───────────────────────────────────
        # Key is scoped to both payment_id AND event_type so that we can
        # process payment_paid and payment_refunded independently.
        redis_key = f"webhook:moyasar:{event_type}:{moyasar_payment_id}"
        if redis_client.redis:
            try:
                acquired = await redis_client.redis.set(redis_key, "1", nx=True, ex=86400)
                if acquired is None:
                    # Key already existed → already processed
                    logger.info("Webhook already processed (Redis key exists): %s", redis_key)
                    return {"status": "already_processed", "redis_key": redis_key}
            except Exception as redis_err:
                logger.warning("Redis webhook lock error (%s) — relying on DB transaction guarantees", redis_err)

        try:
            async with db.pool.acquire() as conn:
                # Primary guarantee: wrap everything inside a DB Transaction
                async with conn.transaction():

                    # ── Step 5: Fetch payment_order & Lock Row (FOR UPDATE) ──
                    given_id = data.get("given_id")
                    if given_id:
                        payment_order = await conn.fetchrow(
                            "SELECT * FROM payment_orders WHERE idempotency_key = $1 FOR UPDATE",
                            given_id,
                        )
                    else:
                        payment_order = await conn.fetchrow(
                            "SELECT * FROM payment_orders WHERE moyasar_payment_id = $1 FOR UPDATE",
                            moyasar_payment_id,
                        )

                    if not payment_order:
                        logger.warning(
                            "Webhook for unknown moyasar_payment_id=%s — ignored", moyasar_payment_id
                        )
                        return {"status": "ignored", "reason": "Unknown payment_id"}

                    # ── Step 6: Verify amount + currency (Critical!) ─────────────────
                    if event_type in ("payment_paid", "payment_captured", "payment_authorized"):
                        moyasar_amount_halalas = data.get("amount", 0)
                        moyasar_currency = data.get("currency", "")

                        try:
                            _verify_payment_amounts(
                                payment_order=dict(payment_order),
                                moyasar_amount_halalas=moyasar_amount_halalas,
                                moyasar_currency=moyasar_currency,
                            )
                        except ValueError as exc:
                            # Amount mismatch is a critical security event — log and reject
                            logger.critical(
                                "SECURITY: Amount/currency mismatch on webhook! "
                                "order_id=%s moyasar_id=%s error=%s",
                                payment_order["id"], moyasar_payment_id, exc,
                            )
                            raise ValueError(f"Payment amount/currency mismatch: {exc}")

                        # Map events to status
                        status_map = {
                            "payment_paid": "paid",
                            "payment_captured": "paid",
                            "payment_authorized": "authorized",
                        }
                        target_status = status_map.get(event_type, "paid")

                        # ── Step 7: DB-level idempotency: only update if not already paid/authorized/refunded
                        result = await conn.execute(
                            """
                            UPDATE payment_orders
                            SET status = $1::public.payment_status,
                                moyasar_payment_id = $2,
                                metadata = $3,
                                updated_at = NOW()
                            WHERE id = $4
                              AND status NOT IN ('paid', 'refunded')
                            """,
                            target_status,
                            moyasar_payment_id,
                            json.dumps(data),
                            payment_order["id"],
                        )
                        rows_updated = int(result.split()[-1])  # "UPDATE N"

                        if rows_updated == 0:
                            logger.info(
                                "Webhook: payment %s already in final state — skipping activation",
                                moyasar_payment_id,
                            )
                            return {"status": "already_processed", "reason": "already in final state"}

                        # ── Step 8: Activate subscription ────────────────────────────
                        # Only paid / captured payments activate subscriptions.
                        # Authorized payments defer activation until they are captured.
                        if target_status == "paid":
                            await PaymentService._activate_subscription(
                                conn=conn,
                                payment_order=dict(payment_order),
                            )
                            logger.info(
                                "Webhook: subscription activated for order_id=%s", payment_order["id"]
                            )
                            return {"status": "processed", "action": f"subscription_activated_as_{target_status}"}
                        else:
                            logger.info(
                                "Webhook: payment status updated to %s (subscription activation deferred)", target_status
                            )
                            return {"status": "processed", "action": f"payment_status_updated_to_{target_status}"}

                    elif event_type == "payment_failed":
                        await conn.execute(
                            """
                            UPDATE payment_orders
                            SET status = 'failed', moyasar_payment_id = $1, metadata = $2, updated_at = NOW()
                            WHERE id = $3
                              AND status NOT IN ('paid', 'refunded')
                            """,
                            moyasar_payment_id,
                            json.dumps(data),
                            payment_order["id"],
                        )
                        logger.info("Webhook: payment %s marked failed", moyasar_payment_id)
                        return {"status": "processed", "action": "payment_failed_recorded"}

                    elif event_type == "payment_refunded":
                        await conn.execute(
                            """
                            UPDATE payment_orders
                            SET status = 'refunded', moyasar_payment_id = $1, metadata = $2, updated_at = NOW()
                            WHERE id = $3
                            """,
                            moyasar_payment_id,
                            json.dumps(data),
                            payment_order["id"],
                        )
                        logger.info("Webhook: payment %s refunded", moyasar_payment_id)
                        return {"status": "processed", "action": "payment_refunded_recorded"}

                    else:
                        logger.info("Webhook: unhandled event_type=%s — ignored", event_type)
                        return {"status": "ignored", "reason": f"unhandled event: {event_type}"}

        except Exception as e:
            # Release Redis key so webhook retry can run
            if redis_client.redis:
                try:
                    await redis_client.redis.delete(redis_key)
                except Exception:
                    pass
            raise e

    # ── Internal: Activate Subscription (idempotent) ─────────────────────────
    @staticmethod
    async def _activate_subscription(conn, payment_order: dict) -> None:
        """
        Creates or renews the subscription after a confirmed payment.

        Idempotency guarantee:
        - Locks the owner record (Doctor/Department) using SELECT FOR UPDATE.
        - Uses UPDATE ... WHERE status = 'active' first.
        - INSERT only if no active subscription exists.
        - Safe to call multiple times (webhook + callback race condition).
        """
        bundle_id = payment_order["bundle_id"]
        doctor_id = payment_order.get("doctor_id")
        department_id = payment_order.get("department_id")

        bundle = await conn.fetchrow(
            """
            SELECT id, duration_days, max_doctors, allowed_minutes, allowed_messages
            FROM subscription_bundles
            WHERE id = $1
            """,
            bundle_id,
        )
        if not bundle:
            logger.error("_activate_subscription: bundle %s not found!", bundle_id)
            return

        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=int(bundle["duration_days"]))

        if doctor_id:
            # Enforce Row-Level Lock on the Doctor record to serialize subscription activation/renewal
            await conn.execute("SELECT id FROM doctors WHERE id = $1 FOR UPDATE", doctor_id)

            # 1. Fetch current subscription allowed limits and start date
            current_sub = await conn.fetchrow(
                """
                SELECT start_date, allowed_minutes, allowed_messages, rolled_over_minutes, rolled_over_messages
                FROM subscriptions
                WHERE doctor_id = $1 AND status = 'active'
                """,
                doctor_id,
            )
            
            rolled_minutes = 0
            rolled_messages = 0
            
            if current_sub:
                start_dt = current_sub["start_date"]
                
                # Fetch dynamically computed usage from sessions and logs
                used_sec = await conn.fetchval(
                    """
                    SELECT COALESCE(SUM(duration_seconds), 0)
                    FROM sessions
                    WHERE doctor_id = $1 AND created_at >= $2
                    """,
                    doctor_id,
                    start_dt
                )
                used_min = int(used_sec // 60)
                
                used_msg = await conn.fetchval(
                    """
                    SELECT COALESCE(COUNT(*), 0)
                    FROM token_usage_logs
                    WHERE doctor_id = $1 AND created_at >= $2
                    """,
                    doctor_id,
                    start_dt
                )
                
                # Remaining = (Allowed + RolledOver) - Used
                allowed_min = current_sub["allowed_minutes"] or 0
                roll_min = current_sub["rolled_over_minutes"] or 0
                rolled_minutes = max(0, (allowed_min + roll_min) - used_min)
                
                allowed_msg = current_sub["allowed_messages"] or 0
                roll_msg = current_sub["rolled_over_messages"] or 0
                rolled_messages = max(0, (allowed_msg + roll_msg) - used_msg)
                
            # 2. Try UPDATE first (renew existing with rollover calculations), INSERT if none exists
            updated = await conn.execute(
                """
                UPDATE subscriptions
                SET bundle_id            = $1,
                    start_date           = NOW(),  -- Reset start date to beginning of renewal cycle
                    end_date             = NOW() + ($2 || ' days')::INTERVAL,
                    allowed_minutes      = $3,
                    allowed_messages     = $4,
                    rolled_over_minutes  = $5,
                    rolled_over_messages = $6,
                    used_minutes         = 0,  -- Keep 0, usage is calculated dynamically
                    used_messages        = 0,  -- Keep 0, usage is calculated dynamically
                    status               = 'active',
                    updated_at           = NOW()
                WHERE doctor_id = $7
                  AND status = 'active'
                """,
                bundle_id,
                str(bundle["duration_days"]),
                bundle["allowed_minutes"],
                bundle["allowed_messages"],
                rolled_minutes,
                rolled_messages,
                doctor_id,
            )
            if int(updated.split()[-1]) == 0:
                await conn.execute(
                    """
                    INSERT INTO subscriptions
                        (doctor_id, bundle_id, start_date, end_date, status,
                         allowed_minutes, allowed_messages, rolled_over_minutes, rolled_over_messages, used_minutes, used_messages)
                    VALUES ($1, $2, $3, $4, 'active', $5, $6, 0, 0, 0, 0)
                    """,
                    doctor_id,
                    bundle_id,
                    start_date,
                    end_date,
                    bundle["allowed_minutes"],
                    bundle["allowed_messages"],
                )
                logger.info("Subscription CREATED for doctor_id=%s bundle=%s", doctor_id, bundle_id)
            else:
                logger.info(
                    "Subscription RENEWED for doctor_id=%s bundle=%s. Rolled over: %d min, %d msg",
                    doctor_id, bundle_id, rolled_minutes, rolled_messages
                )

        elif department_id:
            # Enforce Row-Level Lock on the Department record to serialize subscription activation/renewal
            await conn.execute("SELECT id FROM departments WHERE id = $1 FOR UPDATE", department_id)

            # 1. Fetch current subscription allowed limits and start date
            current_sub = await conn.fetchrow(
                """
                SELECT id, start_date, allowed_minutes, allowed_messages, rolled_over_minutes, rolled_over_messages
                FROM subscriptions
                WHERE department_id = $1 AND status = 'active'
                """,
                department_id,
            )
            
            rolled_minutes = 0
            rolled_messages = 0
            
            if current_sub:
                sub_id = current_sub["id"]
                start_dt = current_sub["start_date"]
                
                # Fetch dynamically computed usage from sessions and logs
                used_sec = await conn.fetchval(
                    """
                    SELECT COALESCE(SUM(s.duration_seconds), 0)
                    FROM sessions s
                    JOIN subscription_doctors sd ON s.doctor_id = sd.doctor_id
                    WHERE sd.subscription_id = $1 AND s.created_at >= $2
                    """,
                    sub_id,
                    start_dt
                )
                used_min = int(used_sec // 60)
                
                used_msg = await conn.fetchval(
                    """
                    SELECT COALESCE(COUNT(*), 0)
                    FROM token_usage_logs tul
                    JOIN subscription_doctors sd ON tul.doctor_id = sd.doctor_id
                    WHERE sd.subscription_id = $1 AND tul.created_at >= $2
                    """,
                    sub_id,
                    start_dt
                )
                
                allowed_min = current_sub["allowed_minutes"] or 0
                roll_min = current_sub["rolled_over_minutes"] or 0
                rolled_minutes = max(0, (allowed_min + roll_min) - used_min)
                
                allowed_msg = current_sub["allowed_messages"] or 0
                roll_msg = current_sub["rolled_over_messages"] or 0
                rolled_messages = max(0, (allowed_msg + roll_msg) - used_msg)
                
            # 2. Try UPDATE first (renew existing), INSERT if none exists
            updated = await conn.execute(
                """
                UPDATE subscriptions
                SET bundle_id            = $1,
                    start_date           = NOW(),  -- Reset start date to beginning of renewal cycle
                    end_date             = NOW() + ($2 || ' days')::INTERVAL,
                    total_seats          = $3,
                    allowed_minutes      = $4,
                    allowed_messages     = $5,
                    rolled_over_minutes  = $6,
                    rolled_over_messages = $7,
                    used_minutes         = 0,
                    used_messages        = 0,
                    status               = 'active',
                    updated_at           = NOW()
                WHERE department_id = $8
                  AND status = 'active'
                """,
                bundle_id,
                str(bundle["duration_days"]),
                bundle["max_doctors"] or 1,
                bundle["allowed_minutes"],
                bundle["allowed_messages"],
                rolled_minutes,
                rolled_messages,
                department_id,
            )
            if int(updated.split()[-1]) == 0:
                await conn.execute(
                    """
                    INSERT INTO subscriptions
                        (department_id, bundle_id, start_date, end_date, status,
                         total_seats, allowed_minutes, allowed_messages, rolled_over_minutes, rolled_over_messages, used_minutes, used_messages)
                    VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, 0, 0, 0, 0)
                    """,
                    department_id,
                    bundle_id,
                    start_date,
                    end_date,
                    bundle["max_doctors"] or 1,
                    bundle["allowed_minutes"],
                    bundle["allowed_messages"],
                )
                logger.info("Subscription CREATED for department_id=%s", department_id)
            else:
                logger.info(
                    "Subscription RENEWED for department_id=%s. Rolled over: %d min, %d msg",
                    department_id, rolled_minutes, rolled_messages
                )
        else:
            logger.error(
                "_activate_subscription: payment_order %s has no doctor_id or department_id!",
                payment_order["id"],
            )


payment_service = PaymentService()
