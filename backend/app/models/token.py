from datetime import datetime, timezone

from beanie import Document
from pydantic import Field


class Token(Document):
    tabletop_id: str
    image_path: str  # e.g. "tokens/<uuid>.png", see app/core/storage.py
    x: float
    y: float
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tokens"
