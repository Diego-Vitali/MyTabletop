from fastapi import APIRouter, Depends

from app.core.deps import (
    get_current_user,
    get_sheet_or_404,
    get_tabletop_or_404,
    require_member,
    require_sheet_editor,
)
from app.models.sheet import Sheet
from app.models.user import User
from app.schemas.sheet import SheetCreate, SheetPublic, SheetUpdate
from app.services.sheet_service import (
    create_sheet,
    delete_sheet,
    list_tabletop_sheets,
    update_sheet,
)

router = APIRouter(prefix="/tabletops/{tabletop_id}/sheets", tags=["sheets"])


def _to_public(sheet: Sheet) -> SheetPublic:
    return SheetPublic(
        id=str(sheet.id),
        tabletop_id=sheet.tabletop_id,
        owner_id=sheet.owner_id,
        kind=sheet.kind,
        rulebook=sheet.rulebook,
        name=sheet.name,
        attributes=sheet.attributes,
        created_at=sheet.created_at,
        updated_at=sheet.updated_at,
    )


@router.post("", response_model=SheetPublic, status_code=201)
async def create(
    tabletop_id: str, data: SheetCreate, user: User = Depends(get_current_user)
) -> SheetPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    sheet = await create_sheet(tabletop, user, data)
    return _to_public(sheet)


@router.get("", response_model=list[SheetPublic])
async def list_sheets(
    tabletop_id: str, user: User = Depends(get_current_user)
) -> list[SheetPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    sheets = await list_tabletop_sheets(tabletop_id)
    return [_to_public(s) for s in sheets]


@router.get("/{sheet_id}", response_model=SheetPublic)
async def get_one(
    tabletop_id: str, sheet_id: str, user: User = Depends(get_current_user)
) -> SheetPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    sheet = await get_sheet_or_404(tabletop_id, sheet_id)
    return _to_public(sheet)


@router.patch("/{sheet_id}", response_model=SheetPublic)
async def update(
    tabletop_id: str,
    sheet_id: str,
    data: SheetUpdate,
    user: User = Depends(get_current_user),
) -> SheetPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    sheet = await get_sheet_or_404(tabletop_id, sheet_id)
    require_sheet_editor(tabletop, sheet, user)
    sheet = await update_sheet(sheet, data)
    return _to_public(sheet)


@router.delete("/{sheet_id}", status_code=204)
async def delete(tabletop_id: str, sheet_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    sheet = await get_sheet_or_404(tabletop_id, sheet_id)
    require_sheet_editor(tabletop, sheet, user)
    await delete_sheet(sheet)
