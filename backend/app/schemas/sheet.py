from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SheetCreate(BaseModel):
    kind: Literal["character", "npc"]
    name: str = Field(min_length=1, max_length=100)
    attributes: dict[str, int] = {}


class SheetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    attributes: dict[str, int] | None = None


class SheetPublic(BaseModel):
    id: str
    tabletop_id: str
    owner_id: str
    kind: Literal["character", "npc"]
    rulebook: str
    name: str
    attributes: dict[str, int]
    created_at: datetime
    updated_at: datetime
