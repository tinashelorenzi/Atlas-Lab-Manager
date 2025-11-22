#!/usr/bin/env python3
"""
Script to create a Super Administrator user.
This is the only way to create Super Administrator users.
"""

import sys
import os
from getpass import getpass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models.user import User, UserType
from auth import get_password_hash

def create_super_administrator():
    """Create a Super Administrator user"""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        print("=== Create Super Administrator User ===\n")
        
        # Get user details
        email = input("Email: ").strip()
        if not email:
            print("Error: Email is required")
            return
        
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"Error: User with email {email} already exists")
            return
        
        full_name = input("Full Name: ").strip()
        if not full_name:
            print("Error: Full name is required")
            return
        
        password = getpass("Password: ")
        if not password:
            print("Error: Password is required")
            return
        
        password_confirm = getpass("Confirm Password: ")
        if password != password_confirm:
            print("Error: Passwords do not match")
            return
        
        # Create user
        hashed_password = get_password_hash(password)
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            user_type=UserType.SUPER_ADMINISTRATOR,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"\n✓ Super Administrator user created successfully!")
        print(f"  Email: {new_user.email}")
        print(f"  Full Name: {new_user.full_name}")
        print(f"  User Type: {new_user.user_type.value}")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating user: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    create_super_administrator()

