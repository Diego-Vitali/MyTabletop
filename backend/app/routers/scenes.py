from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.deps import get_current_user, get_tabletop_or_404, require_dm, require_member
from app.models.scene import Scene
from app.models.user import User
from app.schemas.scene import ScenePublic
from app.schemas.tabletop import TabletopPublic
from app.services.scene_service import (
    activate_scene,
    create_scene,
    delete_scene,
    get_scene_or_404,
    list_tabletop_scenes,
)

router = APIRouter(prefix="/tabletops/{tabletop_id}/scenes", tags=["scenes"])


def _to_public(scene: Scene) -> ScenePublic:
    return ScenePublic(
        id=str(scene.id),
        tabletop_id=scene.tabletop_id,
        name=scene.name,
        image_url=f"/uploads/{scene.image_path}",
        created_by=scene.created_by,
        created_at=scene.created_at,
    )


@router.post("", response_model=ScenePublic, status_code=201)
async def create(
    tabletop_id: str,
    name: str = Form(...),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> ScenePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await create_scene(tabletop, user, name, image)
    return _to_public(scene)


@router.get("", response_model=list[ScenePublic])
async def list_scenes(
    tabletop_id: str, user: User = Depends(get_current_user)
) -> list[ScenePublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    scenes = await list_tabletop_scenes(tabletop_id)
    return [_to_public(s) for s in scenes]


@router.patch("/{scene_id}/activate", response_model=TabletopPublic)
async def activate(
    tabletop_id: str, scene_id: str, user: User = Depends(get_current_user)
) -> TabletopPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await get_scene_or_404(tabletop_id, scene_id)
    tabletop = await activate_scene(tabletop, scene)
    return TabletopPublic.from_tabletop(tabletop)


@router.delete("/{scene_id}", response_model=TabletopPublic)
async def delete(
    tabletop_id: str, scene_id: str, user: User = Depends(get_current_user)
) -> TabletopPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await get_scene_or_404(tabletop_id, scene_id)
    tabletop = await delete_scene(tabletop, scene)
    return TabletopPublic.from_tabletop(tabletop)
