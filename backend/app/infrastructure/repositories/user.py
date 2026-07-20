import uuid
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.domain.entities.user import User, RefreshToken
from app.domain.repositories.user import IUserRepository, IRefreshTokenRepository

logger = structlog.get_logger()


class SqlAlchemyUserRepository(IUserRepository):
    """
    Concrete implementation of IUserRepository using SQLAlchemy 2.0 Async engine.
    """

    def __init__(self, db_session: AsyncSession) -> None:
        self.session = db_session

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        stmt = select(User).where(User.id == user_id, User.is_deleted == False)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email, User.is_deleted == False)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()  # Populates user.id and timestamps
        return user

    async def update(self, user: User) -> User:
        await self.session.flush()
        return user

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        stmt = select(User).where(User.is_deleted == False).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class SqlAlchemyRefreshTokenRepository(IRefreshTokenRepository):
    """
    Concrete implementation of IRefreshTokenRepository using SQLAlchemy 2.0 Async engine.
    """

    def __init__(self, db_session: AsyncSession) -> None:
        self.session = db_session

    async def create(self, refresh_token: RefreshToken) -> RefreshToken:
        self.session.add(refresh_token)
        await self.session.flush()
        return refresh_token

    async def get_by_token(self, token: str) -> Optional[RefreshToken]:
        stmt = select(RefreshToken).where(RefreshToken.token == token, RefreshToken.is_revoked == False)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_active_tokens(self, user_id: uuid.UUID) -> None:
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
            .values(is_revoked=True)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def get_active_by_user(self, user_id: uuid.UUID) -> List[RefreshToken]:
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.is_revoked == False
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
