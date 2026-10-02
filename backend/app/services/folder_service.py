from typing import Literal

from app.core.ws_manager import manager
from app.models.folder import Folder
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.token_template import TokenTemplate
from app.models.user import User
from app.schemas.folder import FolderPublic, FolderUpdate


async def _notify_folder(folder: Folder, message: dict) -> None:
    """Token folders are personal (see list_folders) so their events only go
    to the owner; scene folders stay tabletop-wide — only the DM ever sees
    that dock tab anyway, and every scene folder is DM-created."""
    if folder.kind == "token":
        await manager.send_to_user(folder.tabletop_id, folder.created_by, message)
    else:
        await manager.broadcast(folder.tabletop_id, message)


async def create_folder(tabletop: Tabletop, creator: User, kind: Literal["scene", "token"], name: str) -> Folder:
    folder = Folder(tabletop_id=str(tabletop.id), kind=kind, name=name, created_by=str(creator.id))
    await folder.insert()

    await _notify_folder(
        folder, {"type": "folder_created", "folder": FolderPublic.from_folder(folder).model_dump(mode="json")}
    )
    return folder


async def list_folders(
    tabletop_id: str, kind: Literal["scene", "token"] | None = None, creator_id: str | None = None
) -> list[Folder]:
    """Token folders are scoped to their creator (each member's token
    library is their own — see token_template_service.list_templates);
    scene folders stay tabletop-wide."""
    if kind == "token" and creator_id is not None:
        return await Folder.find(
            Folder.tabletop_id == tabletop_id, Folder.kind == kind, Folder.created_by == creator_id
        ).to_list()
    if kind is not None:
        return await Folder.find(Folder.tabletop_id == tabletop_id, Folder.kind == kind).to_list()
    return await Folder.find(Folder.tabletop_id == tabletop_id).to_list()


async def update_folder(folder: Folder, data: FolderUpdate) -> Folder:
    folder.name = data.name
    await folder.save()

    await _notify_folder(
        folder, {"type": "folder_updated", "folder": FolderPublic.from_folder(folder).model_dump(mode="json")}
    )
    return folder


async def delete_folder(folder: Folder) -> None:
    tabletop_id = folder.tabletop_id
    folder_id = str(folder.id)

    if folder.kind == "scene":
        scenes = await Scene.find(Scene.tabletop_id == tabletop_id, Scene.folder_id == folder_id).to_list()
        for scene in scenes:
            scene.folder_id = None
            await scene.save()
    else:
        templates = await TokenTemplate.find(
            TokenTemplate.tabletop_id == tabletop_id, TokenTemplate.folder_id == folder_id
        ).to_list()
        for template in templates:
            template.folder_id = None
            await template.save()

    await _notify_folder(folder, {"type": "folder_deleted", "folder_id": folder_id})
    await folder.delete()
