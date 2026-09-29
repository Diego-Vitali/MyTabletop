from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field


class GridConfig(BaseModel):
    """Grid overlay + measurement config for a scene. Lives on `Scene` rather
    than as its own document since it's 1:1 and always loaded with the scene."""

    enabled: bool = False
    type: Literal["square", "hex"] = "square"
    size: float = 70.0  # px per cell, in the background image's own pixel space
    offset_x: float = 0.0
    offset_y: float = 0.0
    opacity: float = 0.5
    snap_enabled: bool = True
    unit_label: str = "1,5m"  # shown next to measured distances, e.g. "3 (1,5m)"


class Scene(Document):
    tabletop_id: str
    folder_id: str | None = None
    name: str
    image_path: str  # e.g. "maps/<uuid>.png", see app/core/storage.py
    is_active: bool = False
    grid: GridConfig = Field(default_factory=GridConfig)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "scenes"
