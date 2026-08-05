import random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.services.email_service import email_service
from app.core.config import settings

router = APIRouter(prefix="/support", tags=["Support"])

class TicketRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    ticket_type: str  # 'suggestion', 'complaint', 'inquiry', 'technical'
    message: str

@router.post("/ticket")
async def create_support_ticket(req: TicketRequest):
    # Generate auto ticket number
    ticket_num = f"TKT-{random.randint(100000, 999999)}"
    
    # Translate ticket type for presentation
    type_map = {
        "suggestion": "اقتراح",
        "complaint": "شكوى",
        "inquiry": "استفسار",
        "technical": "مشكلة تقنية"
    }
    type_ar = type_map.get(req.ticket_type, req.ticket_type)

    # 1. Send copy to the user
    user_subject = f"تأكيد استلام طلبك رقم {ticket_num} - SBR AI"
    user_html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f7f6;
                color: #333333;
                direction: rtl;
                text-align: right;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                border: 1px solid #e0e0e0;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #0d9488;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }}
            .header h2 {{
                color: #0d9488;
                margin: 0;
            }}
            .content {{
                line-height: 1.6;
                font-size: 15px;
            }}
            .ticket-details {{
                background: #f0fdfa;
                border: 1px solid #99f6e4;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .ticket-details p {{
                margin: 5px 0;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 12px;
                color: #666666;
                text-align: center;
                border-top: 1px solid #eeeeee;
                padding-top: 15px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>مركز المساعدة - SBR AI</h2>
            </div>
            <div class="content">
                <p>مرحباً <strong>{req.name}</strong>،</p>
                <p>شكراً لتواصلك معنا. لقد تم استلام طلبك بنجاح، وتم فتح تيكت دعم فني جديد بالرقم التلقائي التالي:</p>
                
                <div class="ticket-details">
                    <p><strong>رقم التيكت:</strong> {ticket_num}</p>
                    <p><strong>نوع الطلب:</strong> {type_ar}</p>
                    <p><strong>حالة الطلب:</strong> قيد المراجعة</p>
                </div>
                
                <p><strong>نص رسالتك:</strong></p>
                <blockquote style="background: #f8fafc; border-right: 4px solid #cbd5e1; padding: 10px; margin: 10px 0; font-style: italic;">
                    {req.message}
                </blockquote>
                
                <p>سيقوم فريق الدعم الفني بمراجعة طلبك والرد عليك في أقرب وقت ممكن.</p>
            </div>
            <div class="footer">
                <p>هذا البريد تم إنشاؤه تلقائياً، يرجى عدم الرد عليه.</p>
                <p>© 2026 SBR AI. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # 2. Send copy to the admin
    admin_subject = f"طلب دعم جديد {ticket_num} - {type_ar}"
    admin_html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f7f6;
                color: #333333;
                direction: rtl;
                text-align: right;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                border: 1px solid #e0e0e0;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #0d9488;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }}
            .header h2 {{
                color: #0d9488;
                margin: 0;
            }}
            .content {{
                line-height: 1.6;
                font-size: 15px;
            }}
            .ticket-details {{
                background: #fef08a;
                border: 1px solid #fef08a;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .ticket-details p {{
                margin: 5px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>طلب دعم جديد - SBR AI</h2>
            </div>
            <div class="content">
                <p>تم استلام طلب جديد من مركز المساعدة:</p>
                
                <div class="ticket-details">
                    <p><strong>رقم التيكت:</strong> {ticket_num}</p>
                    <p><strong>اسم المرسل:</strong> {req.name}</p>
                    <p><strong>البريد الإلكتروني:</strong> {req.email}</p>
                    <p><strong>رقم الهاتف:</strong> {req.phone}</p>
                    <p><strong>نوع الطلب:</strong> {type_ar}</p>
                </div>
                
                <p><strong>نص الرسالة:</strong></p>
                <p style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">
                    {req.message}
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    # Send emails using async email service
    try:
        await email_service.send_email(req.email, user_subject, user_html)
        if settings.SMTP_USER:
            await email_service.send_email(settings.SMTP_USER, admin_subject, admin_html)
    except Exception as e:
        print(f"Error sending support emails: {e}")
        
    return {"status": "success", "ticket_number": ticket_num}
