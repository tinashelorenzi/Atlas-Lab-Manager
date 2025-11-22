from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.customer import Customer
from models.user import User, UserType
from schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from routes.auth import get_current_user
from utils.customer_id_generator import generate_customer_id
from services.email_service import send_customer_welcome_email

router = APIRouter(prefix="/api/customers", tags=["customers"])

# IMPORTANT: More specific routes must come before parameterized routes
# Search route must come before /{id} route

@router.get("/search", response_model=List[CustomerResponse])
async def search_customers(
    q: str = Query(..., description="Search query (customer ID, name, company, email)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enhanced search for customers with fuzzy matching"""
    import re
    from Levenshtein import distance as levenshtein_distance
    
    if not q or len(q.strip()) == 0:
        return []
    
    query = q.strip().upper()
    all_customers = db.query(Customer).all()
    
    # Exact matches first (highest priority)
    exact_matches = []
    # Fuzzy matches (Levenshtein distance)
    fuzzy_matches = []
    # Regex matches
    regex_matches = []
    
    # Build regex pattern for partial matching
    regex_pattern = re.compile(re.escape(query), re.IGNORECASE)
    
    for customer in all_customers:
        # Check customer_id (exact match for 5 chars, fuzzy for others)
        if len(query) == 5 and customer.customer_id == query:
            exact_matches.append((customer, 0, 'customer_id'))
        elif customer.customer_id and len(query) >= 3:
            dist = levenshtein_distance(query, customer.customer_id.upper())
            if dist <= 2:  # Allow up to 2 character differences
                fuzzy_matches.append((customer, dist, 'customer_id'))
        
        # Check full_name
        if customer.full_name:
            name_upper = customer.full_name.upper()
            if name_upper == query:
                exact_matches.append((customer, 0, 'full_name'))
            elif query in name_upper:
                exact_matches.append((customer, 0, 'full_name'))
            elif regex_pattern.search(name_upper):
                regex_matches.append((customer, 0, 'full_name'))
            else:
                dist = levenshtein_distance(query, name_upper)
                if dist <= len(query) * 0.3:  # Allow 30% difference
                    fuzzy_matches.append((customer, dist, 'full_name'))
        
        # Check company_name
        if customer.company_name:
            company_upper = customer.company_name.upper()
            if company_upper == query:
                exact_matches.append((customer, 0, 'company_name'))
            elif query in company_upper:
                exact_matches.append((customer, 0, 'company_name'))
            elif regex_pattern.search(company_upper):
                regex_matches.append((customer, 0, 'company_name'))
            else:
                dist = levenshtein_distance(query, company_upper)
                if dist <= len(query) * 0.3:
                    fuzzy_matches.append((customer, dist, 'company_name'))
        
        # Check email
        if customer.email:
            email_upper = customer.email.upper()
            if email_upper == query:
                exact_matches.append((customer, 0, 'email'))
            elif query in email_upper:
                exact_matches.append((customer, 0, 'email'))
            elif regex_pattern.search(email_upper):
                regex_matches.append((customer, 0, 'email'))
    
    # Combine results: exact matches first, then regex, then fuzzy (sorted by distance)
    results = []
    seen_ids = set()
    
    # Add exact matches
    for customer, _, _ in exact_matches:
        if customer.id not in seen_ids:
            results.append(customer)
            seen_ids.add(customer.id)
    
    # Add regex matches
    for customer, _, _ in regex_matches:
        if customer.id not in seen_ids:
            results.append(customer)
            seen_ids.add(customer.id)
    
    # Add fuzzy matches (sorted by distance)
    fuzzy_matches.sort(key=lambda x: x[1])
    for customer, _, _ in fuzzy_matches:
        if customer.id not in seen_ids:
            results.append(customer)
            seen_ids.add(customer.id)
    
    return results[:20]  # Limit to 20 results

@router.get("/", response_model=List[CustomerResponse])
async def get_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all customers"""
    customers = db.query(Customer).offset(skip).limit(limit).all()
    return customers

@router.get("/{id}", response_model=CustomerResponse)
async def get_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific customer by internal ID"""
    customer = db.query(Customer).filter(Customer.id == id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer: CustomerCreate,
    send_welcome_email: bool = Query(True, description="Send welcome email to customer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer"""
    # Generate unique customer ID
    customer_id = generate_customer_id(db)
    
    customer_data = customer.model_dump()
    customer_data['customer_id'] = customer_id
    
    db_customer = Customer(**customer_data)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    
    # Send welcome email if requested and email is provided
    if send_welcome_email and db_customer.email:
        email_sent = send_customer_welcome_email(
            to_email=db_customer.email,
            full_name=db_customer.full_name,
            customer_id=db_customer.customer_id,
            db=db
        )
        if not email_sent:
            print(f"Warning: Failed to send welcome email to {db_customer.email}")
    
    return db_customer

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a customer"""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a customer"""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(db_customer)
    db.commit()
    return None

