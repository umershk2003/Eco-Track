import uuid
from typing import List, Dict
from pydantic import BaseModel, Field


class PointsLeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    display_name: str
    points: int
    city: str


class StreaksLeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    display_name: str
    streak_count: int
    city: str


class SystemOverviewStatsResponse(BaseModel):
    total_registered_users: int
    total_community_reports: int
    reports_by_status: Dict[str, int] = Field(default_factory=dict)
    total_points_awarded: int


class WasteClassificationStatsResponse(BaseModel):
    total_scanned_items: int
    scans_by_category: Dict[str, int] = Field(default_factory=dict)
    scans_by_bin_color: Dict[str, int] = Field(default_factory=dict)
    average_ai_confidence: float
