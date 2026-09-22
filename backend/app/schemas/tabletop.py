from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field

from app.models.tabletop import TabletopMember

if TYPE_CHECKING:
    from app.models.tabletop import Tabletop


class TabletopCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    rulebook: str


class TabletopPublic(BaseModel):
    id: str
    name: str
    created_by: str
    rulebook: str
    members: list[TabletopMember]
    active_scene_id: str | None
    created_at: datetime

    @classmethod
    def from_tabletop(cls, tabletop: "Tabletop") -> "TabletopPublic":
        return cls(
            id=str(tabletop.id),
            name=tabletop.name,
            created_by=tabletop.created_by,
            rulebook=tabletop.rulebook,
            members=tabletop.members,
            active_scene_id=tabletop.active_scene_id,
            created_at=tabletop.created_at,
        )


class MemberAdd(BaseModel):
    username_or_email: str
    role: Literal["dm", "player"] = "player"


class MemberRoleUpdate(BaseModel):
    role: Literal["dm", "player"]
