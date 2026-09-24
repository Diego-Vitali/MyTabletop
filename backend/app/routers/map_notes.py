from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_map_note_or_404, get_tabletop_or_404, require_dm, require_member
from app.models.scene import Scene
from app.models.user import User
from app.schemas.map_note import MapNoteCreate, MapNotePublic, MapNoteUpdate
from app.services.map_note_service import create_note, delete_note, list_notes, update_note

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/notes", tags=["notes"])


async def _get_active_scene_or_404(tabletop_id: str) -> Scene:
    scene = await Scene.find_one(Scene.tabletop_id == tabletop_id, Scene.is_active == True)  # noqa: E712
    if not scene:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há cena ativa nesta mesa")
    return scene


@router.post("", response_model=MapNotePublic, status_code=201)
async def create(
    tabletop_id: str, data: MapNoteCreate, user: User = Depends(get_current_user)
) -> MapNotePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await _get_active_scene_or_404(tabletop_id)
    note = await create_note(tabletop, scene, user, data)
    return MapNotePublic.from_note(note)


@router.get("", response_model=list[MapNotePublic])
async def list_all(tabletop_id: str, user: User = Depends(get_current_user)) -> list[MapNotePublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    scene = await Scene.find_one(Scene.tabletop_id == tabletop_id, Scene.is_active == True)  # noqa: E712
    if not scene:
        return []
    notes = await list_notes(str(scene.id))
    return [MapNotePublic.from_note(n) for n in notes]


@router.patch("/{note_id}", response_model=MapNotePublic)
async def update(
    tabletop_id: str, note_id: str, data: MapNoteUpdate, user: User = Depends(get_current_user)
) -> MapNotePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    note = await get_map_note_or_404(tabletop_id, note_id)
    note = await update_note(note, data)
    return MapNotePublic.from_note(note)


@router.delete("/{note_id}", status_code=204)
async def delete(tabletop_id: str, note_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    note = await get_map_note_or_404(tabletop_id, note_id)
    await delete_note(note)
