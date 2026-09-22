from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.tabletop import TabletopMember


class TabletopCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    rulebook: str


class TabletopPublic(BaseModel):
    id: str
    name: str
    created_by: str
    rulebook: str
    members: list[TabletopMember]
    created_at: datetime


class MemberAdd(BaseModel):
    username_or_email: str
    role: Literal["dm", "player"] = "player"


class MemberRoleUpdate(BaseModel):
    role: Literal["dm", "player"]
