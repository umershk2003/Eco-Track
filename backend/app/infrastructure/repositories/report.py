import uuid
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.domain.entities.report import BinReport, WasteReport, PickupSchedule
from app.domain.repositories.report import IReportRepository, IPickupScheduleRepository

logger = structlog.get_logger()


class SqlAlchemyReportRepository(IReportRepository):
    """
    SQLAlchemy implementation for managing Bin and AI Waste reports.
    """

    def __init__(self, db_session: AsyncSession) -> None:
        self.session = db_session

    async def create_bin_report(self, report: BinReport) -> BinReport:
        self.session.add(report)
        await self.session.flush()
        return report

    async def get_bin_report_by_id(self, report_id: uuid.UUID) -> Optional[BinReport]:
        stmt = select(BinReport).where(BinReport.id == report_id, BinReport.is_deleted == False)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active_bin_reports(self, skip: int = 0, limit: int = 100) -> List[BinReport]:
        stmt = (
            select(BinReport)
            .where(BinReport.is_deleted == False)
            .order_by(desc(BinReport.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_bin_reports_by_user(self, user_id: uuid.UUID) -> List[BinReport]:
        stmt = (
            select(BinReport)
            .where(BinReport.user_id == user_id, BinReport.is_deleted == False)
            .order_by(desc(BinReport.created_at))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_bin_report(self, report: BinReport) -> BinReport:
        await self.session.flush()
        return report

    async def create_waste_report(self, report: WasteReport) -> WasteReport:
        self.session.add(report)
        await self.session.flush()
        return report

    async def list_waste_reports_by_user(self, user_id: uuid.UUID, limit: int = 50) -> List[WasteReport]:
        stmt = (
            select(WasteReport)
            .where(WasteReport.user_id == user_id)
            .order_by(desc(WasteReport.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class SqlAlchemyPickupScheduleRepository(IPickupScheduleRepository):
    """
    SQLAlchemy implementation for pickup schedules management.
    """

    def __init__(self, db_session: AsyncSession) -> None:
        self.session = db_session

    async def create_schedule(self, schedule: PickupSchedule) -> PickupSchedule:
        self.session.add(schedule)
        await self.session.flush()
        return schedule

    async def get_schedule_by_id(self, schedule_id: uuid.UUID) -> Optional[PickupSchedule]:
        stmt = select(PickupSchedule).where(PickupSchedule.id == schedule_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_schedules_by_area(self, area_name: str, city: str) -> List[PickupSchedule]:
        stmt = select(PickupSchedule).where(
            PickupSchedule.area_name.ilike(f"%{area_name}%"),
            PickupSchedule.city.ilike(f"%{city}%"),
            PickupSchedule.is_active == True
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_all_schedules(self, skip: int = 0, limit: int = 100) -> List[PickupSchedule]:
        stmt = select(PickupSchedule).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_schedule(self, schedule: PickupSchedule) -> PickupSchedule:
        await self.session.flush()
        return schedule
