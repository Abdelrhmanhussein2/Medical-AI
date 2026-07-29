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
    build_fine_response
)
from app.services.whatsapp.evolution_client import EvolutionClient, EvolutionAPIError
from app.services.whatsapp.response_classifier import ResponseClassifier
from app.services.whatsapp.repository import WhatsAppRepository

logger = logging.getLogger("whatsapp_service")

class WhatsAppService:
    def __init__(
        self,
        repo: Optional[WhatsAppRepository] = None,
        evolution_client: Optional[EvolutionClient] = None,
        classifier: Optional[ResponseClassifier] = None,
        redis = None,
        default_country_code: Optional[str] = None
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
