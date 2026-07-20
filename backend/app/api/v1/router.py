from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.users.router import router as users_router
from app.api.v1.reports.router import router as reports_router
from app.api.v1.schedules.router import router as schedules_router
from app.api.v1.analytics.router import router as analytics_router

api_v1_router = APIRouter()

# Include feature sub-modules for the EcoTrack API v1
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(schedules_router)
api_v1_router.include_router(analytics_router)
