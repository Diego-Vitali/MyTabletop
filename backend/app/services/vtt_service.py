from fastapi import UploadFile

from app.core.storage import save_image
from app.core.ws_manager import manager
from app.models.map_history import MapHistoryEntry, TokenSnapshot
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.user import User


async def set_background(tabletop: Tabletop, user: User, image: UploadFile) -> Tabletop:
    """Replaces the tabletop's VTT background. The outgoing map (if any) is
    archived into map_history together with a snapshot of every token that
    was on it, and the live token set is cleared — a fresh map starts empty,
    the old layout only lives on in history. Nothing is ever deleted from
    disk: both old and new map/token images stay in uploads/."""
    if tabletop.background_image:
        current_tokens = await Token.find(Token.tabletop_id == str(tabletop.id)).to_list()
        await MapHistoryEntry(
            tabletop_id=str(tabletop.id),
            image_path=tabletop.background_image,
            tokens=[TokenSnapshot(image_path=t.image_path, x=t.x, y=t.y) for t in current_tokens],
            replaced_by=str(user.id),
        ).insert()
        for token in current_tokens:
            await token.delete()

    image_path = await save_image(image, category="maps")
    tabletop.background_image = image_path
    await tabletop.save()

    await manager.broadcast(
        str(tabletop.id),
        {"type": "background_updated", "background_image_url": f"/uploads/{image_path}"},
    )

    return tabletop
