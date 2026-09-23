from fastapi import APIRouter, Depends, File, UploadFile

from app.core.deps import get_current_user, get_tabletop_or_404, require_dm
from app.models.user import User
from app.schemas.tabletop import TabletopPublic
from app.services.vtt_service import set_background

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt", tags=["vtt"])


@router.put("/background", response_model=TabletopPublic)
async def update_background(
    tabletop_id: str,
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> TabletopPublic:
    """Replaces the tabletop's VTT background image. DM-only, in place — there's
    no separate "scene" library: the background is fixed and singular, and
    swapping it broadcasts to every connected client over the tabletop's
    WebSocket room (see app/routers/ws.py)."""
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    tabletop = await set_background(tabletop, image)
    return TabletopPublic.from_tabletop(tabletop)
