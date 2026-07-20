from abc import ABC, abstractmethod
import uuid
from typing import List, Optional
from app.domain.entities.user import User, RefreshToken


class IUserRepository(ABC):
    """
    Abstract interface for User repository operations.
    Enforces architectural decoupling from specific ORM/Database details.
    """

    @abstractmethod
    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def create(self, user: User) -> User:
        pass

    @abstractmethod
    async def update(self, user: User) -> User:
        pass

    @abstractmethod
    async def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        pass


class IRefreshTokenRepository(ABC):
    """
    Abstract interface for RefreshToken repository operations.
    """

    @abstractmethod
    async def create(self, refresh_token: RefreshToken) -> RefreshToken:
        pass

    @abstractmethod
    async def get_by_token(self, token: str) -> Optional[RefreshToken]:
        pass

    @abstractmethod
    async def revoke_active_tokens(self, user_id: uuid.UUID) -> None:
        pass

    @abstractmethod
    async def get_active_by_user(self, user_id: uuid.UUID) -> List[RefreshToken]:
        pass
