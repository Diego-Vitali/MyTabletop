from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.deps import (
    get_current_user,
    get_scene_or_404,
    get_tabletop_or_404,
    require_dm,
    require_member,
)
from app.models.map_history import MapHistoryEntry
from app.models.user import User
from app.schemas.map_history import MapHistoryEntryPublic
from app.schemas.scene import ScenePublic, SceneUpdate
from app.services.vtt_service import activate_scene, create_scene, delete_scene, list_scenes, update_scene

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt", tags=["vtt"])


@router.post("/scenes", response_model=ScenePublic, status_code=201)
async def create(
    tabletop_id: str,
    name: str = Form(...),
    folder_id: str | None = Form(None),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> ScenePublic:
    """Adds a scene to the tabletop's scene library (DM-only). The first
    scene ever created for a tabletop becomes the live one automatically;
    otherwise it just sits in the library until activated."""
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await create_scene(tabletop, user, name, folder_id, image)
    return ScenePublic.from_scene(scene)


@router.get("/scenes", response_model=list[ScenePublic])
async def list_all(tabletop_id: str, user: User = Depends(get_current_user)) -> list[ScenePublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    scenes = await list_scenes(tabletop_id)
    return [ScenePublic.from_scene(s) for s in scenes]


@router.patch("/scenes/{scene_id}", response_model=ScenePublic)
async def update(
    tabletop_id: str,
    scene_id: str,
    data: SceneUpdate,
    user: User = Depends(get_current_user),
) -> ScenePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await get_scene_or_404(tabletop_id, scene_id)
    scene = await update_scene(scene, data)
    return ScenePublic.from_scene(scene)


@router.post("/scenes/{scene_id}/activate", response_model=ScenePublic)
async def activate(
    tabletop_id: str, scene_id: str, user: User = Depends(get_current_user)
) -> ScenePublic:
    """Makes this scene the live VTT background. Archives the currently
    active scene (plus its token layout) to map history first, and clears
    the live tokens — broadcasts to every connected client."""
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await get_scene_or_404(tabletop_id, scene_id)
    scene = await activate_scene(tabletop, scene, user)
    return ScenePublic.from_scene(scene)


@router.delete("/scenes/{scene_id}", status_code=204)
async def delete(tabletop_id: str, scene_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await get_scene_or_404(tabletop_id, scene_id)
    await delete_scene(tabletop, scene)


@router.get("/history", response_model=list[MapHistoryEntryPublic])
async def get_history(
    tabletop_id: str, user: User = Depends(get_current_user)
) -> list[MapHistoryEntryPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    entries = await MapHistoryEntry.find(MapHistoryEntry.tabletop_id == tabletop_id).to_list()
    entries.sort(key=lambda e: e.created_at, reverse=True)
    return [MapHistoryEntryPublic.from_entry(e) for e in entries]
