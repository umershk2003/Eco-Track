import uuid
from typing import List, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
import structlog

from app.core.config import settings
from app.core.security import decode_token
from app.database.session import get_db
from app.domain.entities.user import User, UserRole
from app.domain.repositories.user import IUserRepository, IRefreshTokenRepository
from app.domain.repositories.report import IReportRepository, IPickupScheduleRepository
from app.domain.repositories.analytics import IAnalyticsRepository
from app.infrastructure.repositories.user import SqlAlchemyUserRepository, SqlAlchemyRefreshTokenRepository
from app.infrastructure.repositories.report import SqlAlchemyReportRepository, SqlAlchemyPickupScheduleRepository
from app.infrastructure.repositories.analytics import SqlAlchemyAnalyticsRepository
from app.application.services.auth import AuthService
from app.application.services.user import UserService
from app.application.services.report import ReportService, PickupScheduleService
from app.application.services.analytics import AnalyticsService
from app.application.services.gemini import GeminiService

logger = structlog.get_logger()

# Standard security token URL (enables FastAPI automated Docs to securely authenticate and run commands)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


# ==========================================
# Repository Dependency Injections
# ==========================================
async def get_user_repository(
    db: AsyncSession = Depends(get_db)
) -> IUserRepository:
    return SqlAlchemyUserRepository(db)


async def get_token_repository(
    db: AsyncSession = Depends(get_db)
) -> IRefreshTokenRepository:
    return SqlAlchemyRefreshTokenRepository(db)


async def get_report_repository(
    db: AsyncSession = Depends(get_db)
) -> IReportRepository:
    return SqlAlchemyReportRepository(db)


async def get_pickup_schedule_repository(
    db: AsyncSession = Depends(get_db)
) -> IPickupScheduleRepository:
    return SqlAlchemyPickupScheduleRepository(db)


async def get_analytics_repository(
    db: AsyncSession = Depends(get_db)
) -> IAnalyticsRepository:
    return SqlAlchemyAnalyticsRepository(db)


# ==========================================
# Service Dependency Injections
# ==========================================
async def get_auth_service(
    user_repo: IUserRepository = Depends(get_user_repository),
    token_repo: IRefreshTokenRepository = Depends(get_token_repository),
) -> AuthService:
    return AuthService(user_repo=user_repo, token_repo=token_repo)


async def get_user_service(
    user_repo: IUserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(user_repo=user_repo)


async def get_report_service(
    report_repo: IReportRepository = Depends(get_report_repository),
) -> ReportService:
    return ReportService(report_repo=report_repo)


async def get_pickup_schedule_service(
    schedule_repo: IPickupScheduleRepository = Depends(get_pickup_schedule_repository),
) -> PickupScheduleService:
    return PickupScheduleService(schedule_repo=schedule_repo)


async def get_analytics_service(
    analytics_repo: IAnalyticsRepository = Depends(get_analytics_repository),
) -> AnalyticsService:
    return AnalyticsService(analytics_repo=analytics_repo)


# Singleton instance cached at module level for high performance
_gemini_service_instance = GeminiService()

async def get_gemini_service() -> GeminiService:
    return _gemini_service_instance


# ==========================================
# Security Guards & RBAC Middleware
# ==========================================
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: IUserRepository = Depends(get_user_repository),
) -> User:
    """
    Decodes the JWT access token to retrieve the logged-in user profile.
    Raises standard 401 UNAUTHORIZED exception on error.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        
        if user_id_str is None or token_type != "access":
            raise credentials_exception
            
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError) as e:
        await logger.awarn("Invalid credentials during token parsing", error=str(e))
        raise credentials_exception from e

    user = await user_repo.get_by_id(user_id)
    if user is None:
        await logger.awarn("Token matches user ID, but user is not found or deleted", user_id=user_id_str)
        raise credentials_exception
    return user


class RoleChecker:
    """
    FastAPI dependency factory class enforcing strict Role-Based Access Control (RBAC).
    """

    def __init__(self, allowed_roles: List[UserRole]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            logger.warn(
                "RBAC Authorization Denied",
                user_id=str(current_user.id),
                user_role=current_user.role.value,
                required_roles=[r.value for r in self.allowed_roles]
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
