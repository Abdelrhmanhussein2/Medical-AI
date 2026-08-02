import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from app.core.config import settings

class EmailService:
    def _send_sync(self, to_email: str, subject: str, html_content: str):
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            print("WARNING: SMTP credentials not set. Email not sent.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html", "utf-8")
        msg.attach(part)

        # Connect and send
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

    async def send_email(self, to_email: str, subject: str, html_content: str):
        # Run synchronous SMTP sending in a background thread to prevent blocking the event loop
        try:
            await asyncio.to_thread(self._send_sync, to_email, subject, html_content)
            print(f"Email successfully sent to {to_email}")
        except Exception as e:
            print(f"Failed to send email to {to_email}: {e}")
            raise e

    async def send_welcome_email(self, to_email: str, doctor_name: str, temp_password: str):
        subject = "مرحباً بك في منصة SBR AI - بيانات حسابك الجديد"
        login_url = f"{settings.FRONTEND_URL}/login"
        html_content = f"""
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
                .credentials {{
                    background: #f0fdfa;
                    border: 1px solid #99f6e4;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .credentials p {{
                    margin: 5px 0;
                }}
                .btn {{
                    display: inline-block;
                    background: #0d9488;
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 12px 25px;
                    border-radius: 6px;
                    font-weight: bold;
                    margin-top: 15px;
                    text-align: center;
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
                    <h2>SBR AI Platform</h2>
                </div>
                <div class="content">
                    <p>مرحباً د. <strong>{doctor_name}</strong>،</p>
                    <p>تم تعيينك وتسجيل حسابك بنجاح في المنصة من قبل إدارة منظمتك/قسمك الطبي.</p>
                    <p>يرجى استخدام بيانات الدخول المؤقتة التالية للولوج إلى حسابك:</p>
                    
                    <div class="credentials">
                        <p><strong>البريد الإلكتروني (Login ID):</strong> {to_email}</p>
                        <p><strong>كلمة المرور المؤقتة:</strong> <span style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{temp_password}</span></p>
                    </div>
                    
                    <p style="color: #ea580c; font-weight: bold;">⚠️ تنبيه هام: لدواعي الأمان وسرية البيانات الطبية، سيُطلب منك تغيير كلمة المرور فور تسجيل دخولك لأول مرة.</p>
                    
                    <div style="text-align: center;">
                        <a href="{login_url}" class="btn">تسجيل الدخول للمنصة</a>
                    </div>
                </div>
                <div class="footer">
                    <p>هذا البريد تم إنشاؤه تلقائياً، يرجى عدم الرد عليه.</p>
                    <p>© 2026 SBR AI. جميع الحقوق محفوظة.</p>
                </div>
            </div>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, html_content)

    async def send_otp_email(self, to_email: str, otp_code: str, action_text: str):
        subject = f"رمز التحقق (OTP) - {action_text}"
        html_content = f"""
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
                .otp-box {{
                    text-align: center;
                    background: #f0fdfa;
                    border: 2px dashed #0d9488;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-size: 28px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    color: #0d9488;
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
                    <h2>SBR AI Platform</h2>
                </div>
                <div class="content">
                    <p>مرحباً،</p>
                    <p>لقد تلقينا طلباً لـ <strong>{action_text}</strong> لحسابك.</p>
                    <p>يرجى استخدام رمز التحقق المؤقت التالي لإتمام العملية:</p>
                    
                    <div class="otp-box">
                        {otp_code}
                    </div>
                    
                    <p>هذا الرمز صالح لمدة <strong>5 دقائق</strong> فقط. إذا لم تكن أنت من طلب هذا الإجراء، يرجى تجاهل هذا البريد وتغيير كلمة المرور الخاصة بك فوراً لحماية حسابك.</p>
                </div>
                <div class="footer">
                    <p>هذا البريد تم إنشاؤه تلقائياً، يرجى عدم الرد عليه.</p>
                    <p>© 2026 SBR AI. جميع الحقوق محفوظة.</p>
                </div>
            </div>
        </body>
        </html>
        """
        await self.send_email(to_email, subject, html_content)

email_service = EmailService()
