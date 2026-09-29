from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.wall import Wall


class WallCreate(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    blocks_light: bool = True


class WallPublic(BaseModel):
    id: str
    tabletop_id: str
    scene_id: str
    x1: float
    y1: float
    x2: float
    y2: float
    blocks_light: bool
    created_by: str
    created_at: datetime

    @classmethod
    def from_wall(cls, wall: "Wall") -> "WallPublic":
        return cls(
            id=str(wall.id),
            tabletop_id=wall.tabletop_id,
            scene_id=wall.scene_id,
            x1=wall.x1,
            y1=wall.y1,
            x2=wall.x2,
            y2=wall.y2,
            blocks_light=wall.blocks_light,
            created_by=wall.created_by,
            created_at=wall.created_at,
        )
