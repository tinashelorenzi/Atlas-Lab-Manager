import random
import string
from sqlalchemy.orm import Session
from models.project import Project

def generate_project_id(db: Session) -> str:
    """Generate a unique 8-character project ID"""
    while True:
        # Generate an 8-character alphanumeric ID (uppercase letters and numbers)
        project_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Check if it already exists
        existing = db.query(Project).filter(Project.project_id == project_id).first()
        if not existing:
            return project_id

