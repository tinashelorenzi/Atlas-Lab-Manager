from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.project import Project
from models.customer import Customer
from models.user import User
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectWithCustomer
from routes.auth import get_current_user
from utils.project_id_generator import generate_project_id

router = APIRouter(prefix="/api/projects", tags=["projects"])

# IMPORTANT: More specific routes must come before parameterized routes

@router.get("/search", response_model=List[ProjectWithCustomer])
async def search_projects(
    q: str = Query(..., description="Search query (project ID, name, type, customer name)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enhanced search for projects with fuzzy matching"""
    import re
    from Levenshtein import distance as levenshtein_distance
    
    if not q or len(q.strip()) == 0:
        return []
    
    query = q.strip().upper()
    # Join with customers to get customer info
    all_projects = db.query(Project).join(Customer).all()
    
    # Exact matches first (highest priority)
    exact_matches = []
    # Fuzzy matches (Levenshtein distance)
    fuzzy_matches = []
    # Regex matches
    regex_matches = []
    
    # Build regex pattern for partial matching
    regex_pattern = re.compile(re.escape(query), re.IGNORECASE)
    
    for project in all_projects:
        # Check project_id (exact match for 8 chars, fuzzy for others)
        if len(query) == 8 and project.project_id == query:
            exact_matches.append((project, 0, 'project_id'))
        elif project.project_id and len(query) >= 4:
            dist = levenshtein_distance(query, project.project_id.upper())
            if dist <= 3:  # Allow up to 3 character differences
                fuzzy_matches.append((project, dist, 'project_id'))
        
        # Check name
        if project.name:
            name_upper = project.name.upper()
            if name_upper == query:
                exact_matches.append((project, 0, 'name'))
            elif query in name_upper:
                exact_matches.append((project, 0, 'name'))
            elif regex_pattern.search(name_upper):
                regex_matches.append((project, 0, 'name'))
            else:
                dist = levenshtein_distance(query, name_upper)
                if dist <= len(query) * 0.3:  # Allow 30% difference
                    fuzzy_matches.append((project, dist, 'name'))
        
        # Check project_type
        if project.project_type:
            type_upper = project.project_type.upper()
            if type_upper == query:
                exact_matches.append((project, 0, 'project_type'))
            elif query in type_upper:
                exact_matches.append((project, 0, 'project_type'))
            elif regex_pattern.search(type_upper):
                regex_matches.append((project, 0, 'project_type'))
        
        # Check customer name
        if project.customer and project.customer.full_name:
            customer_name_upper = project.customer.full_name.upper()
            if customer_name_upper == query:
                exact_matches.append((project, 0, 'customer_name'))
            elif query in customer_name_upper:
                exact_matches.append((project, 0, 'customer_name'))
            elif regex_pattern.search(customer_name_upper):
                regex_matches.append((project, 0, 'customer_name'))
    
    # Combine results: exact matches first, then regex, then fuzzy (sorted by distance)
    results = []
    seen_ids = set()
    
    # Add exact matches
    for project, _, _ in exact_matches:
        if project.id not in seen_ids:
            results.append(project)
            seen_ids.add(project.id)
    
    # Add regex matches
    for project, _, _ in regex_matches:
        if project.id not in seen_ids:
            results.append(project)
            seen_ids.add(project.id)
    
    # Add fuzzy matches (sorted by distance)
    fuzzy_matches.sort(key=lambda x: x[1])
    for project, _, _ in fuzzy_matches:
        if project.id not in seen_ids:
            results.append(project)
            seen_ids.add(project.id)
    
    # Format results with customer info
    formatted_results = []
    for project in results[:20]:  # Limit to 20 results
        formatted_results.append({
            **ProjectResponse.model_validate(project).model_dump(),
            "customer_name": project.customer.full_name,
            "customer_email": project.customer.email,
        })
    
    return formatted_results

@router.get("/", response_model=List[ProjectWithCustomer])
async def get_projects(
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all projects, optionally filtered by customer"""
    query = db.query(Project).join(Customer)
    
    if customer_id:
        query = query.filter(Project.customer_id == customer_id)
    
    projects = query.offset(skip).limit(limit).all()
    
    # Format results with customer info
    formatted_results = []
    for project in projects:
        formatted_results.append({
            **ProjectResponse.model_validate(project).model_dump(),
            "customer_name": project.customer.full_name,
            "customer_email": project.customer.email,
        })
    
    return formatted_results

@router.get("/{id}", response_model=ProjectWithCustomer)
async def get_project(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project by internal ID"""
    project = db.query(Project).filter(Project.id == id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        **ProjectResponse.model_validate(project).model_dump(),
        "customer_name": project.customer.full_name,
        "customer_email": project.customer.email,
    }

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == project.customer_id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate unique project ID
    project_id = generate_project_id(db)
    
    project_data = project.model_dump()
    project_data['project_id'] = project_id
    
    db_project = Project(**project_data)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project"""
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(db_project)
    db.commit()
    return None

