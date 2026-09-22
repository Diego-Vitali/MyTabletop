from fastapi import HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest


async def register_user(data: RegisterRequest) -> tuple[User, str]:
    if await User.find_one({"username": data.username}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username já está em uso")
    if await User.find_one({"email": data.email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email já está em uso")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    await user.insert()
    token = create_access_token(str(user.id))
    return user, token


async def authenticate_user(data: LoginRequest) -> tuple[User, str]:
    user = await User.find_one(
        {"$or": [{"username": data.username_or_email}, {"email": data.username_or_email}]}
    )
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciais inválidas")

    token = create_access_token(str(user.id))
    return user, token
