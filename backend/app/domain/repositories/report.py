from abc import ABC, abstractmethod
import uuid
from typing import List, Optional
from app.domain.entities.report import BinReport, WasteReport, PickupSchedule


class IReportRepository(ABC):
    """
    Abstract interface for managing BinReports and WasteReports.
    Keeps application logic decouple from the chosen database layer.
    """

    @abstractmethod
    async def create_bin_report(self, report: BinReport) -> BinReport:
        pass

    @abstractmethod
    async def get_bin_report_by_id(self, report_id: uuid.UUID) -> Optional[BinReport]:
        pass

    @abstractmethod
    async def list_active_bin_reports(self, skip: int = 0, limit: int = 100) -> List[BinReport]:
        pass

    @abstractmethod
    async def list_bin_reports_by_user(self, user_id: uuid.UUID) -> List[BinReport]:
        pass

    @abstractmethod
    async def update_bin_report(self, report: BinReport) -> BinReport:
        pass

    @abstractmethod
    async def create_waste_report(self, report: WasteReport) -> WasteReport:
        pass

    @abstractmethod
    async def list_waste_reports_by_user(self, user_id: uuid.UUID, limit: int = 50) -> List[WasteReport]:
        pass


class IPickupScheduleRepository(ABC):
    """
    Abstract interface for managing municipal trash collection routines.
    """

    @abstractmethod
    async def create_schedule(self, schedule: PickupSchedule) -> PickupSchedule:
        pass

    @abstractmethod
    async def get_schedule_by_id(self, schedule_id: uuid.UUID) -> Optional[PickupSchedule]:
        pass

    @abstractmethod
    async def get_schedules_by_area(self, area_name: str, city: str) -> List[PickupSchedule]:
        pass

    @abstractmethod
    async def list_all_schedules(self, skip: int = 0, limit: int = 100) -> List[PickupSchedule]:
        pass

    @abstractmethod
    async def update_schedule(self, schedule: PickupSchedule) -> PickupSchedule:
        pass
