from fastapi import APIRouter, Depends

from app.core.deps import (
    get_current_user,
    get_tabletop_or_404,
    require_dm,
    require_member,
)
from app.models.tabletop import Tabletop
from app.models.user import User
from app.schemas.tabletop import MemberAdd, MemberRoleUpdate, TabletopCreate, TabletopPublic
from app.services.tabletop_service import (
    add_member,
    create_tabletop,
    list_user_tabletops,
    remove_member,
    update_member_role,
)

router = APIRouter(prefix="/tabletops", tags=["tabletops"])


def _to_public(tabletop: Tabletop) -> TabletopPublic:
    return TabletopPublic(
        id=str(tabletop.id),
        name=tabletop.name,
        created_by=tabletop.created_by,
        rulebook=tabletop.rulebook,
        members=tabletop.members,
        created_at=tabletop.created_at,
    )


@router.post("", response_model=TabletopPublic, status_code=201)
async def create(data: TabletopCreate, user: User = Depends(get_current_user)) -> TabletopPublic:
    tabletop = await create_tabletop(data, user)
    return _to_public(tabletop)


@router.get("", response_model=list[TabletopPublic])
async def list_mine(user: User = Depends(get_current_user)) -> list[TabletopPublic]:
    tabletops = await list_user_tabletops(user)
    return [_to_public(t) for t in tabletops]


@router.get("/{tabletop_id}", response_model=TabletopPublic)
async def get_one(
    tabletop_id: str, user: User = Depends(get_current_user)
) -> TabletopPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    return _to_public(tabletop)


@router.post("/{tabletop_id}/members", response_model=TabletopPublic)
async def add_tabletop_member(
    tabletop_id: str, data: MemberAdd, user: User = Depends(get_current_user)
) -> TabletopPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    tabletop = await add_member(tabletop, data.username_or_email, data.role)
    return _to_public(tabletop)


@router.patch("/{tabletop_id}/members/{member_user_id}", response_model=TabletopPublic)
async def update_tabletop_member_role(
    tabletop_id: str,
    member_user_id: str,
    data: MemberRoleUpdate,
    user: User = Depends(get_current_user),
) -> TabletopPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    tabletop = await update_member_role(tabletop, member_user_id, data.role)
    return _to_public(tabletop)


@router.delete("/{tabletop_id}/members/{member_user_id}", response_model=TabletopPublic)
async def remove_tabletop_member(
    tabletop_id: str, member_user_id: str, user: User = Depends(get_current_user)
) -> TabletopPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    tabletop = await remove_member(tabletop, member_user_id)
    return _to_public(tabletop)
