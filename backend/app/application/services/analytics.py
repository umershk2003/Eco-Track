from typing import List, Dict, Any
import structlog

from app.domain.repositories.analytics import IAnalyticsRepository

logger = structlog.get_logger()


class AnalyticsService:
    """
    Business Service that coordinates community gamification rankings and system metric aggregates.
    """

    def __init__(self, analytics_repo: IAnalyticsRepository) -> None:
        self.analytics_repo = analytics_repo

    async def get_points_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves top citizens ranked by points.
        """
        await logger.adebug("Fetching points leaderboard", limit=limit)
        return await self.analytics_repo.get_points_leaderboard(limit=limit)

    async def get_streaks_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves top citizens ranked by daily streak count.
        """
        await logger.adebug("Fetching streaks leaderboard", limit=limit)
        return await self.analytics_repo.get_streaks_leaderboard(limit=limit)

    async def get_system_overview(self) -> Dict[str, Any]:
        """
        Compiles public overview aggregates (active reports, users, points, statuses).
        """
        await logger.ainfo("Compiling system overview analytics")
        return await self.analytics_repo.get_system_overview_stats()

    async def get_ai_waste_stats(self) -> Dict[str, Any]:
        """
        Compiles system classification aggregates (scans by category/color, confidence metrics).
        """
        await logger.ainfo("Compiling AI sorting classification analytics")
        return await self.analytics_repo.get_waste_classification_stats()
