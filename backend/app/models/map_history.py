from datetime import datetime, timezone

from beanie import Document
from pydantic import BaseModel, Field


class TokenSnapshot(BaseModel):
    image_path: str
    x: float
    y: float


class MapHistoryEntry(Document):
    """A permanent record of a map that was replaced, plus where every token
    was sitting on it at that moment. Created automatically by
    vtt_service.set_background right before it overwrites
    Tabletop.background_image — never created or edited directly."""

    tabletop_id: str
    image_path: str  # the outgoing map, e.g. "maps/<uuid>.png"
    tokens: list[TokenSnapshot] = []
    replaced_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "map_history"
