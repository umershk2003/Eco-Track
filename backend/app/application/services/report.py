import uuid
from typing import List, Optional
import structlog

from app.domain.entities.report import BinReport, WasteReport, PickupSchedule, ReportStatus
from app.domain.repositories.report import IReportRepository, IPickupScheduleRepository
from app.application.schemas.report import BinReportCreate, BinReportUpdate, WasteReportCreate, PickupScheduleCreate, PickupScheduleUpdate

logger = structlog.get_logger()


class ReportService:
    """
    Business Service coordinating Citizen Bin Reporting and Sorter Logs workflows.
    """

    def __init__(self, report_repo: IReportRepository) -> None:
        self.report_repo = report_repo

    async def report_bin(self, user_id: uuid.UUID, report_in: BinReportCreate) -> BinReport:
        """
        Submits an overflowing or damaged bin report.
        """
        report = BinReport(
            user_id=user_id,
            image_url=report_in.image_url,
            latitude=report_in.latitude,
            longitude=report_in.longitude,
            address=report_in.address,
            severity=report_in.severity,
            status=ReportStatus.REPORTED,
            upvotes=0
        )
        created_report = await self.report_repo.create_bin_report(report)
        await logger.ainfo("Bin reported successfully", report_id=str(created_report.id), user_id=str(user_id))
        return created_report

    async def get_bin_report(self, report_id: uuid.UUID) -> BinReport:
        """
        Fetch details of a single bin report.
        """
        report = await self.report_repo.get_bin_report_by_id(report_id)
        if not report:
            await logger.awarn("Bin report not found", report_id=str(report_id))
            raise ValueError("Bin report not found")
        return report

    async def list_active_reports(self, skip: int = 0, limit: int = 100) -> List[BinReport]:
        """
        Retrieve all active bin reports.
        """
        return await self.report_repo.list_active_bin_reports(skip=skip, limit=limit)

    async def list_user_reports(self, user_id: uuid.UUID) -> List[BinReport]:
        """
        Retrieve bin reports authored by a specific user.
        """
        return await self.report_repo.list_bin_reports_by_user(user_id)

    async def upvote_report(self, report_id: uuid.UUID) -> BinReport:
        """
        Increment the community support/upvote score of a bin report.
        """
        report = await self.get_bin_report(report_id)
        report.upvotes += 1
        updated = await self.report_repo.update_bin_report(report)
        await logger.ainfo("Bin report upvoted", report_id=str(report_id), upvotes=updated.upvotes)
        return updated

    async def update_report_status(self, report_id: uuid.UUID, report_update: BinReportUpdate) -> BinReport:
        """
        Updates report properties (status, severity, or address details).
        Useful for municipal workers or drivers.
        """
        report = await self.get_bin_report(report_id)

        update_data = report_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(report, key, value)

        updated = await self.report_repo.update_bin_report(report)
        await logger.ainfo("Bin report status updated", report_id=str(report_id), new_status=updated.status.value)
        return updated

    async def log_waste_classification(self, user_id: uuid.UUID, waste_in: WasteReportCreate) -> WasteReport:
        """
        Logs an AI-powered waste classification report.
        """
        report = WasteReport(
            user_id=user_id,
            image_url=waste_in.image_url,
            category=waste_in.category,
            bin_color=waste_in.bin_color,
            confidence=waste_in.confidence,
            explanation=waste_in.explanation
        )
        created = await self.report_repo.create_waste_report(report)
        await logger.ainfo("Waste classification logged", report_id=str(created.id), category=created.category)
        return created

    async def list_user_waste_logs(self, user_id: uuid.UUID, limit: int = 50) -> List[WasteReport]:
        """
        Retrieve waste sorter history for a user.
        """
        return await self.report_repo.list_waste_reports_by_user(user_id, limit=limit)


class PickupScheduleService:
    """
    Business Service coordinating garbage pickup routing and schedule tables.
    """

    def __init__(self, schedule_repo: IPickupScheduleRepository) -> None:
        self.schedule_repo = schedule_repo

    async def create_schedule(self, schedule_in: PickupScheduleCreate) -> PickupSchedule:
        """
        Create a new trash collection entry schedule.
        """
        schedule = PickupSchedule(
            area_name=schedule_in.area_name,
            city=schedule_in.city,
            collector_name=schedule_in.collector_name,
            time_slot=schedule_in.time_slot,
            frequency=schedule_in.frequency,
            is_active=True
        )
        created = await self.schedule_repo.create_schedule(schedule)
        await logger.ainfo("Pickup schedule registered", schedule_id=str(created.id), area=created.area_name)
        return created

    async def get_schedule(self, schedule_id: uuid.UUID) -> PickupSchedule:
        """
        Fetch details of a single pickup schedule.
        """
        schedule = await self.schedule_repo.get_schedule_by_id(schedule_id)
        if not schedule:
            raise ValueError("Pickup schedule not found")
        return schedule

    async def list_all_schedules(self, skip: int = 0, limit: int = 100) -> List[PickupSchedule]:
        """
        Retrieve all municipal pickup routines.
        """
        return await self.schedule_repo.list_all_schedules(skip=skip, limit=limit)

    async def find_schedules_by_area(self, area_name: str, city: str = "Hyderabad") -> List[PickupSchedule]:
        """
        Search for schedules near a specific citizen's area name.
        """
        return await self.schedule_repo.get_schedules_by_area(area_name, city)

    async def update_schedule(self, schedule_id: uuid.UUID, update_in: PickupScheduleUpdate) -> PickupSchedule:
        """
        Selectively modifies a pickup schedule (e.g. changing active status or timeslot).
        """
        schedule = await self.get_schedule(schedule_id)

        update_data = update_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(schedule, key, value)

        updated = await self.schedule_repo.update_schedule(schedule)
        await logger.ainfo("Pickup schedule updated", schedule_id=str(schedule_id))
        return updated
