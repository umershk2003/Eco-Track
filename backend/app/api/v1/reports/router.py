import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.api.deps import get_report_service, get_current_user, RoleChecker, get_gemini_service, get_user_service
from app.application.schemas.user import UserUpdate
from app.application.schemas.report import (
    BinReportCreate,
    BinReportUpdate,
    BinReportResponse,
    WasteReportCreate,
    WasteReportResponse,
)
from app.application.services.report import ReportService
from app.application.services.user import UserService
from app.application.services.gemini import GeminiService
from pydantic import BaseModel, Field
from app.domain.entities.user import User, UserRole
from app.database.session import get_db

logger = structlog.get_logger()

router = APIRouter(prefix="/reports", tags=["Reports"])


# ==========================================
# Citizen / Public Endpoints
# ==========================================
@router.post("", response_model=BinReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_bin_report(
    report_in: BinReportCreate,
    report_service: ReportService = Depends(get_report_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows citizens to submit reports regarding overflowing or damaged waste bins.
    """
    try:
        report = await report_service.report_bin(current_user.id, report_in)
        await db.commit()
        return report
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit bin report: {str(e)}"
        )


@router.get("/active", response_model=List[BinReportResponse])
async def list_active_reports(
    skip: int = 0,
    limit: int = 100,
    report_service: ReportService = Depends(get_report_service)
):
    """
    Retrieves all active community reports for the municipal area map.
    """
    return await report_service.list_active_reports(skip=skip, limit=limit)


@router.get("/me", response_model=List[BinReportResponse])
async def list_my_reports(
    report_service: ReportService = Depends(get_report_service),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all reports filed by the authenticated user.
    """
    return await report_service.list_user_reports(current_user.id)


@router.post("/{report_id}/upvote", response_model=BinReportResponse)
async def upvote_bin_report(
    report_id: uuid.UUID,
    report_service: ReportService = Depends(get_report_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user) # Requires user login to vote
):
    """
    Increments the community weight score of a specific bin report.
    """
    try:
        updated = await report_service.upvote_report(report_id)
        await db.commit()
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ==========================================
# AI Waste Sorting Classification Logs
# ==========================================
class ClassifyRequest(BaseModel):
    image_url: str = Field(..., max_length=512, description="Publicly accessible URL of the waste item photo")


class ClassificationResponse(BaseModel):
    classification: WasteReportResponse
    points_awarded: int = 15
    new_user_points: int
    new_streak_count: int


@router.post("/classify", response_model=ClassificationResponse, status_code=status.HTTP_200_OK)
async def classify_waste_item(
    payload: ClassifyRequest,
    gemini_service: GeminiService = Depends(get_gemini_service),
    report_service: ReportService = Depends(get_report_service),
    user_service: UserService = Depends(get_user_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a photo URL for real-time Gemini AI Waste Classification,
    records the sorting report, and automatically awards Eco-Points and increments streaks!
    """
    try:
        # 1. Analyze the waste item with Gemini Sorter AI
        ai_result = await gemini_service.classify_waste_image(payload.image_url)

        # 2. Map classification outcome into a persistent record log
        waste_in = WasteReportCreate(
            image_url=payload.image_url,
            category=ai_result.category,
            bin_color=ai_result.bin_color,
            confidence=ai_result.confidence,
            explanation=ai_result.explanation
        )
        saved_log = await report_service.log_waste_classification(current_user.id, waste_in)

        # 3. Dynamic Gamification: Increment user's streak by 1 and award 15 points
        new_streak = current_user.streak_count + 1
        await user_service.update_user(current_user.id, UserUpdate(streak_count=new_streak))
        updated_user = await user_service.add_points(current_user.id, 15)

        # 4. Commit fully atomic transactions to PostgreSQL
        await db.commit()

        # 5. Return aggregated success details to front-end Sorter view
        return ClassificationResponse(
            classification=saved_log,
            points_awarded=15,
            new_user_points=updated_user.points,
            new_streak_count=updated_user.streak_count
        )

    except Exception as e:
        await db.rollback()
        logger.error("AI waste classification workflow failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI waste classification workflow failed: {str(e)}"
        )


@router.post("/waste-logs", response_model=WasteReportResponse, status_code=status.HTTP_201_CREATED)
async def log_waste_classification(
    waste_in: WasteReportCreate,
    report_service: ReportService = Depends(get_report_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Logs an AI classification sorter scan to database.
    """
    try:
        log_entry = await report_service.log_waste_classification(current_user.id, waste_in)
        await db.commit()
        return log_entry
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to log waste classification: {str(e)}"
        )


@router.get("/waste-logs/me", response_model=List[WasteReportResponse])
async def list_my_waste_logs(
    limit: int = 50,
    report_service: ReportService = Depends(get_report_service),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the classification scan histories logged by the authenticated user.
    """
    return await report_service.list_user_waste_logs(current_user.id, limit=limit)


# ==========================================
# Municipal Worker & Operator Updates
# ==========================================
@router.patch("/{report_id}", response_model=BinReportResponse)
async def update_report_status(
    report_id: uuid.UUID,
    report_update: BinReportUpdate,
    report_service: ReportService = Depends(get_report_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.WORKER, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Worker/Driver/Admin only. Changes reporting states (e.g. from 'reported' to 'assigned' or 'collected').
    """
    try:
        updated_report = await report_service.update_report_status(report_id, report_update)
        await db.commit()
        return updated_report
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
