import logging
from typing import Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger("whatsapp_controller")

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

class ReportRequest(BaseModel):
    report_text: str

def get_whatsapp_service() -> WhatsAppService:
    return WhatsAppService()

@router.post("/webhook")
async def evolution_webhook(payload: Dict[str, Any], service: WhatsAppService = Depends(get_whatsapp_service)):
    """
    Webhook receiver for Evolution API.
    Listens for 'messages.upsert' events, checks for active patient sessions,
    and replies/alerts accordingly.
    """
    event_type = payload.get("event")
    instance = payload.get("instance")
    
    # We only process messages.upsert
    if event_type != "messages.upsert":
        return {"status": "ignored", "event": event_type}
        
    data = payload.get("data", {})
    key = data.get("key", {})
    from_me = key.get("fromMe", True)
    
    # Ignore messages sent by the bot itself
    if from_me:
        return {"status": "ignored", "reason": "sent_by_me"}
        
    remote_jid = key.get("remoteJid", "")
    if not remote_jid or "@s.whatsapp.net" not in remote_jid:
        return {"status": "ignored", "reason": "invalid_remote_jid"}
        
    phone = remote_jid.split("@")[0]
    
    message_obj = data.get("message", {})
    if not message_obj:
        return {"status": "ignored", "reason": "empty_message_object"}
        
    text = ""
    if "conversation" in message_obj:
        text = message_obj["conversation"]
    elif "extendedTextMessage" in message_obj:
        text = message_obj["extendedTextMessage"].get("text", "")
        
    if not text:
        return {"status": "ignored", "reason": "no_text_content"}
        
    logger.info(f"Received WhatsApp message from {phone} (instance: {instance}): {text[:50]}...")
    
    processed = await service.handle_incoming_message(phone, text)
    
    return {"status": "processed" if processed else "ignored"}

@router.post("/send-report")
async def send_clinic_report(
    req: ReportRequest,
    current_user: dict = Depends(get_current_user),
    service: WhatsAppService = Depends(get_whatsapp_service)
):
    """
    Endpoint for doctors to trigger sending their daily clinic report
    to their own WhatsApp number.
    """
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="فقط الأطباء مصرح لهم باستخدام هذه الخدمة."
        )
        
    doctor_id = UUID(str(current_user["id"]))
    success = await service.send_report_to_doctor(doctor_id, req.report_text)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل إرسال التقرير عبر الواتساب. تأكد من إعداد Evolution API ورقم جوالك."
        )
        
    return {"message": "تم إرسال التقرير بنجاح إلى رقم الواتساب الخاص بك."}

class SendMessageRequest(BaseModel):
    phone: str
    text: str

@router.post("/send-message")
async def send_custom_message(
    req: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    service: WhatsAppService = Depends(get_whatsapp_service)
):
    """
    Endpoint for doctors to send an arbitrary WhatsApp message to any phone number
    using the connected Evolution API instance.
    """
    success = await service.send_message(req.phone, req.text)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل إرسال الرسالة عبر الواتساب. تأكد من ربط حساب الواتساب الخاص بالعيادة (Evolution API)."
        )
    return {"message": "تم إرسال الرسالة بنجاح عبر الواتساب."}

class SendMediaRequest(BaseModel):
    phone: str
    base64_data: str
    file_name: str

@router.post("/send-document")
async def send_whatsapp_document(
    req: SendMediaRequest,
    current_user: dict = Depends(get_current_user),
    service: WhatsAppService = Depends(get_whatsapp_service)
):
    """
    Endpoint for doctors to send a PDF document (base64) to any phone number
    using the connected Evolution API instance.
    """
    success = await service.send_document(req.phone, req.base64_data, req.file_name)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل إرسال الملف عبر الواتساب. تأكد من ربط حساب الواتساب الخاص بالعيادة (Evolution API)."
        )
    return {"message": "تم إرسال الملف بنجاح عبر الواتساب."}

