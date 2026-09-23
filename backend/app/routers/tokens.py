from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.deps import (
    get_current_user,
    get_tabletop_or_404,
    get_token_or_404,
    require_member,
    require_token_editor,
)
from app.models.user import User
from app.schemas.token import TokenMove, TokenPublic
from app.services.token_service import create_token, delete_token, list_tokens, move_token

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/tokens", tags=["tokens"])


@router.post("", response_model=TokenPublic, status_code=201)
async def create(
    tabletop_id: str,
    x: float = Form(...),
    y: float = Form(...),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> TokenPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    token = await create_token(tabletop, user, x, y, image)
    return TokenPublic.from_token(token)


@router.get("", response_model=list[TokenPublic])
async def list_all(tabletop_id: str, user: User = Depends(get_current_user)) -> list[TokenPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    tokens = await list_tokens(tabletop_id)
    return [TokenPublic.from_token(t) for t in tokens]


@router.patch("/{token_id}", response_model=TokenPublic)
async def move(
    tabletop_id: str,
    token_id: str,
    data: TokenMove,
    user: User = Depends(get_current_user),
) -> TokenPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    token = await get_token_or_404(tabletop_id, token_id)
    require_token_editor(tabletop, token, user)
    token = await move_token(token, data.x, data.y)
    return TokenPublic.from_token(token)


@router.delete("/{token_id}", status_code=204)
async def delete(
    tabletop_id: str, token_id: str, user: User = Depends(get_current_user)
) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    token = await get_token_or_404(tabletop_id, token_id)
    require_token_editor(tabletop, token, user)
    await delete_token(token)
