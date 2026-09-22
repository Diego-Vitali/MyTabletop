from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic(
        id=str(user.id),
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        tabletops=user.tabletops,
    )
