from typing import List, Dict, Any
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.domain.entities.user import User
from app.domain.entities.report import BinReport, WasteReport
from app.domain.repositories.analytics import IAnalyticsRepository

logger = structlog.get_logger()


class SqlAlchemyAnalyticsRepository(IAnalyticsRepository):
    """
    Concrete SQLAlchemy implementation for calculating real-time aggregates and rankings.
    """

    def __init__(self, db_session: AsyncSession) -> None:
        self.session = db_session

    async def get_points_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        stmt = (
            select(User.id, User.display_name, User.points, User.city)
            .where(User.is_deleted == False)
            .order_by(desc(User.points))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        leaderboard = []
        rank = 1
        for row in result.all():
            leaderboard.append({
                "rank": rank,
                "user_id": row.id,
                "display_name": row.display_name or "EcoCitizen",
                "points": row.points,
                "city": row.city
            })
            rank += 1
        return leaderboard

    async def get_streaks_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        stmt = (
            select(User.id, User.display_name, User.streak_count, User.city)
            .where(User.is_deleted == False)
            .order_by(desc(User.streak_count))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        leaderboard = []
        rank = 1
        for row in result.all():
            leaderboard.append({
                "rank": rank,
                "user_id": row.id,
                "display_name": row.display_name or "EcoCitizen",
                "streak_count": row.streak_count,
                "city": row.city
            })
            rank += 1
        return leaderboard

    async def get_system_overview_stats(self) -> Dict[str, Any]:
        # Aggregate total users
        user_count_stmt = select(func.count(User.id)).where(User.is_deleted == False)
        user_count_res = await self.session.execute(user_count_stmt)
        total_users = user_count_res.scalar() or 0

        # Aggregate total bin reports
        reports_count_stmt = select(func.count(BinReport.id)).where(BinReport.is_deleted == False)
        reports_count_res = await self.session.execute(reports_count_stmt)
        total_reports = reports_count_res.scalar() or 0

        # Aggregate reports by status
        status_stmt = (
            select(BinReport.status, func.count(BinReport.id))
            .where(BinReport.is_deleted == False)
            .group_by(BinReport.status)
        )
        status_res = await self.session.execute(status_stmt)
        reports_by_status = {row[0].value: row[1] for row in status_res.all()}

        # Total points awarded system-wide
        total_points_stmt = select(func.sum(User.points)).where(User.is_deleted == False)
        total_points_res = await self.session.execute(total_points_stmt)
        total_points_awarded = total_points_res.scalar() or 0

        return {
            "total_registered_users": total_users,
            "total_community_reports": total_reports,
            "reports_by_status": reports_by_status,
            "total_points_awarded": int(total_points_awarded)
        }

    async def get_waste_classification_stats(self) -> Dict[str, Any]:
        # Aggregate total scans
        scans_stmt = select(func.count(WasteReport.id))
        scans_res = await self.session.execute(scans_stmt)
        total_scans = scans_res.scalar() or 0

        # Aggregate scans by category
        category_stmt = (
            select(WasteReport.category, func.count(WasteReport.id))
            .group_by(WasteReport.category)
            .order_by(desc(func.count(WasteReport.id)))
        )
        category_res = await self.session.execute(category_stmt)
        scans_by_category = {row[0]: row[1] for row in category_res.all()}

        # Aggregate scans by bin color recommendation
        color_stmt = (
            select(WasteReport.bin_color, func.count(WasteReport.id))
            .group_by(WasteReport.bin_color)
        )
        color_res = await self.session.execute(color_stmt)
        scans_by_color = {row[0]: row[1] for row in color_res.all()}

        # Calculate average AI confidence
        confidence_stmt = select(func.avg(WasteReport.confidence))
        confidence_res = await self.session.execute(confidence_stmt)
        avg_confidence = float(confidence_res.scalar() or 0.0)

        return {
            "total_scanned_items": total_scans,
            "scans_by_category": scans_by_category,
            "scans_by_bin_color": scans_by_color,
            "average_ai_confidence": round(avg_confidence, 4)
        }
