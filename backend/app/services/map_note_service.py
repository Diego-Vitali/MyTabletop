from app.core.ws_manager import manager
from app.models.map_note import MapNote
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.user import User
from app.schemas.map_note import MapNoteCreate, MapNotePublic, MapNoteUpdate


async def create_note(tabletop: Tabletop, scene: Scene, creator: User, data: MapNoteCreate) -> MapNote:
    note = MapNote(
        tabletop_id=str(tabletop.id),
        scene_id=str(scene.id),
        x=data.x,
        y=data.y,
        text=data.text,
        created_by=str(creator.id),
    )
    await note.insert()

    await manager.broadcast(
        str(tabletop.id),
        {"type": "note_added", "note": MapNotePublic.from_note(note).model_dump(mode="json")},
    )
    return note


async def list_notes(scene_id: str) -> list[MapNote]:
    return await MapNote.find(MapNote.scene_id == scene_id).to_list()


async def update_note(note: MapNote, data: MapNoteUpdate) -> MapNote:
    if data.x is not None:
        note.x = data.x
    if data.y is not None:
        note.y = data.y
    if data.text is not None:
        note.text = data.text
    await note.save()

    await manager.broadcast(
        note.tabletop_id,
        {"type": "note_updated", "note": MapNotePublic.from_note(note).model_dump(mode="json")},
    )
    return note


async def delete_note(note: MapNote) -> None:
    tabletop_id = note.tabletop_id
    note_id = str(note.id)
    await note.delete()

    await manager.broadcast(tabletop_id, {"type": "note_deleted", "note_id": note_id})
