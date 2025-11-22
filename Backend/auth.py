from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Password hashing with Argon2
# Argon2id is the recommended variant (default)
# time_cost: number of iterations (2 = recommended minimum)
# memory_cost: memory in KB (65536 = 64 MB, recommended minimum)
# parallelism: number of parallel threads (1 = single-threaded)
ph = PasswordHasher(
    time_cost=2,          # 2 iterations
    memory_cost=65536,    # 64 MB
    parallelism=1,       # Single-threaded
    hash_len=32,         # 32 bytes hash length
    salt_len=16          # 16 bytes salt length
)

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2 hash"""
    if not hashed_password or not plain_password:
        return False
    
    # Check if it's an Argon2 hash (starts with $argon2)
    if not hashed_password.startswith('$argon2'):
        # This might be an old bcrypt hash or invalid hash
        return False
    
    try:
        ph.verify(hashed_password, plain_password)
        # Check if hash needs rehashing (if parameters changed)
        if ph.check_needs_rehash(hashed_password):
            # Optionally rehash with new parameters
            pass
        return True
    except VerifyMismatchError:
        return False
    except Exception as e:
        # Log the error for debugging but don't expose it
        print(f"Password verification error: {type(e).__name__}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using Argon2"""
    # Argon2 has no password length limit like bcrypt's 72 bytes
    return ph.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

