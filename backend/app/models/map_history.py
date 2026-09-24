from datetime import datetime, timezone

from beanie import Document
from pydantic import BaseModel, Field


class TokenSnapshot(BaseModel):
    image_path: str
    x: float
    y: float
    size: float | None = None
    flipped_x: bool = False


class MapHistoryEntry(Document):
    """A permanent record of a scene that was swapped out as the active one,
    plus where every token was sitting on it at that moment. Created
    automatically by vtt_service.activate_scene right before it deactivates
    the outgoing scene — never created or edited directly."""

    tabletop_id: str
    image_path: str  # the outgoing map, e.g. "maps/<uuid>.png"
    tokens: list[TokenSnapshot] = []
    replaced_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "map_history"
