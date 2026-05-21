from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.trade import AuthRequest, AuthResponse
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == payload.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")

    user = User(
        username=payload.username,
        email=f"{payload.username}@trading.local",
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user_id=user.id, username=user.username)


@router.post("/login", response_model=AuthResponse)
async def login(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user_id=user.id, username=user.username)
