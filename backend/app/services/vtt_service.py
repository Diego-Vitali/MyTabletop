from fastapi import UploadFile

from app.core.storage import delete_image, save_image
from app.core.ws_manager import manager
from app.models.tabletop import Tabletop


async def set_background(tabletop: Tabletop, image: UploadFile) -> Tabletop:
    old_filename = tabletop.background_image

    filename = await save_image(image)
    tabletop.background_image = filename
    await tabletop.save()

    if old_filename:
        delete_image(old_filename)

    await manager.broadcast(
        str(tabletop.id),
        {"type": "background_updated", "background_image_url": f"/uploads/{filename}"},
    )

    return tabletop
