import random
import string
from sqlalchemy.orm import Session
from models.customer import Customer

def generate_customer_id(db: Session) -> str:
    """Generate a unique 5-character customer ID"""
    while True:
        # Generate a 5-character alphanumeric ID (uppercase letters and numbers)
        customer_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Check if it already exists
        existing = db.query(Customer).filter(Customer.customer_id == customer_id).first()
        if not existing:
            return customer_id

