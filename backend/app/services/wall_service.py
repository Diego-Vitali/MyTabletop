from app.core.ws_manager import manager
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.user import User
from app.models.wall import Wall
from app.schemas.wall import WallCreate, WallPublic
from app.services.vision_service import recompute_and_broadcast


async def create_wall(tabletop: Tabletop, scene: Scene, creator: User, data: WallCreate) -> Wall:
    wall = Wall(
        tabletop_id=str(tabletop.id),
        scene_id=str(scene.id),
        x1=data.x1,
        y1=data.y1,
        x2=data.x2,
        y2=data.y2,
        blocks_light=data.blocks_light,
        created_by=str(creator.id),
    )
    await wall.insert()

    await manager.broadcast(
        str(tabletop.id),
        {"type": "wall_added", "wall": WallPublic.from_wall(wall).model_dump(mode="json")},
    )
    if scene.dynamic_lighting_enabled:
        await recompute_and_broadcast(tabletop, str(scene.id))
    return wall


async def list_walls(scene_id: str) -> list[Wall]:
    return await Wall.find(Wall.scene_id == scene_id).to_list()


async def delete_wall(tabletop: Tabletop, scene: Scene, wall: Wall) -> None:
    wall_id = str(wall.id)
    await wall.delete()

    await manager.broadcast(str(tabletop.id), {"type": "wall_deleted", "wall_id": wall_id})
    if scene.dynamic_lighting_enabled:
        await recompute_and_broadcast(tabletop, str(scene.id))
