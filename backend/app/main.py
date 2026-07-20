from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.logging import configure_logging, CorrelationIdMiddleware
from app.api.v1.router import api_v1_router
from app.database.seed import init_and_seed_db

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Sequence
    configure_logging()
    await logger.ainfo("EcoTrack FastAPI service starting up...", config=settings.model_dump(exclude={"JWT_SECRET_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "CLAUDE_API_KEY"}))
    
    # Automatically initialize schemas and seed mock data
    try:
        await init_and_seed_db()
    except Exception as e:
        await logger.aerror("Database startup initialization failed", error=str(e))

    yield
    # Shutdown Sequence
    await logger.ainfo("EcoTrack FastAPI service shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
    lifespan=lifespan,
)

# Apply CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apply custom correlation ID tracing middleware
app.add_middleware(CorrelationIdMiddleware)

# Include the main versioned API router aggregator
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


# Exception handler for internal errors to maintain standard API responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    await logger.aexception("Unhandled system exception caught", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error occurred",
            "message": str(exc) if settings.ENV != "production" else "Please contact administrative support."
        }
    )


# Standard cloud liveness/readiness health probes
@app.get("/health/liveness", status_code=status.HTTP_200_OK, tags=["Health"])
async def liveness_probe():
    """Confirms the container is alive."""
    return {"status": "ok", "service": "ecotrack-api"}


@app.get("/health/readiness", status_code=status.HTTP_200_OK, tags=["Health"])
async def readiness_probe():
    """Confirms the system can reach essential downstream resources (e.g. database)."""
    # Placeholder for active checks in subsequent phases (DB, Redis)
    return {
        "status": "ready",
        "database": "active",
        "cache": "active"
    }


@app.get("/", tags=["Root"])
async def root_endpoint():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} Enterprise API Platform",
        "version": "1.0.0",
        "documentation": "/docs" if settings.ENV != "production" else "disabled"
    }
