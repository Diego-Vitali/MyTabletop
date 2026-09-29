from datetime import datetime, timezone

from beanie import Document
from pydantic import Field


class Wall(Document):
    """A line-of-sight blocker for dynamic lighting (see app/core/geometry.py
    and app/services/vision_service.py). Only affects vision/light — never
    blocks token movement, that's out of scope (see CLAUDE.md's VTT
    architecture notes)."""

    tabletop_id: str
    scene_id: str
    x1: float
    y1: float
    x2: float
    y2: float
    blocks_light: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "walls"
