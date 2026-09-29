from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_tabletop_or_404, is_dm, require_member
from app.models.encounter import Encounter
from app.models.user import User
from app.schemas.encounter import EncounterCreate, EncounterPublic, EncounterSpawn
from app.schemas.token import TokenPublic
from app.services.encounter_service import (
    create_encounter,
    delete_encounter,
    list_encounters,
    spawn_encounter,
)

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/encounters", tags=["encounters"])


async def _get_encounter_or_404(tabletop_id: str, encounter_id: str) -> Encounter:
    encounter = await Encounter.get(PydanticObjectId(encounter_id))
    if not encounter or encounter.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encontro não encontrado")
    return encounter


@router.post("", response_model=EncounterPublic, status_code=201)
async def create(
    tabletop_id: str, data: EncounterCreate, user: User = Depends(get_current_user)
) -> EncounterPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    encounter = await create_encounter(tabletop, user, data.name, data.template_ids)
    return EncounterPublic.from_encounter(encounter)


@router.get("", response_model=list[EncounterPublic])
async def list_all(tabletop_id: str, user: User = Depends(get_current_user)) -> list[EncounterPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    encounters = await list_encounters(tabletop_id)
    return [EncounterPublic.from_encounter(e) for e in encounters]


@router.delete("/{encounter_id}", status_code=204)
async def delete(tabletop_id: str, encounter_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    encounter = await _get_encounter_or_404(tabletop_id, encounter_id)
    if not is_dm(tabletop, user) and encounter.created_by != str(user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não tem permissão para apagar este encontro")
    await delete_encounter(encounter)


@router.post("/{encounter_id}/spawn", response_model=list[TokenPublic])
async def spawn(
    tabletop_id: str, encounter_id: str, data: EncounterSpawn, user: User = Depends(get_current_user)
) -> list[TokenPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    encounter = await _get_encounter_or_404(tabletop_id, encounter_id)
    tokens = await spawn_encounter(tabletop, encounter, user, data.x, data.y)
    return [TokenPublic.from_token(t) for t in tokens]
