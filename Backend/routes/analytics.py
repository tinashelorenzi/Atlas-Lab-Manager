from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from database import get_db
from models.user import User, UserType
from models.login_history import LoginHistory
from models.request_log import RequestLog, HTTPMethod
from models.user_impersonation import UserImpersonation
from models.customer import Customer
from models.sample import Sample
from models.project import Project
from models.result_entry import ResultEntry
from models.report import Report
from routes.auth import get_current_user
from routes.settings import require_lab_admin_or_manager
import json

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Check if user is super administrator"""
    if current_user.user_type != UserType.SUPER_ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super Administrator required."
        )
    return current_user

@router.get("/stats/overview")
async def get_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get overview statistics"""
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)
    
    # User stats
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    users_by_type = db.query(
        User.user_type,
        func.count(User.id).label('count')
    ).group_by(User.user_type).all()
    
    # Login stats
    total_logins = db.query(LoginHistory).filter(LoginHistory.success == True).count()
    failed_logins = db.query(LoginHistory).filter(LoginHistory.success == False).count()
    logins_24h = db.query(LoginHistory).filter(
        and_(LoginHistory.success == True, LoginHistory.created_at >= last_24h)
    ).count()
    failed_logins_24h = db.query(LoginHistory).filter(
        and_(LoginHistory.success == False, LoginHistory.created_at >= last_24h)
    ).count()
    
    # Request stats
    total_requests = db.query(RequestLog).count()
    requests_24h = db.query(RequestLog).filter(RequestLog.created_at >= last_24h).count()
    
    # Error stats
    error_500 = db.query(RequestLog).filter(RequestLog.status_code == 500).count()
    error_500_24h = db.query(RequestLog).filter(
        and_(RequestLog.status_code == 500, RequestLog.created_at >= last_24h)
    ).count()
    
    error_401 = db.query(RequestLog).filter(RequestLog.status_code == 401).count()
    error_401_24h = db.query(RequestLog).filter(
        and_(RequestLog.status_code == 401, RequestLog.created_at >= last_24h)
    ).count()
    
    error_403 = db.query(RequestLog).filter(RequestLog.status_code == 403).count()
    error_403_24h = db.query(RequestLog).filter(
        and_(RequestLog.status_code == 403, RequestLog.created_at >= last_24h)
    ).count()
    
    error_404 = db.query(RequestLog).filter(RequestLog.status_code == 404).count()
    error_404_24h = db.query(RequestLog).filter(
        and_(RequestLog.status_code == 404, RequestLog.created_at >= last_24h)
    ).count()
    
    # Business stats
    total_customers = db.query(Customer).count()
    total_samples = db.query(Sample).count()
    total_projects = db.query(Project).count()
    total_result_entries = db.query(ResultEntry).count()
    total_reports = db.query(Report).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "by_type": {ut.value: count for ut, count in users_by_type}
        },
        "logins": {
            "total_successful": total_logins,
            "total_failed": failed_logins,
            "successful_24h": logins_24h,
            "failed_24h": failed_logins_24h
        },
        "requests": {
            "total": total_requests,
            "last_24h": requests_24h
        },
        "errors": {
            "500_internal_server_error": {
                "total": error_500,
                "last_24h": error_500_24h
            },
            "401_unauthorized": {
                "total": error_401,
                "last_24h": error_401_24h
            },
            "403_forbidden": {
                "total": error_403,
                "last_24h": error_403_24h
            },
            "404_not_found": {
                "total": error_404,
                "last_24h": error_404_24h
            }
        },
        "business": {
            "customers": total_customers,
            "samples": total_samples,
            "projects": total_projects,
            "result_entries": total_result_entries,
            "reports": total_reports
        }
    }

