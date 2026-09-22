from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field


class TabletopMember(BaseModel):
    user_id: str
    username: str
    role: Literal["dm", "player"]
    joined_at: datetime


class Tabletop(Document):
    name: str
    created_by: str
    rulebook: str
    members: list[TabletopMember] = []
    active_scene_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tabletops"
