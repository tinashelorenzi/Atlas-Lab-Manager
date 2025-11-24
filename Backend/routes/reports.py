from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse, FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
from models.report import Report, ReportStatus
from models.result_entry import ResultEntry, ResultValue
from models.sample import Sample
from models.customer import Customer
from models.organization import Organization
from models.user import User
from schemas.report import ReportCreate, ReportUpdate, ReportResponse, ReportWithDetails
from routes.auth import get_current_user
from routes.settings import require_lab_admin_or_manager
import json
import hashlib
import secrets
import os
from weasyprint import HTML
from io import BytesIO

router = APIRouter(prefix="/api/reports", tags=["reports"])

def generate_report_number(db: Session) -> str:
    """Generate unique report number: RPT-YYYY-XXX"""
    current_year = datetime.now().year
    # Get the last report number for this year
    last_report = db.query(Report).filter(
        Report.report_number.like(f"RPT-{current_year}-%")
    ).order_by(Report.report_number.desc()).first()
    
    if last_report:
        # Extract the number part and increment
        try:
            last_num = int(last_report.report_number.split('-')[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    
    return f"RPT-{current_year}-{next_num:03d}"

def generate_report_fingerprint(report_data: dict) -> str:
    """Generate SHA-256 fingerprint for report verification"""
    # Create a canonical representation of the report data
    canonical = json.dumps(report_data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()

def generate_view_key() -> str:
    """Generate a unique view key for customer access"""
    return secrets.token_urlsafe(32)  # 32 bytes = 43 characters URL-safe

def format_report_response(report: Report) -> dict:
    """Format report response with related data"""
    return {
        "id": report.id,
        "result_entry_id": report.result_entry_id,
        "report_number": report.report_number,
        "status": report.status.value,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        "generated_by_id": report.generated_by_id,
        "generated_by_name": report.generated_by.full_name if report.generated_by else "",
        "amended_at": report.amended_at.isoformat() if report.amended_at else None,
        "amended_by_id": report.amended_by_id,
        "amended_by_name": report.amended_by.full_name if report.amended_by else None,
        "validated_at": report.validated_at.isoformat() if report.validated_at else None,
        "validated_by_id": report.validated_by_id,
        "validated_by_name": report.validated_by.full_name if report.validated_by else None,
        "finalized_at": report.finalized_at.isoformat() if report.finalized_at else None,
        "finalized_by_id": report.finalized_by_id,
        "finalized_by_name": report.finalized_by.full_name if report.finalized_by else None,
        "fingerprint": report.fingerprint,
        "view_key": report.view_key,
        "notes": report.notes,
        "sample_id_code": report.result_entry.sample.sample_id if report.result_entry and report.result_entry.sample else "",
        "sample_name": report.result_entry.sample.name if report.result_entry and report.result_entry.sample else "",
        "customer_name": report.result_entry.sample.customer.full_name if report.result_entry and report.result_entry.sample and report.result_entry.sample.customer else "",
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }

@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a new report from a result entry"""
    # Verify result entry exists and is committed
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == report.result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    if not result_entry.is_committed:
        raise HTTPException(status_code=400, detail="Cannot generate report from uncommitted result entry")
    
    # Check if a proposed report already exists
    existing = db.query(Report).filter(
        Report.result_entry_id == report.result_entry_id,
        Report.status == ReportStatus.PROPOSED
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An amended report already exists for this result entry")
    
    # Generate report number
    report_number = generate_report_number(db)
    
    # Build report data structure
    sample = result_entry.sample
    customer = sample.customer if sample else None
    
    # Group results by department (if departments are linked to samples)
    report_data = {
        "sample_id": sample.sample_id if sample else "",
        "sample_name": sample.name if sample else "",
        "customer_name": customer.full_name if customer else "",
        "customer_id": customer.customer_id if customer else "",
        "result_values": [
            {
                "id": rv.id,
                "test_type": rv.test_type,
                "value": rv.value,
                "unit": rv.unit,
                "unit_type": rv.unit_type,
                "notes": rv.notes,
            }
            for rv in result_entry.result_values
        ],
        "departments": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Add department information if available
    if sample and sample.departments:
        for dept in sample.departments:
            # Convert ResultValue objects to dictionaries
            dept_tests = [
                {
                    "id": rv.id,
                    "test_type": rv.test_type,
                    "value": rv.value,
                    "unit": rv.unit,
                    "unit_type": rv.unit_type,
                    "notes": rv.notes,
                }
                for rv in result_entry.result_values
            ]  # Simplified - in real scenario, link tests to departments
            report_data["departments"].append({
                "id": dept.id,
                "name": dept.name,
                "tests": dept_tests,
            })
    
    # Generate fingerprint
    fingerprint = generate_report_fingerprint(report_data)
    
    # Create report
    db_report = Report(
        result_entry_id=report.result_entry_id,
        report_number=report_number,
        status=ReportStatus.PROPOSED,
        generated_by_id=current_user.id,
        report_data=json.dumps(report_data),
        fingerprint=fingerprint,
        notes=report.notes,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return format_report_response(db_report)

@router.get("/proposed", response_model=List[ReportResponse])
async def get_proposed_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get all amended reports (manager/admin only)"""
    reports = db.query(Report).filter(Report.status == ReportStatus.PROPOSED).order_by(Report.generated_at.desc()).all()
    return [format_report_response(r) for r in reports]

@router.get("/finalized", response_model=List[ReportResponse])
async def get_finalized_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all finalized and validated reports"""
    reports = db.query(Report).filter(
        Report.status.in_([ReportStatus.FINALIZED, ReportStatus.VALIDATED])
    ).order_by(
        func.coalesce(Report.finalized_at, Report.validated_at, Report.generated_at).desc()
    ).all()
    return [format_report_response(r) for r in reports]

@router.get("/{report_id}", response_model=ReportWithDetails)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific report with full details"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    response_data = format_report_response(report)
    
    # Add report data
    if report.report_data:
        try:
            response_data["report_data"] = json.loads(report.report_data)
        except (json.JSONDecodeError, TypeError):
            response_data["report_data"] = {}
    
    # Add result entry details
    if report.result_entry:
        response_data["result_entry"] = {
            "id": report.result_entry.id,
            "sample_id": report.result_entry.sample.sample_id if report.result_entry.sample else "",
            "is_committed": report.result_entry.is_committed,
            "result_values": [
                {
                    "id": rv.id,
                    "test_type": rv.test_type,
                    "value": rv.value,
                    "unit": rv.unit,
                    "unit_type": rv.unit_type,
                }
                for rv in report.result_entry.result_values
            ],
        }
    
    return response_data

@router.post("/{report_id}/validate", response_model=ReportResponse)
async def validate_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Validate and finalize an amended report (manager/admin only)"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.PROPOSED:
        raise HTTPException(status_code=400, detail=f"Cannot validate report with status {report.status.value}")
    
    # Validate and finalize in one step
    report.status = ReportStatus.FINALIZED
    report.validated_at = datetime.now(timezone.utc)
    report.validated_by_id = current_user.id
    report.finalized_at = datetime.now(timezone.utc)
    report.finalized_by_id = current_user.id
    
    db.commit()
    db.refresh(report)
    
    return format_report_response(report)

@router.post("/{report_id}/finalize", response_model=ReportResponse)
async def finalize_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Finalize a validated report (manager/admin only)"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.VALIDATED:
        raise HTTPException(status_code=400, detail=f"Cannot finalize report with status {report.status.value}")
    
    report.status = ReportStatus.FINALIZED
    report.finalized_at = datetime.now(timezone.utc)
    report.finalized_by_id = current_user.id
    
    db.commit()
    db.refresh(report)
    
    return format_report_response(report)

@router.get("/{report_id}/document", response_class=HTMLResponse)
async def get_report_document(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get report as HTML document for viewing/downloading"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Use the shared HTML generation function
    html_content = generate_report_html(report, db)
    return HTMLResponse(content=html_content)

def generate_report_html(report: Report, db: Session) -> str:
    """Generate HTML content for report (used for both viewing and PDF generation)"""
    # Get organization details
    org = db.query(Organization).first()
    org_name = org.name if org else "Atlas Lab"
    org_address = org.address if org else ""
    org_phone = org.phone if org else ""
    org_email = org.email if org else ""
    org_website = org.website if org else ""
    org_logo_url = None
    if org and org.logo_url:
        if org.logo_url.startswith('http'):
            org_logo_url = org.logo_url
        else:
            org_logo_url = f"/uploads/{org.logo_url}" if not org.logo_url.startswith('/') else org.logo_url
    
    # Parse report data
    report_data = {}
    if report.report_data:
        try:
            report_data = json.loads(report.report_data)
        except (json.JSONDecodeError, TypeError):
            report_data = {}
    
    sample = report.result_entry.sample if report.result_entry else None
    customer = sample.customer if sample else None
    
    # Format dates
    generated_date = report.generated_at.strftime("%B %d, %Y") if report.generated_at else "N/A"
    amended_date = report.amended_at.strftime("%B %d, %Y") if report.amended_at else None
    finalized_date = report.finalized_at.strftime("%B %d, %Y") if report.finalized_at else None
    current_year = datetime.now().year
    
    # Build HTML document (same as get_report_document but returns string)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report {report.report_number}</title>
        <style>
            @page {{
                size: A4;
                margin: 1.5cm;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.5;
                color: #1f2937;
                max-width: 210mm;
                margin: 0 auto;
                padding: 10mm;
                background: white;
            }}
            .letterhead {{
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            .letterhead-content {{
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .letterhead-left {{
                flex: 1;
            }}
            .logo {{
                max-width: 150px;
                max-height: 80px;
                margin-bottom: 10px;
            }}
            .org-name {{
                font-size: 24px;
                font-weight: bold;
                color: #1e40af;
                margin: 10px 0 5px 0;
            }}
            .org-details {{
                font-size: 12px;
                color: #6b7280;
                line-height: 1.5;
            }}
            .report-header {{
                margin: 30px 0;
                text-align: center;
            }}
            .report-title {{
                font-size: 28px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 10px;
            }}
            .report-number {{
                font-size: 18px;
                color: #6b7280;
                font-weight: 600;
            }}
            .report-info {{
                background-color: #f8fafc;
                border-left: 4px solid #3b82f6;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .info-row {{
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #e5e7eb;
            }}
            .info-row:last-child {{
                border-bottom: none;
            }}
            .info-label {{
                font-weight: 600;
                color: #4b5563;
            }}
            .info-value {{
                color: #1f2937;
            }}
            .section {{
                margin: 30px 0;
            }}
            .section-title {{
                font-size: 20px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e5e7eb;
            }}
            .results-table {{
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }}
            .results-table th {{
                background-color: #3b82f6;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
            }}
            .results-table td {{
                padding: 10px 12px;
                border-bottom: 1px solid #e5e7eb;
            }}
            .department-section {{
                margin: 25px 0;
                padding: 15px;
                background-color: #f8fafc;
                border-radius: 6px;
            }}
            .department-name {{
                font-size: 18px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 10px;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                font-size: 11px;
                color: #6b7280;
            }}
            .fingerprint-row {{
                display: block;
                padding: 8px 0;
            }}
            .fingerprint-label {{
                font-weight: 600;
                color: #4b5563;
                display: block;
                margin-bottom: 5px;
            }}
            .fingerprint-value {{
                color: #1f2937;
                font-family: monospace;
                font-size: 10px;
                word-break: break-all;
                line-height: 1.4;
            }}
        </style>
    </head>
    <body>
        <div class="letterhead">
            <div class="letterhead-content">
                <div class="letterhead-left">
                    {f'<img src="{org_logo_url}" alt="{org_name}" class="logo" />' if org_logo_url else ''}
                    <div class="org-name">{org_name}</div>
                    <div class="org-details">
                        {f'<div>{org_address}</div>' if org_address else ''}
                        {f'<div>Phone: {org_phone}</div>' if org_phone else ''}
                        {f'<div>Email: {org_email}</div>' if org_email else ''}
                        {f'<div>Website: {org_website}</div>' if org_website else ''}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-header">
            <div class="report-title">Test Results Report</div>
            <div class="report-number">Report Number: {report.report_number}</div>
        </div>
        
        <div class="report-info">
            <div class="info-row">
                <span class="info-label">Sample ID:</span>
                <span class="info-value">{report_data.get('sample_id', 'N/A')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sample Name:</span>
                <span class="info-value">{report_data.get('sample_name', 'N/A')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Customer:</span>
                <span class="info-value">{report_data.get('customer_name', 'N/A')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Customer ID:</span>
                <span class="info-value">{report_data.get('customer_id', 'N/A')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Date Generated:</span>
                <span class="info-value">{generated_date}</span>
            </div>
            {f'<div class="info-row"><span class="info-label">Date Amended:</span><span class="info-value">{amended_date}</span></div>' if amended_date else ''}
            {f'<div class="info-row"><span class="info-label">Date Finalized:</span><span class="info-value">{finalized_date}</span></div>' if finalized_date else ''}
        </div>
        
        <div class="section">
            <div class="section-title">Test Results</div>
    """
    
    # Add department sections if available
    if report_data.get('departments'):
        for dept in report_data['departments']:
            html += f"""
            <div class="department-section">
                <div class="department-name">{dept.get('name', 'Unknown Department')}</div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Test Type</th>
                            <th>Value</th>
                            <th>Unit</th>
                            <th>Unit Type</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            for test in dept.get('tests', []):
                html += f"""
                        <tr>
                            <td>{test.get('test_type', 'N/A')}</td>
                            <td>{test.get('value', 'N/A')}</td>
                            <td>{test.get('unit', '-')}</td>
                            <td>{test.get('unit_type', '-')}</td>
                            <td>{test.get('notes', '-')}</td>
                        </tr>
                """
            html += """
                    </tbody>
                </table>
            </div>
            """
    else:
        # Fallback: show all results in a single table
        html += """
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Test Type</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Unit Type</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        """
        for result in report_data.get('result_values', []):
            html += f"""
                    <tr>
                        <td>{result.get('test_type', 'N/A')}</td>
                        <td>{result.get('value', 'N/A')}</td>
                        <td>{result.get('unit', '-')}</td>
                        <td>{result.get('unit_type', '-')}</td>
                        <td>{result.get('notes', '-')}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    
    # Add notes if available
    if report.notes:
        html += f"""
        <div class="section">
            <div class="section-title">Notes</div>
            <p>{report.notes}</p>
        </div>
        """
    
    # Add fingerprint if finalized
    if report.fingerprint and report.status == ReportStatus.FINALIZED:
        html += f"""
        <div class="section">
            <div class="section-title">Report Verification</div>
            <div class="report-info">
                <div class="fingerprint-row">
                    <span class="fingerprint-label">Fingerprint:</span>
                    <span class="fingerprint-value">{report.fingerprint}</span>
                </div>
            </div>
        </div>
        """
    
    # Footer
    html += f"""
        <div class="footer">
            <p>Generated from Atlas Lab Manager - {current_year}</p>
            {f'<p style="margin-top: 5px; font-size: 10px; color: #9ca3af;">Report Fingerprint: {report.fingerprint}</p>' if report.fingerprint else ''}
        </div>
    </body>
    </html>
    """
    
    return html

@router.get("/{report_id}/pdf")
async def get_report_pdf(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get report as PDF file"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Generate HTML
    html_content = generate_report_html(report, db)
    
    # Convert HTML to PDF
    pdf_bytes = HTML(string=html_content).write_pdf()
    
    # Return PDF as file response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{report.report_number}.pdf"'
        }
    )

@router.post("/{report_id}/send-to-customer", response_model=ReportResponse)
async def send_report_to_customer(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Send report to customer via email with view key"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.FINALIZED:
        raise HTTPException(status_code=400, detail="Only finalized reports can be sent to customers")
    
    sample = report.result_entry.sample if report.result_entry else None
    customer = sample.customer if sample else None
    
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer email not found")
    
    # Generate view key if not exists (for resends, keep existing key)
    if not report.view_key:
        view_key = generate_view_key()
        # Ensure uniqueness
        while db.query(Report).filter(Report.view_key == view_key).first():
            view_key = generate_view_key()
        report.view_key = view_key
        db.commit()
        db.refresh(report)
    # If view_key already exists, we'll just resend with the existing key
    
    # Parse report data
    report_data = {}
    if report.report_data:
        try:
            report_data = json.loads(report.report_data)
        except (json.JSONDecodeError, TypeError):
            report_data = {}
    
    # Generate PDF
    html_content = generate_report_html(report, db)
    pdf_bytes = HTML(string=html_content).write_pdf()
    
    # Send email with PDF attachment
    from services.email_service import send_report_email
    from models.organization import Organization
    org = db.query(Organization).first()
    org_name = org.name if org else "Atlas Lab"
    
    # Get public URL (you'll need to configure this)
    public_url = os.getenv("PUBLIC_URL", "http://localhost:5173")
    sample_id = report_data.get('sample_id', '') or (sample.sample_id if sample else '')
    view_url = f"{public_url}/view-report?sample_id={sample_id}&view_key={report.view_key}"
    
    success = send_report_email(
        to_email=customer.email,
        customer_name=customer.full_name,
        sample_id=report_data.get('sample_id', ''),
        report_number=report.report_number,
        view_key=report.view_key,
        view_url=view_url,
        pdf_bytes=pdf_bytes,
        report_filename=f"{report.report_number}.pdf",
        org_name=org_name,
        db=db
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    return format_report_response(report)

@router.get("/public/view")
async def get_public_report(
    sample_id: str = Query(..., description="Sample ID"),
    view_key: str = Query(..., description="View key"),
    db: Session = Depends(get_db)
):
    """Public endpoint to view report by sample ID and view key"""
    # Find report by sample ID and view key
    sample = db.query(Sample).filter(Sample.sample_id == sample_id).first()
    if sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    result_entry = db.query(ResultEntry).filter(ResultEntry.sample_id == sample.id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    report = db.query(Report).filter(
        Report.result_entry_id == result_entry.id,
        Report.view_key == view_key,
        Report.status == ReportStatus.FINALIZED
    ).first()
    
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found or invalid view key")
    
    # Return report data
    response_data = format_report_response(report)
    if report.report_data:
        try:
            response_data["report_data"] = json.loads(report.report_data)
        except (json.JSONDecodeError, TypeError):
            response_data["report_data"] = {}
    
    return response_data

@router.get("/public/{report_id}/pdf")
async def get_public_report_pdf(
    report_id: int,
    view_key: str = Query(..., description="View key"),
    db: Session = Depends(get_db)
):
    """Public endpoint to download report PDF by view key"""
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.view_key == view_key,
        Report.status == ReportStatus.FINALIZED
    ).first()
    
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found or invalid view key")
    
    # Generate PDF
    html_content = generate_report_html(report, db)
    pdf_bytes = HTML(string=html_content).write_pdf()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{report.report_number}.pdf"'
        }
    )

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a report (only amended reports can be deleted)"""
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != ReportStatus.PROPOSED:
        raise HTTPException(status_code=400, detail="Only amended reports can be deleted")
    
    db.delete(report)
    db.commit()
    
    return None

