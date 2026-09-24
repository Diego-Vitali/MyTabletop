from datetime import datetime, timezone

from beanie import Document
from pydantic import Field


class Scene(Document):
    tabletop_id: str
    folder_id: str | None = None
    name: str
    image_path: str  # e.g. "maps/<uuid>.png", see app/core/storage.py
    is_active: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "scenes"
