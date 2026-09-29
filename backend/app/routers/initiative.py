from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_tabletop_or_404, require_dm, require_member
from app.models.user import User
from app.schemas.initiative import InitiativeEntryCreate, InitiativePublic
from app.services.initiative_service import (
    add_entry,
    end,
    get_or_create,
    next_turn,
    previous_turn,
    remove_entry,
    start,
)

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/initiative", tags=["initiative"])


@router.get("", response_model=InitiativePublic)
async def get(tabletop_id: str, user: User = Depends(get_current_user)) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    return InitiativePublic.from_initiative(initiative)


@router.post("/entries", response_model=InitiativePublic, status_code=201)
async def create_entry(
    tabletop_id: str, data: InitiativeEntryCreate, user: User = Depends(get_current_user)
) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    initiative = await add_entry(initiative, data)
    return InitiativePublic.from_initiative(initiative)


@router.delete("/entries/{entry_id}", response_model=InitiativePublic)
async def delete_entry(
    tabletop_id: str, entry_id: str, user: User = Depends(get_current_user)
) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    if not any(e.id == entry_id for e in initiative.entries):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entrada de iniciativa não encontrada")
    initiative = await remove_entry(initiative, entry_id)
    return InitiativePublic.from_initiative(initiative)


@router.post("/start", response_model=InitiativePublic)
async def start_combat(tabletop_id: str, user: User = Depends(get_current_user)) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    initiative = await start(initiative)
    return InitiativePublic.from_initiative(initiative)


@router.post("/next", response_model=InitiativePublic)
async def advance_turn(tabletop_id: str, user: User = Depends(get_current_user)) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    initiative = await next_turn(initiative)
    return InitiativePublic.from_initiative(initiative)


@router.post("/previous", response_model=InitiativePublic)
async def rewind_turn(tabletop_id: str, user: User = Depends(get_current_user)) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    initiative = await previous_turn(initiative)
    return InitiativePublic.from_initiative(initiative)


@router.post("/end", response_model=InitiativePublic)
async def end_combat(tabletop_id: str, user: User = Depends(get_current_user)) -> InitiativePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    initiative = await get_or_create(tabletop_id)
    initiative = await end(initiative)
    return InitiativePublic.from_initiative(initiative)
