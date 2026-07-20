from abc import ABC, abstractmethod
from typing import List, Dict, Any


class IAnalyticsRepository(ABC):
    """
    Abstract interface for EcoTrack analytical metrics and leaderboard rankings.
    """

    @abstractmethod
    async def get_points_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_streaks_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_system_overview_stats(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_waste_classification_stats(self) -> Dict[str, Any]:
        pass
