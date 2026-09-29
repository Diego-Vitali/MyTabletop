from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_drawing_or_404, get_tabletop_or_404, require_dm, require_member
from app.models.scene import Scene
from app.models.user import User
from app.schemas.drawing import DrawingCreate, DrawingPublic
from app.services.drawing_service import create_drawing, delete_drawing, list_drawings

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/drawings", tags=["drawings"])


async def _get_active_scene_or_404(tabletop_id: str) -> Scene:
    scene = await Scene.find_one(Scene.tabletop_id == tabletop_id, Scene.is_active == True)  # noqa: E712
    if not scene:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há cena ativa nesta mesa")
    return scene


@router.post("", response_model=DrawingPublic, status_code=201)
async def create(
    tabletop_id: str, data: DrawingCreate, user: User = Depends(get_current_user)
) -> DrawingPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    scene = await _get_active_scene_or_404(tabletop_id)
    drawing = await create_drawing(tabletop, scene, user, data)
    return DrawingPublic.from_drawing(drawing)


@router.get("", response_model=list[DrawingPublic])
async def list_all(tabletop_id: str, user: User = Depends(get_current_user)) -> list[DrawingPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    scene = await Scene.find_one(Scene.tabletop_id == tabletop_id, Scene.is_active == True)  # noqa: E712
    if not scene:
        return []
    drawings = await list_drawings(str(scene.id))
    return [DrawingPublic.from_drawing(d) for d in drawings]


@router.delete("/{drawing_id}", status_code=204)
async def delete(tabletop_id: str, drawing_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    drawing = await get_drawing_or_404(tabletop_id, drawing_id)
    await delete_drawing(drawing)
