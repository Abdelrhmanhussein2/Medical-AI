import json
import logging
from uuid import UUID
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.redis import redis_client

from app.services.whatsapp.phone_utils import normalize_phone
from app.services.whatsapp.message_builder import (
    build_followup_message,
    build_mild_response,
    build_severe_patient_reply,
    build_doctor_alert,
    build_6m_reminder,
    build_fine_response,
    build_appointment_reminder_24h,
    build_appointment_reminder_4h
)
from app.services.whatsapp.evolution_client import EvolutionClient, EvolutionAPIError
from app.services.whatsapp.response_classifier import ResponseClassifier
from app.services.whatsapp.repository import WhatsAppRepository
from app.services.whatsapp.reminder_repository import ReminderRepository

logger = logging.getLogger("whatsapp_service")

class WhatsAppService:
    def __init__(
        self,
        repo: Optional[WhatsAppRepository] = None,
        evolution_client: Optional[EvolutionClient] = None,
        classifier: Optional[ResponseClassifier] = None,
        redis = None,
        default_country_code: Optional[str] = None,
        reminder_repo: Optional[ReminderRepository] = None
    ):
        self.repo = repo or WhatsAppRepository()
        self.evolution_client = evolution_client or EvolutionClient(
            base_url=settings.EVOLUTION_API_URL,
            api_key=settings.EVOLUTION_API_KEY,
            instance=settings.EVOLUTION_INSTANCE
        )
        self.classifier = classifier or ResponseClassifier()
        self.redis = redis
        self.default_country_code = default_country_code or settings.PHONE_DEFAULT_COUNTRY_CODE
        self.reminder_repo = reminder_repo or ReminderRepository(db_pool=self.repo.pool, redis=redis)


    async def _get_redis(self):
        if not self.redis:
            await redis_client.connect()
            self.redis = redis_client.redis
        return self.redis

    async def send_message(self, phone: str, text: str) -> bool:
        """
        Helper method to normalize phone number and send WhatsApp message.
        """
        normalized = normalize_phone(phone, self.default_country_code)
        if not normalized:
            logger.warning(f"Could not normalize phone number: {phone}")
            return False
        try:
            await self.evolution_client.send_text(normalized, text)
            return True
        except EvolutionAPIError as e:
            logger.error(f"Failed to send message to {normalized}: {e}")
            return False

    async def process_followup_24h(self) -> int:
        """
        Runs checkup job for visits that occurred 24-48 hours ago.
        Sends followup checking on patient status.
        
        Returns:
            int: Number of checkups sent.
        """
        logger.info("Starting 24h follow-up job...")
        visits = await self.repo.get_visits_due_followup_24h()
        logger.info(f"Found {len(visits)} visits due for 24h follow-up.")
        
        r_client = await self._get_redis()
        sent_count = 0
        
        for v in visits:
            visit_id = v["visit_id"]
            patient_id = v["patient_id"]
            patient_name = v["patient_name"]
            patient_phone = v["patient_phone"]
            doctor_id = v["doctor_id"]
            doctor_name = v["doctor_name"]
            
            normalized_p = normalize_phone(patient_phone, self.default_country_code)
            if not normalized_p:
                logger.warning(f"Invalid patient phone: {patient_phone} for patient {patient_name}")
                continue
                
            message_text = build_followup_message(patient_name, doctor_name)
            success = await self.send_message(normalized_p, message_text)
            
            status = "sent" if success else "failed"
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=doctor_id,
                visit_id=visit_id,
                msg_type="followup_24h",
                phone=normalized_p,
                content=message_text,
                status=status
            )
            
            if success:
                sent_count += 1
                # Save chat state in Redis (TTL: 48 hours)
                state_key = f"wa_chat:{normalized_p}"
                state_data = {
                    "visit_id": str(visit_id),
                    "patient_id": str(patient_id),
                    "doctor_id": str(doctor_id),
                    "patient_name": patient_name,
                    "step": "awaiting_followup"
                }
                await r_client.setex(state_key, 172800, json.dumps(state_data))
                logger.info(f"Follow-up sent and state stored in Redis for {normalized_p}.")
                
        return sent_count

    async def process_reminder_6m(self) -> int:
        """
        Runs checkup job for patients whose first visit was 6 months ago.
        
        Returns:
            int: Number of reminders sent.
        """
        logger.info("Starting 6m checkup reminder job...")
        patients = await self.repo.get_patients_due_reminder_6m()
        logger.info(f"Found {len(patients)} patients due for 6m reminder.")
        
        sent_count = 0
        for p in patients:
            patient_id = p["patient_id"]
            patient_name = p["patient_name"]
            patient_phone = p["patient_phone"]
            
            normalized_p = normalize_phone(patient_phone, self.default_country_code)
            if not normalized_p:
                continue
                
            message_text = build_6m_reminder(patient_name)
            success = await self.send_message(normalized_p, message_text)
            
            status = "sent" if success else "failed"
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=None,
                visit_id=None,
                msg_type="reminder_6m",
                phone=normalized_p,
                content=message_text,
                status=status
            )
            
            if success:
                sent_count += 1
                logger.info(f"6m checkup reminder sent to {normalized_p}.")
                
        return sent_count

    async def handle_incoming_message(self, from_phone: str, text: str) -> bool:
        """
        Processes incoming WhatsApp messages. Looks for active sessions in Redis.
        If found, classifies response and replies appropriately.
        """
        normalized_from = normalize_phone(from_phone, self.default_country_code)
        r_client = await self._get_redis()
        
        state_key = f"wa_chat:{normalized_from}"
        state_raw = await r_client.get(state_key)
        
        if not state_raw:
            logger.info(f"No active session for incoming message from {normalized_from}. Ignoring.")
            return False
            
        try:
            state = json.loads(state_raw)
        except Exception as e:
            logger.error(f"Error parsing session state for {normalized_from}: {e}")
            await r_client.delete(state_key)
            return False
            
        visit_id = UUID(state["visit_id"])
        patient_id = UUID(state["patient_id"])
        doctor_id = UUID(state["doctor_id"])
        patient_name = state["patient_name"]
        
        # 1. Retrieve the visit info to get diagnosis/notes
        visit = await self.repo.get_visit(str(visit_id))
        visit_notes = visit.get("notes") if visit else ""
        visit_date = str(visit.get("visit_date")) if visit else "أمس"
        
        # 2. Classify response
        classification = await self.classifier.classify(text, visit_notes)
        logger.info(f"Classified incoming response from {normalized_from} as: {classification}")
        
        # 3. Handle classification
        if classification == "fine":
            reply_text = build_fine_response()
            await self.send_message(normalized_from, reply_text)
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=doctor_id,
                visit_id=visit_id,
                msg_type="patient_reply_fine",
                phone=normalized_from,
                content=text,
                status="received"
            )
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=doctor_id,
                visit_id=visit_id,
                msg_type="followup_reply",
                phone=normalized_from,
                content=reply_text,
                status="sent"
            )
            
        elif classification == "mild_pain":
            reply_text = build_mild_response(visit_notes)
            await self.send_message(normalized_from, reply_text)
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=doctor_id,
                visit_id=visit_id,
                msg_type="patient_reply_mild",
                phone=normalized_from,
                content=text,
                status="received"
            )
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=doctor_id,
                visit_id=visit_id,
                msg_type="followup_reply",
                phone=normalized_from,
                content=reply_text,
                status="sent"
            )
            
        elif classification == "severe_pain":
            # Reply to patient
            reply_text = build_severe_patient_reply()
            await self.send_message(normalized_from, reply_text)
            
            # Send alert to doctor
            doctor_phone = await self.repo.get_doctor_phone(doctor_id)
            if doctor_phone:
                normalized_doc_phone = normalize_phone(doctor_phone, self.default_country_code)
                alert_text = build_doctor_alert(
                    patient_name=patient_name,
                    phone=normalized_from,
                    visit_date=visit_date,
                    summary=visit.get("description")
                )
                await self.send_message(normalized_doc_phone, alert_text)
                
                await self.repo.log_message(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    visit_id=visit_id,
                    msg_type="doctor_alert",
                    phone=normalized_doc_phone,
                    content=alert_text,
                    status="sent"
                )
            else:
                logger.warning(f"Could not find phone number for doctor {doctor_id}")
                
            await self.repo.log_message(
                patient_id=patient_id,
                doctor_id=doctor_id,
                visit_id=visit_id,
                msg_type="patient_reply_severe",
                phone=normalized_from,
                content=text,
                status="received"
            )
            
        # Delete Redis session state since flow is complete for this followup
        await r_client.delete(state_key)
        return True

    async def send_report_to_doctor(self, doctor_id: UUID, report_text: str) -> bool:
        """
        Sends the generated daily/clinic report to the doctor's WhatsApp.
        """
        doctor_phone = await self.repo.get_doctor_phone(doctor_id)
        if not doctor_phone:
            logger.error(f"Cannot send report, phone not found for doctor {doctor_id}")
            return False
            
        normalized_doc = normalize_phone(doctor_phone, self.default_country_code)
        success = await self.send_message(normalized_doc, report_text)
        
        await self.repo.log_message(
            patient_id=None,
            doctor_id=doctor_id,
            visit_id=None,
            msg_type="report",
            phone=normalized_doc,
            content=report_text,
            status="sent" if success else "failed"
        )
        return success

    async def process_due_reminders(self) -> int:
        """
        Hot path: Fetches due reminders from Redis, resolves details from DB,
        sends WhatsApp messages, logs them, and removes them from the Redis queue.
        """
        import time
        now_ts = time.time()
        due_items = await self.reminder_repo.get_due_reminders(now_ts)
        if not due_items:
            return 0

        sent_count = 0
        processed_raw_values = []

        for item in due_items:
            appt_id = item["appointment_id"]
            rem_type = item["reminder_type"]
            raw_val = item["raw_value"]

            processed_raw_values.append(raw_val)

            # Check DB if already sent
            already_sent = await self.reminder_repo.has_been_sent(appt_id, rem_type)
            if already_sent:
                logger.info(f"Reminder {rem_type} for appt {appt_id} already logged as sent in DB. Skipping.")
                continue

            # Fetch details
            details = await self.reminder_repo.get_appointment_reminder_details(appt_id)
            if not details:
                logger.warning(f"Could not find appointment details for reminder {appt_id}. Skipping.")
                continue

            if details["status"] != "scheduled":
                logger.info(f"Appointment {appt_id} status is '{details['status']}' (not scheduled). Skipping reminder.")
                continue

            phone = details["patient_phone"]
            patient_name = details["patient_name"]
            doctor_name = details["doctor_name"]
            appt_date = str(details["appointment_date"])
            appt_time = str(details["appointment_time"])

            # Build message based on type
            if rem_type == "24h":
                msg = build_appointment_reminder_24h(patient_name, doctor_name, appt_date, appt_time)
            elif rem_type == "4h":
                msg = build_appointment_reminder_4h(patient_name, doctor_name, appt_time)
            else:
                logger.warning(f"Unknown reminder type '{rem_type}' for appt {appt_id}. Skipping.")
                continue

            # Send message
            success = await self.send_message(phone, msg)
            status = "sent" if success else "failed"

            # Log to DB
            await self.reminder_repo.log_reminder(appt_id, rem_type, phone, status)
            if success:
                sent_count += 1
                logger.info(f"Successfully sent {rem_type} reminder to patient {patient_name} ({phone})")

        # Cleanup redis queue
        if processed_raw_values:
            await self.reminder_repo.remove_from_queue(processed_raw_values)

        return sent_count

    async def run_safety_net_scan(self) -> int:
        """
        Safety net: Scans the DB for scheduled appointments in the next 25 hours,
        checks if reminders should have been sent (based on current time), and
        re-enqueues them in Redis ZSET to be processed immediately if they were missed.
        """
        import time
        from datetime import datetime, timedelta
        
        appointments = await self.reminder_repo.get_appointments_missing_reminders()
        if not appointments:
            return 0

        requeued_count = 0
        now_dt = datetime.now()

        for appt in appointments:
            appt_id = str(appt["appointment_id"])
            appt_date = appt["appointment_date"]
            appt_time = appt["appointment_time"]
            
            # Combine date and time
            appt_dt = datetime.combine(appt_date, appt_time)

            # Check 24h reminder: due if now >= appt_dt - 24 hours
            time_24h = appt_dt - timedelta(hours=24)
            if now_dt >= time_24h:
                already_sent = await self.reminder_repo.has_been_sent(appt_id, "24h")
                if not already_sent:
                    # Enqueue with current timestamp so it triggers immediately
                    await self.reminder_repo.enqueue_reminder(appt_id, "24h", time.time())
                    requeued_count += 1

            # Check 4h reminder: due if now >= appt_dt - 4 hours
            time_4h = appt_dt - timedelta(hours=4)
            if now_dt >= time_4h:
                already_sent = await self.reminder_repo.has_been_sent(appt_id, "4h")
                if not already_sent:
                    await self.reminder_repo.enqueue_reminder(appt_id, "4h", time.time())
                    requeued_count += 1

        return requeued_count

