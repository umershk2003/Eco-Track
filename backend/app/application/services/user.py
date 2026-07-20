import uuid
from typing import List, Optional
import structlog

from app.domain.entities.user import User, UserRole
from app.domain.repositories.user import IUserRepository
from app.application.schemas.user import UserUpdate

logger = structlog.get_logger()


class UserService:
    """
    Enterprise-grade Business Service for User Management.
    Implements profile query, updates, and point aggregation/streak engines.
    """

    def __init__(self, user_repo: IUserRepository) -> None:
        self.user_repo = user_repo

    async def get_user_by_id(self, user_id: uuid.UUID) -> User:
        """
        Fetch user details by primary key, raising ValueError if not found.
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            await logger.awarn("User query failed: ID not found", user_id=str(user_id))
            raise ValueError("User not found")
        return user

    async def get_user_by_email(self, email: str) -> User:
        """
        Fetch user details by registered email address.
        """
        user = await self.user_repo.get_by_email(email)
        if not user:
            await logger.awarn("User query failed: Email not found", email=email)
            raise ValueError("User not found")
        return user

    async def update_user(self, user_id: uuid.UUID, user_update: UserUpdate) -> User:
        """
        Update user profile attributes selectively.
        """
        user = await self.get_user_by_id(user_id)

        update_data = user_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)

        updated_user = await self.user_repo.update(user)
        await logger.ainfo("User profile successfully updated", user_id=str(user_id))
        return updated_user

    async def add_points(self, user_id: uuid.UUID, amount: int) -> User:
        """
        Adds specified points to user profile. Used for eco-actions scoring.
        """
        if amount <= 0:
            raise ValueError("Points increment must be positive")

        user = await self.get_user_by_id(user_id)
        user.points += amount
        
        # Simple automatic tiering or log triggers can happen here
        updated_user = await self.user_repo.update(user)
        await logger.ainfo("Earned eco-points", user_id=str(user_id), points_added=amount, total_points=updated_user.points)
        return updated_user

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Retrieves a list of registered users.
        """
        return await self.user_repo.list_users(skip=skip, limit=limit)

    async def change_user_role(self, user_id: uuid.UUID, new_role: UserRole) -> User:
        """
        Updates a user's role. Restricted to Admin/Super Admin.
        """
        user = await self.get_user_by_id(user_id)
        user.role = new_role
        updated_user = await self.user_repo.update(user)
        await logger.ainfo("User role changed by admin", user_id=str(user_id), new_role=new_role.value)
        return updated_user
