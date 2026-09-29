from app.core.ws_manager import manager
from app.models.drawing import Drawing
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.user import User
from app.schemas.drawing import DrawingCreate, DrawingPublic


async def create_drawing(tabletop: Tabletop, scene: Scene, creator: User, data: DrawingCreate) -> Drawing:
    drawing = Drawing(
        tabletop_id=str(tabletop.id),
        scene_id=str(scene.id),
        kind=data.kind,
        points=data.points,
        color=data.color,
        stroke_width=data.stroke_width,
        text=data.text,
        created_by=str(creator.id),
    )
    await drawing.insert()

    await manager.broadcast(
        str(tabletop.id),
        {"type": "drawing_added", "drawing": DrawingPublic.from_drawing(drawing).model_dump(mode="json")},
    )
    return drawing


async def list_drawings(scene_id: str) -> list[Drawing]:
    return await Drawing.find(Drawing.scene_id == scene_id).to_list()


async def delete_drawing(drawing: Drawing) -> None:
    tabletop_id = drawing.tabletop_id
    drawing_id = str(drawing.id)
    await drawing.delete()

    await manager.broadcast(tabletop_id, {"type": "drawing_deleted", "drawing_id": drawing_id})
