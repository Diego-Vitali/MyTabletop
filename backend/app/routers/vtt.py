from fastapi import APIRouter, Depends, File, UploadFile

from app.core.deps import get_current_user, get_tabletop_or_404, require_dm, require_member
from app.models.map_history import MapHistoryEntry
from app.models.user import User
from app.schemas.map_history import MapHistoryEntryPublic
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
    no separate "scene" library to pick from: the live background is fixed
    and singular, but every previous one (with its token layout) is archived
    to map history first. Swapping it broadcasts to every connected client
    over the tabletop's WebSocket room (see app/routers/ws.py)."""
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_dm(tabletop, user)
    tabletop = await set_background(tabletop, user, image)
    return TabletopPublic.from_tabletop(tabletop)


@router.get("/history", response_model=list[MapHistoryEntryPublic])
async def get_history(
    tabletop_id: str, user: User = Depends(get_current_user)
) -> list[MapHistoryEntryPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    entries = await MapHistoryEntry.find(MapHistoryEntry.tabletop_id == tabletop_id).to_list()
    entries.sort(key=lambda e: e.created_at, reverse=True)
    return [MapHistoryEntryPublic.from_entry(e) for e in entries]