@router.get("/logs")
async def get_whatsapp_logs(
    current_user: dict = Depends(get_current_user),
    service: WhatsAppService = Depends(get_whatsapp_service)
):
    """
    Gets recent WhatsApp message logs. Restricted to doctors and admins.
    """
    if current_user.get("role") not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="غير مصرح لك بمشاهدة سجلات الرسائل."
        )
        
    logs = await service.repo.get_recent_logs(limit=50)
    return logs

@router.get("/qr-code", response_class=HTMLResponse)
async def get_qr_page(service: WhatsAppService = Depends(get_whatsapp_service)):
    """
    Renders a clean HTML page displaying the WhatsApp connection QR code
    fetched directly from the Evolution API instance.
    """
    try:
        url = f"{service.evolution_client.base_url}/instance/connect/{service.evolution_client.instance}"
        headers = {"apikey": service.evolution_client.api_key}
        
        # Use httpx.AsyncClient to make the call
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            
        if response.status_code == 404:
            # The instance does not exist yet. Let's auto-create it.
            create_url = f"{service.evolution_client.base_url}/instance/create"
            payload = {
                "instanceName": service.evolution_client.instance,
                "qrcode": True,
                "integration": "WHATSAPP-BAILEYS"
            }
            async with httpx.AsyncClient() as client:
                create_response = await client.post(create_url, json=payload, headers=headers, timeout=15.0)
                
            if create_response.status_code in (200, 201):
                # Request the connection status again now that it has been created
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=headers, timeout=10.0)
            else:
                return HTMLResponse(
                    content=f"<h3>Failed to auto-create WhatsApp instance SBR-AI. Status: {create_response.status_code} | {create_response.text}</h3>",
                    status_code=500
                )
                
        if response.status_code != 200:
            return HTMLResponse(
                content=f"<h3>Failed to connect to Evolution API. Status: {response.status_code} | {response.text}</h3>",
                status_code=500
            )

            
        data = response.json()
        
        # Check base64 in different possible structures of Evolution API response
        base64_img = None
        if isinstance(data, dict):
            base64_img = data.get("base64")
            if not base64_img and "qrcode" in data:
                if isinstance(data["qrcode"], dict):
                    base64_img = data["qrcode"].get("base64")
                else:
                    base64_img = data["qrcode"]
            
            # Check if it's already connected
            status_val = data.get("status") or data.get("instance", {}).get("status")
            if status_val == "connected":
                return HTMLResponse(content="""
                <html>
                <head>
                    <title>SBR AI - Connected</title>
                    <style>
                        body { font-family: sans-serif; background-color: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                        .card { background-color: #1e293b; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
                        h2 { color: #10b981; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2>✓ Connected Successfully</h2>
                        <p>SBR AI WhatsApp is linked and running!</p>
                    </div>
                </body>
                </html>
                """)

        if not base64_img:
            return HTMLResponse(
                content=f"<h3>QR Code is not ready yet. Status response: {data}</h3>",
                status_code=400
            )

        # Build clean visual page
        html_content = f"""
        <html>
        <head>
            <title>SBR AI - WhatsApp QR Code</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #0f172a;
                    color: #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background-color: #1e293b;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    text-align: center;
                    max-width: 400px;
                }}
                img {{
                    background-color: white;
                    padding: 10px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                h2 {{ color: #10b981; }}
                p {{ color: #94a3b8; font-size: 15px; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>SBR AI WhatsApp Link</h2>
                <p>Scan this QR code using WhatsApp on your phone (Linked Devices -> Link a Device)</p>
                <img src="{base64_img}" alt="WhatsApp QR Code" width="280" height="280"/>
                <p style="font-size: 13px; color: #64748b;">Refresh this page after scanning to verify status.</p>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        return HTMLResponse(content=f"<h3>Error loading QR Code: {str(e)}</h3>", status_code=500)

