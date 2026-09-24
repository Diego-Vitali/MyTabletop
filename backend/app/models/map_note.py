from datetime import datetime, timezone

from beanie import Document
from pydantic import Field


class MapNote(Document):
    tabletop_id: str
    scene_id: str  # notes are scoped to the scene they were pinned on, since x/y is that scene's own pixel space
    x: float
    y: float
    text: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "map_notes"