@router.get("/logins/history")
async def get_login_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    success_only: bool = Query(False),
    failed_only: bool = Query(False),
    user_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get login history with filters"""
    query = db.query(LoginHistory)
    
    if success_only:
        query = query.filter(LoginHistory.success == True)
    elif failed_only:
        query = query.filter(LoginHistory.success == False)
    
    if user_id:
        query = query.filter(LoginHistory.user_id == user_id)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(LoginHistory.created_at >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(LoginHistory.created_at <= end_dt)
        except ValueError:
            pass
    
    total = query.count()
    logins = query.order_by(LoginHistory.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": [
            {
                "id": login.id,
                "user_id": login.user_id,
                "user_name": login.user.full_name if login.user else None,
                "email": login.email,
                "success": login.success,
                "ip_address": login.ip_address,
                "user_agent": login.user_agent,
                "failure_reason": login.failure_reason,
                "created_at": login.created_at.isoformat() if login.created_at else None
            }
            for login in logins
        ]
    }

@router.get("/security/telemetry")
async def get_security_telemetry(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get security telemetry data"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Failed logins
    failed_logins = db.query(LoginHistory).filter(
        and_(
            LoginHistory.success == False,
            LoginHistory.created_at >= start_date
        )
    ).order_by(LoginHistory.created_at.desc()).all()
    
    # Status code breakdown
    status_codes = db.query(
        RequestLog.status_code,
        func.count(RequestLog.id).label('count')
    ).filter(
        RequestLog.created_at >= start_date
    ).group_by(RequestLog.status_code).all()
    
    # Error requests (4xx and 5xx)
    error_requests = db.query(RequestLog).filter(
        and_(
            RequestLog.status_code >= 400,
            RequestLog.created_at >= start_date
        )
    ).order_by(RequestLog.created_at.desc()).limit(100).all()
    
    # Failed logins by reason
    failed_by_reason = db.query(
        LoginHistory.failure_reason,
        func.count(LoginHistory.id).label('count')
    ).filter(
        and_(
            LoginHistory.success == False,
            LoginHistory.created_at >= start_date
        )
    ).group_by(LoginHistory.failure_reason).all()
    
    # Failed logins by IP
    failed_by_ip = db.query(
        LoginHistory.ip_address,
        func.count(LoginHistory.id).label('count')
    ).filter(
        and_(
            LoginHistory.success == False,
            LoginHistory.created_at >= start_date,
            LoginHistory.ip_address.isnot(None)
        )
    ).group_by(LoginHistory.ip_address).order_by(func.count(LoginHistory.id).desc()).limit(20).all()
    
    return {
        "period_days": days,
        "failed_logins": {
            "total": len(failed_logins),
            "by_reason": {reason or "Unknown": count for reason, count in failed_by_reason},
            "by_ip": {ip: count for ip, count in failed_by_ip},
            "recent": [
                {
                    "id": login.id,
                    "email": login.email,
                    "ip_address": login.ip_address,
                    "failure_reason": login.failure_reason,
                    "user_agent": login.user_agent,
                    "created_at": login.created_at.isoformat() if login.created_at else None
                }
                for login in failed_logins[:50]
            ]
        },
        "status_codes": {str(code): count for code, count in status_codes},
        "error_requests": [
            {
                "id": req.id,
                "method": req.method.value,
                "path": req.path,
                "status_code": req.status_code,
                "user_id": req.user_id,
                "ip_address": req.ip_address,
                "error_message": req.error_message,
                "created_at": req.created_at.isoformat() if req.created_at else None
            }
            for req in error_requests
        ]
    }

@router.get("/logins/chart")
async def get_login_chart_data(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get login data for charting (grouped by day)"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Group successful logins by day
    successful_by_day = db.query(
        func.date(LoginHistory.created_at).label('date'),
        func.count(LoginHistory.id).label('count')
    ).filter(
        and_(
            LoginHistory.success == True,
            LoginHistory.created_at >= start_date
        )
    ).group_by(func.date(LoginHistory.created_at)).all()
    
    # Group failed logins by day
    failed_by_day = db.query(
        func.date(LoginHistory.created_at).label('date'),
        func.count(LoginHistory.id).label('count')
    ).filter(
        and_(
            LoginHistory.success == False,
            LoginHistory.created_at >= start_date
        )
    ).group_by(func.date(LoginHistory.created_at)).all()
    
    # Create date range
    date_map = {}
    for i in range(days):
        date = (now - timedelta(days=i)).date()
        date_map[date] = {"successful": 0, "failed": 0}
    
    # Fill in data
    for date, count in successful_by_day:
        if date in date_map:
            date_map[date]["successful"] = count
    
    for date, count in failed_by_day:
        if date in date_map:
            date_map[date]["failed"] = count
    
    # Convert to list sorted by date
    chart_data = [
        {
            "date": str(date),
            "successful": data["successful"],
            "failed": data["failed"]
        }
        for date, data in sorted(date_map.items())
    ]
    
    return chart_data

@router.get("/requests/chart")
async def get_requests_chart_data(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get request data for charting (grouped by day and status code)"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Group by day and status code
    requests_by_day_status = db.query(
        func.date(RequestLog.created_at).label('date'),
        RequestLog.status_code,
        func.count(RequestLog.id).label('count')
    ).filter(
        RequestLog.created_at >= start_date
    ).group_by(
        func.date(RequestLog.created_at),
        RequestLog.status_code
    ).all()
    
    # Create date range
    date_map = {}
    for i in range(days):
        date = (now - timedelta(days=i)).date()
        date_map[date] = {}
    
    # Fill in data
    for date, status_code, count in requests_by_day_status:
        if date in date_map:
            if status_code not in date_map[date]:
                date_map[date][status_code] = 0
            date_map[date][status_code] = count
    
    # Convert to list sorted by date
    chart_data = [
        {
            "date": str(date),
            "status_codes": {str(code): count for code, count in status_data.items()},
            "total": sum(status_data.values())
        }
        for date, status_data in sorted(date_map.items())
    ]
    
    return chart_data

@router.get("/users/list")
async def get_users_for_impersonation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get list of users that can be impersonated (lab admins and managers)"""
    users = db.query(User).filter(
        User.user_type.in_([UserType.LAB_ADMINISTRATOR, UserType.LAB_MANAGER]),
        User.is_active == True
    ).order_by(User.full_name).all()
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "user_type": user.user_type.value,
            "is_active": user.is_active
        }
        for user in users
    ]

