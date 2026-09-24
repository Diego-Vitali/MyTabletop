from fastapi import UploadFile

from app.core.storage import save_image
from app.core.ws_manager import manager
from app.models.map_history import MapHistoryEntry, TokenSnapshot
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.user import User
from app.schemas.scene import ScenePublic, SceneUpdate


async def _archive_and_clear(tabletop: Tabletop, outgoing: Scene, user: User) -> None:
    """Archives `outgoing` (plus a snapshot of every live token on it) into
    map_history, then clears the live token set. Nothing is ever deleted
    from disk — see app/core/storage.py."""
    current_tokens = await Token.find(Token.tabletop_id == str(tabletop.id)).to_list()
    await MapHistoryEntry(
        tabletop_id=str(tabletop.id),
        image_path=outgoing.image_path,
        tokens=[
            TokenSnapshot(image_path=t.image_path, x=t.x, y=t.y, size=t.size, flipped_x=t.flipped_x)
            for t in current_tokens
        ],
        replaced_by=str(user.id),
    ).insert()
    for token in current_tokens:
        await token.delete()


async def _broadcast_background(tabletop: Tabletop, scene: Scene | None) -> None:
    await manager.broadcast(
        str(tabletop.id),
        {
            "type": "background_updated",
            "background_image_url": f"/uploads/{scene.image_path}" if scene else None,
            "scene_id": str(scene.id) if scene else None,
        },
    )


async def create_scene(
    tabletop: Tabletop, user: User, name: str, folder_id: str | None, image: UploadFile
) -> Scene:
    image_path = await save_image(image, category="maps")
    scene = Scene(
        tabletop_id=str(tabletop.id),
        folder_id=folder_id,
        name=name,
        image_path=image_path,
        created_by=str(user.id),
    )
    await scene.insert()

    await manager.broadcast(
        str(tabletop.id),
        {"type": "scene_created", "scene": ScenePublic.from_scene(scene).model_dump(mode="json")},
    )

    existing_active = await Scene.find_one(Scene.tabletop_id == str(tabletop.id), Scene.is_active == True)  # noqa: E712
    if existing_active is None:
        await activate_scene(tabletop, scene, user)

    return scene


async def activate_scene(tabletop: Tabletop, scene: Scene, user: User) -> Scene:
    """Makes `scene` the tabletop's live background. If a different scene is
    currently active, it (and the live token layout on it) is archived to
    map history first, and the live tokens are cleared — the newly active
    scene starts with an empty token layer."""
    current_active = await Scene.find_one(
        Scene.tabletop_id == str(tabletop.id), Scene.is_active == True  # noqa: E712
    )
    if current_active and str(current_active.id) != str(scene.id):
        await _archive_and_clear(tabletop, current_active, user)
        current_active.is_active = False
        await current_active.save()

    scene.is_active = True
    await scene.save()

    tabletop.background_image = scene.image_path
    await tabletop.save()

    await _broadcast_background(tabletop, scene)
    return scene


async def update_scene(scene: Scene, data: SceneUpdate) -> Scene:
    if data.name is not None:
        scene.name = data.name
    if "folder_id" in data.model_fields_set:
        scene.folder_id = data.folder_id
    await scene.save()

    await manager.broadcast(
        scene.tabletop_id,
        {"type": "scene_updated", "scene": ScenePublic.from_scene(scene).model_dump(mode="json")},
    )
    return scene


async def delete_scene(tabletop: Tabletop, scene: Scene) -> None:
    tabletop_id = str(tabletop.id)
    scene_id = str(scene.id)
    was_active = scene.is_active

    await scene.delete()

    if was_active:
        current_tokens = await Token.find(Token.tabletop_id == tabletop_id).to_list()
        for token in current_tokens:
            await token.delete()
        tabletop.background_image = None
        await tabletop.save()

    await manager.broadcast(tabletop_id, {"type": "scene_deleted", "scene_id": scene_id})
    if was_active:
        await _broadcast_background(tabletop, None)


async def list_scenes(tabletop_id: str) -> list[Scene]:
    return await Scene.find(Scene.tabletop_id == tabletop_id).to_list()
