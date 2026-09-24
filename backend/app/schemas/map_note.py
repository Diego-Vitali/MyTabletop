from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.map_note import MapNote


class MapNoteCreate(BaseModel):
    x: float
    y: float
    text: str = Field(min_length=1, max_length=2000)


class MapNoteUpdate(BaseModel):
    x: float | None = None
    y: float | None = None
    text: str | None = Field(default=None, min_length=1, max_length=2000)


class MapNotePublic(BaseModel):
    id: str
    tabletop_id: str
    scene_id: str
    x: float
    y: float
    text: str
    created_by: str
    created_at: datetime

    @classmethod
    def from_note(cls, note: "MapNote") -> "MapNotePublic":
        return cls(
            id=str(note.id),
            tabletop_id=note.tabletop_id,
            scene_id=note.scene_id,
            x=note.x,
            y=note.y,
            text=note.text,
            created_by=note.created_by,
            created_at=note.created_at,
        )
