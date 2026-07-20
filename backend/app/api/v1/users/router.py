import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.api.deps import get_user_service, get_current_user, RoleChecker
from app.application.schemas.user import UserUpdate, UserResponse
from app.application.services.user import UserService
from app.domain.entities.user import User, UserRole
from app.database.session import get_db

logger = structlog.get_logger()

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the currently authenticated user profile.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    profile_update: UserUpdate,
    user_service: UserService = Depends(get_user_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates the authenticated user's profile details.
    """
    try:
        updated = await user_service.update_user(current_user.id, profile_update)
        await db.commit()
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/list",
    response_model=List[UserResponse],
    dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN]))]
)
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    user_service: UserService = Depends(get_user_service)
):
    """
    Admin-only endpoint to list registered EcoTrack users.
    """
    return await user_service.list_users(skip=skip, limit=limit)


@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
    dependencies=[Depends(RoleChecker([UserRole.SUPER_ADMIN]))]
)
async def change_role(
    user_id: uuid.UUID,
    new_role: UserRole,
    user_service: UserService = Depends(get_user_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin-only endpoint to update a user's access level.
    """
    try:
        updated = await user_service.change_user_role(user_id, new_role)
        await db.commit()
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
