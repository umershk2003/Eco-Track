from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.ai.routers import classify
from app.database.database import engine, Base
import os

# Auto-create all tables on startup (SQLite, no migrations needed)
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs("uploads", exist_ok=True)
    yield

app = FastAPI(
    title="EcoTrack Backend AI Prototype",
    description="Backend-only AI-powered Smart Waste Management Platform prototype.",
    version="2.0.0",
    lifespan=lifespan
)

# Register routers
app.include_router(classify.router, prefix="/api/v1/ai", tags=["AI Classification"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "message": "EcoTrack AI Backend is running"}
