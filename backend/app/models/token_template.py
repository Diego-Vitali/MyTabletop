from datetime import datetime, timezone

from beanie import Document
from pydantic import Field


class TokenTemplate(Document):
    tabletop_id: str
    folder_id: str | None = None
    name: str
    image_path: str  # e.g. "tokens/<uuid>.png", see app/core/storage.py
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "token_templates"
