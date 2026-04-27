"""
Email service for sending job-match notifications via SMTP.

Required environment variables:
  SMTP_HOST     — e.g. smtp.gmail.com
  SMTP_PORT     — e.g. 587  (TLS) or 465 (SSL)
  SMTP_USER     — sender email address
  SMTP_PASSWORD — sender email password / app password
  FROM_EMAIL    — display address (defaults to SMTP_USER)
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_job_notification_email(
        to_email: str,
        student_name: str,
        jobs: list[dict]
        ) -> bool:
    """
    Send a job-match notification email.

    Args:
        to_email:     Recipient email address.
        student_name: Recipient's first / full name.
        jobs:         List of dicts with keys: title, company, location, url.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", smtp_user)

    if not smtp_user or not smtp_password:
        print("[email_service] SMTP credentials not configured – skipping email.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Align: {len(jobs)} new job match{'es' if len(jobs) != 1 else ''} found!"
    msg["From"] = f"Align <{from_email}>"
    msg["To"] = to_email

    # --- Plain text ---
    plain_jobs = "\n".join(
        f"  • {j['title']} at {j.get('company', 'Unknown')} ({j.get('location', '')})\n"
        f"    {j.get('url', '')}"
        for j in jobs
    )
    plain = (
        f"Hi {student_name},\n\n"
        f"We found new internship listings that closely match your profile:\n\n"
        f"{plain_jobs}\n\n"
        "Log in to Align to review your full recommendations.\n\n"
        "— The Align Team\n\n"
        "To turn off email notifications, visit your Notification Settings in Align."
    )

    # --- HTML ---
    job_cards_html = ""
    for job in jobs:
        job_cards_html += f"""
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px;background:#fafafa;">
          <p style="margin:0 0 2px;font-size:16px;font-weight:700;color:#1e293b;">{job['title']}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#64748b;">{job.get('company','')}&ensp;&bull;&ensp;{job.get('location','')}</p>
          <a href="{job.get('url','#')}"
             style="display:inline-block;padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
                    border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
            View Job &rarr;
          </a>
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px 14px 0 0;padding:32px 32px 24px;">
            <p style="margin:0;font-size:28px;font-weight:800;color:#fff;">Align</p>
            <p style="margin:6px 0 0;font-size:16px;color:rgba(255,255,255,.75);">New job matches found for you</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border-radius:0 0 14px 14px;">
            <p style="margin:0 0 20px;font-size:15px;color:#475569;">
              Hi <strong>{student_name}</strong>,<br><br>
              We found <strong>{len(jobs)} new internship listing{'s' if len(jobs) != 1 else ''}</strong>
              that closely match{'es' if len(jobs) == 1 else ''} your profile on Align.
            </p>
            {job_cards_html}
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
              You're receiving this because you enabled email notifications on Align.<br>
              You can turn this off in your
              <a href="#" style="color:#6366f1;text-decoration:none;">Notification Settings</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())
        print(f"[email_service] Email sent to {to_email}")
        return True
    except Exception as exc:
        print(f"[email_service] Failed to send email to {to_email}: {exc}")
        return False
