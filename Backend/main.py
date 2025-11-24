from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import auth_router, users_router
from routes.customers import router as customers_router
from routes.projects import router as projects_router
from routes.departments import router as departments_router
from routes.sample_types import router as sample_types_router
from routes.samples import router as samples_router
from routes.result_entries import router as result_entries_router
from routes.reports import router as reports_router
from routes.settings import router as settings_router
from routes.organization import router as organization_router
from routes.email_templates import router as email_templates_router
from routes.analytics import router as analytics_router
from middleware.logging_middleware import LoggingMiddleware

app = FastAPI(
    title="Atlas Lab Manager API",
    description="Laboratory Management System API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware (must be after CORS)
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(customers_router)
app.include_router(projects_router)
app.include_router(departments_router)
app.include_router(sample_types_router)
app.include_router(samples_router)
app.include_router(result_entries_router)
app.include_router(reports_router)
app.include_router(settings_router)
app.include_router(organization_router)
app.include_router(email_templates_router)
app.include_router(analytics_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "Atlas Lab Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

