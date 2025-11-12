from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.db.database import create_indexes, client

# Create FastAPI application
app = FastAPI(title="M1 User Service", description="User management service for PeerPrep")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_indexes()
    print("MongoDB indexes created successfully")

    yield 

    client.close()
    print("MongoDB connection closed")

# Include API routes
app.include_router(api_router)

# Allow your frontend origin(s)
origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",  # Vite dev server
    "http://frontend:3000",
    # add production frontend URLs here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # allow frontend origins
    allow_credentials=True,
    allow_methods=["*"],        # allow all HTTP methods
    allow_headers=["*"],        # allow all headers
)

@app.get("/")
async def root():
    return {"message": "Welcome to User Service API"}
    
