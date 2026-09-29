from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.models.drawing import DrawingKind, Point

if TYPE_CHECKING:
    from app.models.drawing import Drawing


class DrawingCreate(BaseModel):
    kind: DrawingKind
    points: list[Point]
    color: str = "#c1454e"
    stroke_width: float = 3.0
    text: str | None = None


class DrawingPublic(BaseModel):
    id: str
    tabletop_id: str
    scene_id: str
    kind: DrawingKind
    points: list[Point]
    color: str
    stroke_width: float
    text: str | None
    created_by: str
    created_at: datetime

    @classmethod
    def from_drawing(cls, drawing: "Drawing") -> "DrawingPublic":
        return cls(
            id=str(drawing.id),
            tabletop_id=drawing.tabletop_id,
            scene_id=drawing.scene_id,
            kind=drawing.kind,
            points=drawing.points,
            color=drawing.color,
            stroke_width=drawing.stroke_width,
            text=drawing.text,
            created_by=drawing.created_by,
            created_at=drawing.created_at,
        )
