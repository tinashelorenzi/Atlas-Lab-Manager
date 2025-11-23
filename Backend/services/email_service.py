import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from models.integration import Integration

def get_smtp_config(db: Session) -> dict:
    """Get SMTP configuration from database"""
    smtp_integration = db.query(Integration).filter(Integration.name == "smtp").first()
    if not smtp_integration:
        print("SMTP integration not found in database")
        return None
    
    if not smtp_integration.config:
        print("SMTP config is empty")
        return None
    
    # Check if enabled - must be explicitly True
    if smtp_integration.enabled is not True:
        print(f"SMTP integration is disabled (enabled={smtp_integration.enabled})")
        return None
    
    try:
        config = json.loads(smtp_integration.config) if isinstance(smtp_integration.config, str) else smtp_integration.config
        if not config or not isinstance(config, dict):
            print("SMTP config is invalid")
            return None
        return config
    except Exception as e:
        print(f"Error parsing SMTP config: {e}")
        return None

def send_email(
    to_email: str,
    subject: str,
    body: str,
    db: Session
) -> bool:
    """Send email using SMTP configuration"""
    smtp_config = get_smtp_config(db)
    if not smtp_config:
        print("SMTP not configured or disabled")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_config.get('from_email', smtp_config.get('username', 'noreply@atlaslab.com'))
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        host = smtp_config.get('host', 'localhost')
        port = int(smtp_config.get('port', 1025))  # Default to 1025 for Mailpit
        
        # Ensure boolean values - handle string "true"/"false", actual booleans, or None
        use_tls_raw = smtp_config.get('use_tls', False)
        use_ssl_raw = smtp_config.get('use_ssl', False)
        
        # Convert to boolean - handle None, strings, and booleans
        if use_tls_raw is None:
            use_tls = False
        elif isinstance(use_tls_raw, bool):
            use_tls = use_tls_raw
        else:
            use_tls = str(use_tls_raw).lower() in ('true', '1', 'yes')
        
        if use_ssl_raw is None:
            use_ssl = False
        elif isinstance(use_ssl_raw, bool):
            use_ssl = use_ssl_raw
        else:
            use_ssl = str(use_ssl_raw).lower() in ('true', '1', 'yes')
        
        username = smtp_config.get('username', '')
        password = smtp_config.get('password', '')
        
        # Debug logging
        print(f"SMTP Config - Host: {host}, Port: {port}, TLS: {use_tls}, SSL: {use_ssl}, Auth: {bool(username and password)}")
        
        # For Mailpit (localhost:1025), no auth needed
        needs_auth = bool(username and password)
        
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port)
        else:
            server = smtplib.SMTP(host, port)
            # Only call starttls if explicitly enabled
            if use_tls:
                server.starttls()
        
        if needs_auth:
            server.login(username, password)
        
        server.send_message(msg)
        server.quit()
        
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_email_template(db: Session, template_name: str) -> dict:
    """Get email template from database, or return default"""
    from models.email_template import EmailTemplate
    template = db.query(EmailTemplate).filter(EmailTemplate.name == template_name).first()
    if template:
        return {
            'subject': template.subject,
            'body': template.body
        }
    return None

def send_welcome_email(
    to_email: str,
    full_name: str,
    temp_password: str,
    login_url: str,
    db: Session
) -> bool:
    """Send welcome email with temporary password"""
    # Try to get template from database
    template = get_email_template(db, 'user_welcome')
    
    if template:
        # Replace placeholders in template
        subject = template['subject'].replace('{{full_name}}', full_name)
        body = template['body'].replace('{{full_name}}', full_name)
        body = body.replace('{{email}}', to_email)
        body = body.replace('{{temp_password}}', temp_password)
        body = body.replace('{{login_url}}', login_url)
    else:
        # Default template
        subject = "Welcome to Atlas Lab Manager - Your Account Details"
        body = get_default_user_welcome_template(full_name, to_email, temp_password, login_url)
    
    return send_email(to_email, subject, body, db)

def send_customer_welcome_email(
    to_email: str,
    full_name: str,
    customer_id: str,
    db: Session
) -> bool:
    """Send welcome email to customer"""
    # Get organization name
    from models.organization import Organization
    org = db.query(Organization).first()
    org_name = org.name if org else "Atlas Lab Manager"
    
    # Try to get template from database
    template = get_email_template(db, 'customer_welcome')
    
    if template:
        # Replace placeholders in template
        subject = template['subject'].replace('{{full_name}}', full_name)
        subject = subject.replace('{{org_name}}', org_name)
        body = template['body'].replace('{{full_name}}', full_name)
        body = body.replace('{{customer_id}}', customer_id)
        body = body.replace('{{org_name}}', org_name)
    else:
        # Default template
        subject = f"Welcome to {org_name}"
        body = get_default_customer_welcome_template(full_name, customer_id, org_name)
    
    return send_email(to_email, subject, body, db)

def send_sample_collection_email(
    to_email: str,
    customer_name: str,
    sample_id: str,
    sample_name: str,
    collected_by: str,
    collected_at: str,
    db: Session
) -> bool:
    """Send sample collection confirmation email to customer"""
    # Get organization name
    from models.organization import Organization
    org = db.query(Organization).first()
    org_name = org.name if org else "Atlas Lab Manager"
    
    # Try to get template from database
    template = get_email_template(db, 'sample_collection')
    
    if template:
        # Replace placeholders in template
        subject = template['subject'].replace('{{sample_id}}', sample_id)
        subject = subject.replace('{{org_name}}', org_name)
        body = template['body'].replace('{{customer_name}}', customer_name)
        body = body.replace('{{sample_id}}', sample_id)
        body = body.replace('{{sample_name}}', sample_name)
        body = body.replace('{{collected_by}}', collected_by)
        body = body.replace('{{collected_at}}', collected_at)
        body = body.replace('{{org_name}}', org_name)
    else:
        # Default template
        subject = f"Sample Collection Confirmation - {sample_id}"
        body = get_default_sample_collection_template(
            customer_name, sample_id, sample_name, collected_by, collected_at, org_name
        )
    
    return send_email(to_email, subject, body, db)

