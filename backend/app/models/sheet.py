from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import Field


class Sheet(Document):
    tabletop_id: str
    owner_id: str
    kind: Literal["character", "npc"]
    rulebook: str
    name: str
    attributes: dict[str, int] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "sheets"
