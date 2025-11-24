import time
from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from database import SessionLocal
from models.request_log import RequestLog, HTTPMethod
import traceback

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get user info if authenticated (will be set by auth dependency)
        user_id = None
        # Try to get user from token if available
        try:
            from fastapi.security import OAuth2PasswordBearer
            from routes.auth import get_current_user
            from database import SessionLocal
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                db = SessionLocal()
                try:
                    from routes.auth import decode_access_token
                    from models.user import User
                    payload = decode_access_token(token)
                    if payload:
                        email = payload.get("sub")
                        if email:
                            user = db.query(User).filter(User.email == email).first()
                            if user:
                                user_id = user.id
                except Exception:
                    pass
                finally:
                    db.close()
        except Exception:
            pass
        
        # Get IP address
        ip_address = request.client.host if request.client else None
        if "x-forwarded-for" in request.headers:
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
        
        # Get user agent
        user_agent = request.headers.get("user-agent", None)
        
        # Process request
        error_message = None
        status_code = 200
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            error_message = str(e)
            traceback_str = traceback.format_exc()
            # Log full traceback for 500 errors
            if len(traceback_str) > 1000:
                error_message = traceback_str[:1000] + "..."
            else:
                error_message = traceback_str
            raise
        finally:
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log the request (skip health checks and static files)
            path = request.url.path
            if not path.startswith("/health") and not path.startswith("/uploads") and not path.startswith("/docs") and not path.startswith("/openapi.json"):
                try:
                    db: Session = SessionLocal()
                    try:
                        # Map HTTP method
                        method_str = request.method.upper()
                        try:
                            method = HTTPMethod(method_str)
                        except ValueError:
                            method = HTTPMethod.GET  # Default fallback
                        
                        log_entry = RequestLog(
                            user_id=user_id,
                            method=method,
                            path=path,
                            status_code=status_code,
                            ip_address=ip_address,
                            user_agent=user_agent,
                            response_time_ms=response_time_ms,
                            error_message=error_message if status_code >= 500 else None
                        )
                        db.add(log_entry)
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        # Don't fail the request if logging fails
                        print(f"Failed to log request: {e}")
                    finally:
                        db.close()
                except Exception as e:
                    # Don't fail the request if logging fails
                    print(f"Failed to create database session for logging: {e}")
        
        return response

