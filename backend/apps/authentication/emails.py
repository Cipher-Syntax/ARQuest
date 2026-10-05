import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def build_verification_email_html(otp: str, username: str = None) -> str:
    display_name = f"<strong>{username}</strong>" if username else "Explorer"
    # Format OTP as spaced digits for optimal legibility (e.g. "8 4 9 2 0 1")
    formatted_otp = " ".join(str(otp).strip())

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARQuest - Email Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Crimson Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #b21830 0%, #850f22 100%); padding: 36px 32px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- ARQuest Brand Monogram / Badge -->
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 8px 18px; margin-bottom: 12px;">
                      <span style="font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 2px;">ARQUEST // VERIFICATION</span>
                    </div>
                    <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
                      ARQuest
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #fecdd3; font-weight: 500; letter-spacing: 0.5px;">
                      Western Mindanao State University · Campus Exploration
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 14px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                Verify Your Email Address
              </h2>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 22px; color: #475569;">
                Hello {display_name},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #475569;">
                Welcome to <strong>ARQuest</strong>! To complete your registration and activate your student explorer profile, please use the single-use verification code below:
              </p>

              <!-- Highlighted OTP Code Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #fdf2f2; border: 2px dashed #b21830; border-radius: 10px; padding: 24px 16px;">
                    <span style="display: block; font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      Your One-Time Verification Code
                    </span>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #b21830; letter-spacing: 10px; line-height: 1; padding: 8px 0 6px 10px;">
                      {formatted_otp}
                    </div>
                    <div style="margin-top: 10px; display: inline-block; background-color: #fee2e2; border-radius: 20px; padding: 4px 12px;">
                      <span style="font-size: 11px; font-weight: 600; color: #991b1b;">
                        ⏱️ Valid for 5 minutes
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 20px; color: #475569;">
                Enter this 6-digit code on the verification screen in the ARQuest mobile application to activate your account and start your augmented reality campus adventure.
              </p>

              <!-- Security Notice Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-left: 3px solid #b21830; border-radius: 4px; padding: 14px 16px; margin-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b;">
                      <strong>Security Tip:</strong> Never share this verification code with anyone. ARQuest staff will never ask for your code. If you did not create an account with ARQuest, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subtle Separator -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 1px solid #e2e8f0;"></div>
            </td>
          </tr>

          <!-- University Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; text-align: center; background-color: #ffffff;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #334155;">
                Western Mindanao State University
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; line-height: 16px;">
                Normal Road, Baliwasan, Zamboanga City 7000<br>
                College of Science and Mathematics · Department of Information Technology
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: 500;">
                ARQuest Interactive Campus Navigation System · BSIT Capstone Project 2026–2027<br>
                This is an automated system email. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_verification_email_plain(otp: str, username: str = None) -> str:
    greeting = f"Hello {username}," if username else "Hello Explorer,"
    formatted_otp = str(otp).strip()

    return f"""==================================================
ARQUEST // EMAIL VERIFICATION
Western Mindanao State University
==================================================

{greeting}

Welcome to ARQuest! To complete your registration and activate your student explorer profile, please use the following one-time verification code:

--------------------------------------------------
VERIFICATION CODE: {formatted_otp}
--------------------------------------------------
⏱️ This code will expire in 5 minutes.

Enter this code in the ARQuest mobile application to verify your email address.

Security Tip:
Never share this code with anyone. ARQuest administrators will never ask for your verification code. If you did not request this email, please disregard it.

--------------------------------------------------
Western Mindanao State University
Normal Road, Baliwasan, Zamboanga City 7000
ARQuest Interactive Campus Navigation System
==================================================
"""


def send_verification_email(email: str, otp: str, username: str = None) -> bool:
    """
    Sends a beautifully designed HTML verification email with a plain-text fallback.
    Returns True on success. Raises on failure unless fail_silently is explicitly requested.
    """
    subject = "ARQuest - Verify Your Email Address"
    from_email = settings.DEFAULT_FROM_EMAIL

    plain_message = build_verification_email_plain(otp=otp, username=username)
    html_message = build_verification_email_html(otp=otp, username=username)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain_message,
        from_email=from_email,
        to=[email],
    )
    msg.attach_alternative(html_message, "text/html")
    msg.send(fail_silently=False)
    return True
