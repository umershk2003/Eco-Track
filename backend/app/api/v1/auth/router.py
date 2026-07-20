from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.api.deps import get_auth_service, get_current_user
from app.application.schemas.user import UserCreate, UserResponse, Token, UserLogin, RefreshTokenRequest
from app.application.services.auth import AuthService
from app.domain.entities.user import User, UserRole
from app.database.session import get_db

logger = structlog.get_logger()

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new citizen on EcoTrack.
    """
    try:
        user = await auth_service.register_user(user_in, role=UserRole.CITIZEN)
        await db.commit() # Flush transaction to PostgreSQL
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible login form endpoint. Used natively by Swagger/OpenAPI docs.
    """
    try:
        tokens = await auth_service.authenticate_user(
            email=form_data.username,
            password=form_data.password
        )
        await db.commit()
        return tokens
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/login-json", response_model=Token)
async def login_json(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Standard JSON login endpoint for web frontends.
    """
    try:
        tokens = await auth_service.authenticate_user(
            email=credentials.email,
            password=credentials.password
        )
        await db.commit()
        return tokens
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    payload: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Refreshes the Access Token using a valid, non-revoked Refresh Token.
    Enforces Refresh Token Rotation.
    """
    try:
        tokens = await auth_service.rotate_refresh_token(payload.refresh_token)
        await db.commit()
        return tokens
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Revokes all active refresh tokens for the current user.
    """
    await auth_service.revoke_user_tokens(current_user.id)
    await db.commit()
    return {"message": "Successfully logged out from all active sessions"}
