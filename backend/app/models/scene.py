from datetime import datetime, timezone

from beanie import Document
from pydantic import Field


class Scene(Document):
    tabletop_id: str
    name: str
    image_path: str  # filename under the uploads directory, see app/core/storage.py
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "scenes"
