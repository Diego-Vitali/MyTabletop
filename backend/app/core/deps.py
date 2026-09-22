import jwt
from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.models.tabletop import Tabletop
from app.models.user import User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado"
        ) from exc

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado")
    return user


async def get_tabletop_or_404(tabletop_id: str) -> Tabletop:
    tabletop = await Tabletop.get(PydanticObjectId(tabletop_id))
    if not tabletop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa não encontrada")
    return tabletop


def require_member(tabletop: Tabletop, user: User) -> None:
    if not any(m.user_id == str(user.id) for m in tabletop.members):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não faz parte desta mesa")


def require_dm(tabletop: Tabletop, user: User) -> None:
    if not any(
        m.user_id == str(user.id) and m.role == "dm" for m in tabletop.members
    ):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Apenas o mestre (DM) pode fazer isso"
        )
