#!/usr/bin/env python3
"""Test SMTP email sending."""
import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

print(f"SMTP_EMAIL: {SMTP_EMAIL}")
print(f"SMTP_PASSWORD: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else 'NOT SET'}")
print(f"SMTP_HOST: {SMTP_HOST}")
print(f"SMTP_PORT: {SMTP_PORT}")
print()

if not SMTP_EMAIL or not SMTP_PASSWORD:
    print("ERROR: SMTP credentials not configured in .env")
    exit(1)

try:
    print("[*] Connecting to SMTP server...")
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
    print("[OK] Connection successful")

    print("[*] Enabling TLS...")
    server.starttls()
    print("[OK] TLS enabled")

    print("[*] Logging in...")
    server.login(SMTP_EMAIL, SMTP_PASSWORD)
    print("[OK] Login successful")

    test_email = "jusouzaleandro@gmail.com"
    print(f"\n[*] Sending test email to {test_email}...")

    msg = MIMEText("This is a test email from NearHand verification system.\n\nVerification code: 123456\n\nThis code expires in 15 minutes.")
    msg["Subject"] = "Test Email - NearHand Verification"
    msg["From"] = SMTP_EMAIL
    msg["To"] = test_email

    server.send_message(msg)
    print(f"[OK] Email sent successfully to {test_email}")

    server.quit()
    print("[OK] SMTP connection closed")

except smtplib.SMTPAuthenticationError as e:
    print(f"[ERROR] Authentication failed: {e}")
    print("   Check SMTP_EMAIL and SMTP_PASSWORD in .env")
except smtplib.SMTPException as e:
    print(f"[ERROR] SMTP error: {e}")
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
