from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field

DrawingKind = Literal["freehand", "line", "rect", "circle", "text"]


class Point(BaseModel):
    x: float
    y: float


class Drawing(Document):
    """A single shape/annotation on a scene's map. `points` is interpreted by
    `kind`: freehand is every point along the stroke; line is [start, end];
    rect is [top_left, bottom_right]; circle is [center, edge]; text is a
    single point (the label's anchor)."""

    tabletop_id: str
    scene_id: str
    kind: DrawingKind
    points: list[Point]
    color: str = "#c1454e"
    stroke_width: float = 3.0
    text: str | None = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "drawings"
