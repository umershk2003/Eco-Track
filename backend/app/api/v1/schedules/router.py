import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.api.deps import get_pickup_schedule_service, get_current_user, RoleChecker
from app.application.schemas.report import (
    PickupScheduleCreate,
    PickupScheduleUpdate,
    PickupScheduleResponse,
)
from app.application.services.report import PickupScheduleService
from app.domain.entities.user import User, UserRole
from app.database.session import get_db

logger = structlog.get_logger()

router = APIRouter(prefix="/schedules", tags=["Schedules"])


# ==========================================
# Citizen Query Endpoints
# ==========================================
@router.get("", response_model=List[PickupScheduleResponse])
async def list_all_schedules(
    skip: int = 0,
    limit: int = 100,
    schedule_service: PickupScheduleService = Depends(get_pickup_schedule_service)
):
    """
    Lists all scheduled routes and collectors for garbage pickups.
    """
    return await schedule_service.list_all_schedules(skip=skip, limit=limit)


@router.get("/search", response_model=List[PickupScheduleResponse])
async def find_my_schedule(
    area: str,
    city: str = "Hyderabad",
    schedule_service: PickupScheduleService = Depends(get_pickup_schedule_service),
    current_user: User = Depends(get_current_user)
):
    """
    Allows logged in citizens to find pickup schedules for their exact area.
    """
    return await schedule_service.find_schedules_by_area(area_name=area, city=city)


# ==========================================
# Municipal Admin Administration
# ==========================================
@router.post("", response_model=PickupScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_pickup_schedule(
    schedule_in: PickupScheduleCreate,
    schedule_service: PickupScheduleService = Depends(get_pickup_schedule_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Admin-only. Registers a new scheduled municipal garbage pickup slot.
    """
    try:
        schedule = await schedule_service.create_schedule(schedule_in)
        await db.commit()
        return schedule
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create schedule: {str(e)}"
        )


@router.put("/{schedule_id}", response_model=PickupScheduleResponse)
async def update_pickup_schedule(
    schedule_id: uuid.UUID,
    update_in: PickupScheduleUpdate,
    schedule_service: PickupScheduleService = Depends(get_pickup_schedule_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Admin-only. Modifies attributes (active status, collector, timeslots) of a scheduled route.
    """
    try:
        updated = await schedule_service.update_schedule(schedule_id, update_in)
        await db.commit()
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
