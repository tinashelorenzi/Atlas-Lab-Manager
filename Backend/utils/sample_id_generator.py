import random
import string
from sqlalchemy.orm import Session
from models.sample import Sample

def generate_sample_id(db: Session) -> str:
    """Generate a unique 10-character sample ID"""
    while True:
        # Generate a 10-character alphanumeric ID (uppercase letters and numbers)
        sample_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        
        # Check if it already exists
        existing = db.query(Sample).filter(Sample.sample_id == sample_id).first()
        if not existing:
            return sample_id