class ImpersonationRequest(BaseModel):
    reason: Optional[str] = None

@router.post("/impersonate/end")
async def end_impersonation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """End current impersonation"""
    # Find active impersonation
    impersonation = db.query(UserImpersonation).filter(
        and_(
            UserImpersonation.super_admin_id == current_user.id,
            UserImpersonation.ended_at.is_(None)
        )
    ).first()
    
    if not impersonation:
        raise HTTPException(status_code=400, detail="No active impersonation found")
    
    impersonation.ended_at = datetime.now(timezone.utc)
    db.commit()
    
    # Create new token for super admin
    from auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
    from datetime import timedelta
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": current_user.email,
            "user_type": current_user.user_type.value
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Impersonation ended"
    }

@router.post("/impersonate/{user_id}")
async def start_impersonation(
    user_id: int,
    request_data: ImpersonationRequest = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Start impersonating a user"""
    reason = request_data.reason if request_data else None
    # Get user to impersonate
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not target_user.is_active:
        raise HTTPException(status_code=400, detail="Cannot impersonate inactive user")
    
    if target_user.user_type not in [UserType.LAB_ADMINISTRATOR, UserType.LAB_MANAGER]:
        raise HTTPException(status_code=400, detail="Can only impersonate Lab Administrators or Lab Managers")
    
    # Check if there's an active impersonation
    active_impersonation = db.query(UserImpersonation).filter(
        and_(
            UserImpersonation.super_admin_id == current_user.id,
            UserImpersonation.ended_at.is_(None)
        )
    ).first()
    
    if active_impersonation:
        raise HTTPException(status_code=400, detail="You are already impersonating a user. End current impersonation first.")
    
    # Create impersonation record
    impersonation = UserImpersonation(
        super_admin_id=current_user.id,
        impersonated_user_id=user_id,
        reason=reason
    )
    db.add(impersonation)
    db.commit()
    db.refresh(impersonation)
    
    # Create access token for impersonated user
    from auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
    from datetime import timedelta
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": current_user.email,  # Super admin email
            "user_type": current_user.user_type.value,
            "impersonated_user_id": user_id,  # User being impersonated
            "impersonation_id": impersonation.id
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "impersonated_user": {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "user_type": target_user.user_type.value
        },
        "impersonation_id": impersonation.id
    }

@router.get("/impersonate/status")
async def get_impersonation_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get current impersonation status"""
    impersonation = db.query(UserImpersonation).filter(
        and_(
            UserImpersonation.super_admin_id == current_user.id,
            UserImpersonation.ended_at.is_(None)
        )
    ).first()
    
    if not impersonation:
        return {"is_impersonating": False}
    
    impersonated_user = db.query(User).filter(User.id == impersonation.impersonated_user_id).first()
    
    return {
        "is_impersonating": True,
        "impersonation_id": impersonation.id,
        "impersonated_user": {
            "id": impersonated_user.id,
            "email": impersonated_user.email,
            "full_name": impersonated_user.full_name,
            "user_type": impersonated_user.user_type.value
        },
        "started_at": impersonation.started_at.isoformat() if impersonation.started_at else None,
        "reason": impersonation.reason
    }

@router.get("/impersonate/history")
async def get_impersonation_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get impersonation history"""
    impersonations = db.query(UserImpersonation).filter(
        UserImpersonation.super_admin_id == current_user.id
    ).order_by(UserImpersonation.started_at.desc()).offset(skip).limit(limit).all()
    
    total = db.query(UserImpersonation).filter(
        UserImpersonation.super_admin_id == current_user.id
    ).count()
    
    return {
        "total": total,
        "items": [
            {
                "id": imp.id,
                "impersonated_user": {
                    "id": imp.impersonated_user.id,
                    "email": imp.impersonated_user.email,
                    "full_name": imp.impersonated_user.full_name
                },
                "started_at": imp.started_at.isoformat() if imp.started_at else None,
                "ended_at": imp.ended_at.isoformat() if imp.ended_at else None,
                "reason": imp.reason,
                "duration_seconds": (
                    (imp.ended_at - imp.started_at).total_seconds() 
                    if imp.ended_at and imp.started_at else None
                )
            }
            for imp in impersonations
        ]
    }

