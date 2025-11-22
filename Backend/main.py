from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import auth_router, users_router
from routes.customers import router as customers_router
from routes.settings import router as settings_router
from routes.organization import router as organization_router
from routes.email_templates import router as email_templates_router

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

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(customers_router)
app.include_router(settings_router)
app.include_router(organization_router)
app.include_router(email_templates_router)

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

