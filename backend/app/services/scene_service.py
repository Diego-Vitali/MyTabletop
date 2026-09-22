from beanie import PydanticObjectId
from fastapi import HTTPException, UploadFile, status

from app.core.storage import delete_scene_image, save_scene_image
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.user import User


async def create_scene(tabletop: Tabletop, creator: User, name: str, image: UploadFile) -> Scene:
    filename = await save_scene_image(image)
    scene = Scene(
        tabletop_id=str(tabletop.id),
        name=name,
        image_path=filename,
        created_by=str(creator.id),
    )
    await scene.insert()

    tabletop.active_scene_id = str(scene.id)
    await tabletop.save()

    return scene


async def list_tabletop_scenes(tabletop_id: str) -> list[Scene]:
    return await Scene.find(Scene.tabletop_id == tabletop_id).to_list()


async def get_scene_or_404(tabletop_id: str, scene_id: str) -> Scene:
    scene = await Scene.get(PydanticObjectId(scene_id))
    if not scene or scene.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cena não encontrada")
    return scene


async def activate_scene(tabletop: Tabletop, scene: Scene) -> Tabletop:
    tabletop.active_scene_id = str(scene.id)
    await tabletop.save()
    return tabletop


async def delete_scene(tabletop: Tabletop, scene: Scene) -> Tabletop:
    await scene.delete()
    delete_scene_image(scene.image_path)
    if tabletop.active_scene_id == str(scene.id):
        tabletop.active_scene_id = None
        await tabletop.save()
    return tabletop
