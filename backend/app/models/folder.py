from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import Field


class Folder(Document):
    tabletop_id: str
    kind: Literal["scene", "token"]
    name: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "folders"
