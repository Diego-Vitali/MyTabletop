from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_tabletop_or_404, get_wall_or_404, require_dm, require_member
from app.models.scene import Scene
from app.models.user import User
from app.schemas.wall import WallCreate, WallPublic
from app.services.wall_service import create_wall, delete_wall, list_walls

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/walls", tags=["walls"])


async def _get_active_scene_or_404(tabletop_id: str) -> Scene:
    scene = await Scene.find_one(Scene.tabletop_id == tabletop_id, Scene.is_active == True)  # noqa: E712
    if not scene:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há cena ativa nesta mesa")
    return scene


@router.post("", response_model=WallPublic, status_code=201)
async def create(tabletop_id: str, data: WallCreate, user: User = Depends(get_current_user)) -> WallPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await _get_active_scene_or_404(tabletop_id)
    wall = await create_wall(tabletop, scene, user, data)
    return WallPublic.from_wall(wall)


@router.get("", response_model=list[WallPublic])
async def list_all(tabletop_id: str, user: User = Depends(get_current_user)) -> list[WallPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    scene = await Scene.find_one(Scene.tabletop_id == tabletop_id, Scene.is_active == True)  # noqa: E712
    if not scene:
        return []
    walls = await list_walls(str(scene.id))
    return [WallPublic.from_wall(w) for w in walls]


@router.delete("/{wall_id}", status_code=204)
async def delete(tabletop_id: str, wall_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    wall = await get_wall_or_404(tabletop_id, wall_id)
    scene = await _get_active_scene_or_404(tabletop_id)
    await delete_wall(tabletop, scene, wall)