def get_default_user_welcome_template(full_name: str, email: str, temp_password: str, login_url: str) -> str:
    """Default styled template for user welcome email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #3b82f6;
            }}
            .header h1 {{
                color: #1e40af;
                margin: 0;
                font-size: 28px;
            }}
            .content {{
                margin: 30px 0;
            }}
            .credentials {{
                background-color: #f8fafc;
                border-left: 4px solid #3b82f6;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .credentials p {{
                margin: 10px 0;
            }}
            .credentials strong {{
                color: #1e40af;
            }}
            .button {{
                display: inline-block;
                background-color: #3b82f6;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
            }}
            .button:hover {{
                background-color: #2563eb;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }}
            .warning {{
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                color: #92400e;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Atlas Lab Manager</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{full_name}</strong>,</p>
                <p>Your account has been created successfully. Please use the following credentials to log in:</p>
                
                <div class="credentials">
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Temporary Password:</strong> {temp_password}</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong> For security reasons, you will be required to set a new password on your first login.
                </div>
                
                <div style="text-align: center;">
                    <a href="{login_url}" class="button">Log In Now</a>
                </div>
                
                <p>If you have any questions or need assistance, please contact your administrator.</p>
            </div>
            <div class="footer">
                <p>This is an automated message from Atlas Lab Manager. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_default_customer_welcome_template(full_name: str, customer_id: str, org_name: str) -> str:
    """Default styled template for customer welcome email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #3b82f6;
            }}
            .header h1 {{
                color: #1e40af;
                margin: 0;
                font-size: 28px;
            }}
            .content {{
                margin: 30px 0;
            }}
            .customer-id {{
                background-color: #f8fafc;
                border-left: 4px solid #3b82f6;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
                text-align: center;
            }}
            .customer-id-code {{
                font-size: 32px;
                font-weight: bold;
                color: #1e40af;
                letter-spacing: 4px;
                font-family: 'Courier New', monospace;
            }}
            .partnership {{
                background-color: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to {org_name}</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{full_name}</strong>,</p>
                
                <div class="partnership">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af; font-weight: 600;">
                        Thank you for choosing to partner with us!
                    </p>
                    <p style="margin: 0; color: #4b5563;">
                        We are delighted to welcome you to <strong>{org_name}</strong>. We appreciate your trust in our services and look forward to building a successful partnership with you.
                    </p>
                </div>
                
                <p>As a valued partner, you now have access to our comprehensive testing and laboratory services. To help you get started, here is your unique Customer ID:</p>
                
                <div class="customer-id">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-weight: 500;">Your Customer ID:</p>
                    <div class="customer-id-code">{customer_id}</div>
                </div>
                
                <p>Please keep this Customer ID handy as you'll need it for future reference when submitting samples or checking results.</p>
                
                <p>Our team is here to support you every step of the way. If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
                
                <p>Once again, thank you for choosing <strong>{org_name}</strong>. We look forward to serving you!</p>
            </div>
            <div class="footer">
                <p>This is an automated message from {org_name}. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_default_sample_collection_template(
    customer_name: str,
    sample_id: str,
    sample_name: str,
    collected_by: str,
    collected_at: str,
    org_name: str
) -> str:
    """Default styled template for sample collection confirmation email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #3b82f6;
            }}
            .header h1 {{
                color: #1e40af;
                margin: 0;
                font-size: 28px;
            }}
            .content {{
                margin: 30px 0;
            }}
            .confirmation-box {{
                background-color: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .sample-details {{
                background-color: #f8fafc;
                border-left: 4px solid #3b82f6;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .sample-id {{
                font-size: 24px;
                font-weight: bold;
                color: #1e40af;
                letter-spacing: 2px;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
            }}
            .detail-row:last-child {{
                border-bottom: none;
            }}
            .detail-label {{
                color: #6b7280;
                font-weight: 500;
            }}
            .detail-value {{
                color: #1f2937;
                font-weight: 600;
            }}
            .success-icon {{
                text-align: center;
                margin: 20px 0;
            }}
            .success-icon svg {{
                width: 64px;
                height: 64px;
                color: #10b981;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Sample Collection Confirmation</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{customer_name}</strong>,</p>
                
                <div class="confirmation-box">
                    <div class="success-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p style="text-align: center; margin: 0; font-size: 18px; color: #1e40af; font-weight: 600;">
                        Your sample has been successfully collected!
                    </p>
                </div>
                
                <p>We are pleased to confirm that your sample has been received and recorded in our system. Below are the details:</p>
                
                <div class="sample-details">
                    <div class="detail-row">
                        <span class="detail-label">Sample ID:</span>
                        <span class="detail-value sample-id">{sample_id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Sample Name:</span>
                        <span class="detail-value">{sample_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Collected By:</span>
                        <span class="detail-value">{collected_by}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Collection Date & Time:</span>
                        <span class="detail-value">{collected_at}</span>
                    </div>
                </div>
                
                <p>Your sample is now in our system and will be processed according to the assigned test departments. You will receive updates as testing progresses.</p>
                
                <p>Please keep this Sample ID (<strong>{sample_id}</strong>) for your records and future reference.</p>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
                
                <p>Thank you for choosing <strong>{org_name}</strong>!</p>
            </div>
            <div class="footer">
                <p>This is an automated message from {org_name}. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

