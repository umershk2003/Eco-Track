from typing import List
from fastapi import APIRouter, Depends
import structlog

from app.api.deps import get_analytics_service, get_current_user
from app.application.schemas.analytics import (
    PointsLeaderboardEntry,
    StreaksLeaderboardEntry,
    SystemOverviewStatsResponse,
    WasteClassificationStatsResponse,
)
from app.application.services.analytics import AnalyticsService
from app.domain.entities.user import User

logger = structlog.get_logger()

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/leaderboard/points", response_model=List[PointsLeaderboardEntry])
async def get_points_leaderboard(
    limit: int = 10,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user) # Requires being logged in
):
    """
    Retrieves the system-wide leaderboard of citizens ranked by their Eco-Points.
    """
    return await analytics_service.get_points_leaderboard(limit=limit)


@router.get("/leaderboard/streaks", response_model=List[StreaksLeaderboardEntry])
async def get_streaks_leaderboard(
    limit: int = 10,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user) # Requires being logged in
):
    """
    Retrieves the system-wide leaderboard of citizens ranked by their current sorter streak count.
    """
    return await analytics_service.get_streaks_leaderboard(limit=limit)


@router.get("/overview", response_model=SystemOverviewStatsResponse)
async def get_system_overview(
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches aggregate metrics for general civic reports (total reported/solved issues, registered users, eco-points).
    """
    return await analytics_service.get_system_overview()


@router.get("/waste-classification", response_model=WasteClassificationStatsResponse)
async def get_waste_classification_stats(
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches AI classification aggregates (total processed items, counts per category/color, accuracy confidence).
    """
    return await analytics_service.get_ai_waste_stats()
