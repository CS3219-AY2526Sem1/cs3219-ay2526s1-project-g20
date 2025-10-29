from fastapi import FastAPI
from app.api.router import api_router

# Create FastAPI application
app = FastAPI(title="M1 User Service", description="User management service for PeerPrep")

# Include API routes
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to User Service API"}
    