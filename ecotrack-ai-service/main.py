from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.detection_routes import router as detection_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="EcoTrack AI Service")

# Configure CORS for the Express Backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the Express backend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection_router, prefix="/api/ai", tags=["ai"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

