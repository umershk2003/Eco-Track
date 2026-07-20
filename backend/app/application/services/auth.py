import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import structlog

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.domain.entities.user import User, RefreshToken, UserRole
from app.domain.repositories.user import IUserRepository, IRefreshTokenRepository
from app.application.schemas.user import UserCreate, Token

logger = structlog.get_logger()


class AuthService:
    """
    Enterprise-grade Business Service for Authentication.
    Implements core login, registration, token rotation, and signout flows.
    """

    def __init__(
        self,
        user_repo: IUserRepository,
        token_repo: IRefreshTokenRepository,
    ) -> None:
        self.user_repo = user_repo
        self.token_repo = token_repo

    async def register_user(self, user_in: UserCreate, role: UserRole = UserRole.CITIZEN) -> User:
        """
        Registers a new user, ensuring email uniqueness and encrypting the password.
        """
        existing_user = await self.user_repo.get_by_email(user_in.email)
        if existing_user:
            await logger.awarn("Registration attempt failed: Email already registered", email=user_in.email)
            raise ValueError("Email already registered")

        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            display_name=user_in.display_name,
            role=role,
            city=user_in.city,
            address=user_in.address,
            points=0,
            streak_count=0,
            is_email_verified=False,
        )

        created_user = await self.user_repo.create(new_user)
        await logger.ainfo("New user successfully registered", user_id=str(created_user.id), role=created_user.role)
        return created_user

    async def authenticate_user(self, email: str, password: str) -> Token:
        """
        Authenticates user, revokes any existing active refresh tokens, 
        and issues a fresh Token pair (Access + Refresh).
        """
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            await logger.awarn("Authentication failed: Invalid credentials", email=email)
            raise ValueError("Invalid email or password")

        # Revoke old refresh tokens first
        await self.token_repo.revoke_active_tokens(user.id)

        # Issue fresh JWT tokens
        access_token = create_access_token(subject=user.id)
        refresh_token_str = create_refresh_token(subject=user.id)

        # Record Refresh Token in persistence database
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_entity = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=expires_at,
            is_revoked=False,
        )
        await self.token_repo.create(refresh_token_entity)

        await logger.ainfo("User authenticated successfully", user_id=str(user.id))
        return Token(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
        )

    async def rotate_refresh_token(self, old_refresh_token: str) -> Token:
        """
        Executes Refresh Token Rotation (RTR).
        Detects reuse/theft, revokes all tokens for security if compromised,
        and returns a newly issued Token pair.
        """
        try:
            payload = decode_token(old_refresh_token)
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise ValueError("Invalid token subject")
            user_id = uuid.UUID(user_id_str)
        except Exception as e:
            await logger.awarn("Refresh token rotation failed: Token parsing error", error=str(e))
            raise ValueError("Invalid refresh token") from e

        # Locate the refresh token in database
        token_record = await self.token_repo.get_by_token(old_refresh_token)
        
        # Security Guard: Refresh Token Reuse or Revoked State Detected!
        if not token_record or token_record.is_revoked or token_record.is_expired:
            await logger.acritical(
                "SECURITY HAZARD: Suspicious refresh token reuse detected! Revoking all sessions.",
                user_id=str(user_id)
            )
            # Revoke all tokens for this user immediately as a safety fallback
            await self.token_repo.revoke_active_tokens(user_id)
            raise ValueError("Token has been revoked or expired")

        # Invalidate the rotated token
        token_record.is_revoked = True

        # Ensure user is still active
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User no longer exists")

        # Revoke existing and generate new pairs
        await self.token_repo.revoke_active_tokens(user_id)

        new_access = create_access_token(subject=user.id)
        new_refresh_str = create_refresh_token(subject=user.id)

        new_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_token_record = RefreshToken(
            user_id=user.id,
            token=new_refresh_str,
            expires_at=new_expires,
            is_revoked=False,
        )
        await self.token_repo.create(new_token_record)

        await logger.ainfo("Refresh token rotated successfully", user_id=str(user_id))
        return Token(
            access_token=new_access,
            refresh_token=new_refresh_str,
            token_type="bearer",
        )

    async def revoke_user_tokens(self, user_id: uuid.UUID) -> None:
        """
        Signs a user out by revoking all active refresh tokens.
        """
        await self.token_repo.revoke_active_tokens(user_id)
        await logger.ainfo("Successfully revoked all tokens/signed out user", user_id=str(user_id))
