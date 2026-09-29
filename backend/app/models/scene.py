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


class TokenDisplaySettings(BaseModel):
    """Per-scene toggles for what's drawn on top of a token (see TokenLayer)."""

    show_nameplates: bool = True
    show_hp_bars: bool = True
    show_instance_badges: bool = True


class FogPoint(BaseModel):
    x: float
    y: float


class FogStroke(BaseModel):
    """One brush stroke painted by the DM onto the fog-of-war layer. The
    frontend sends the whole `Scene.fog` list back on every stroke (see
    vtt_service.set_fog) rather than incremental diffs — simple and cheap at
    the stroke counts a single session produces."""

    id: str
    points: list[FogPoint]
    radius: float = 50.0
    is_erasing: bool = False  # False = hides the area (paint fog), True = reveals it


class Scene(Document):
    tabletop_id: str
    folder_id: str | None = None
    name: str
    image_path: str  # e.g. "maps/<uuid>.png", see app/core/storage.py
    is_active: bool = False
    grid: GridConfig = Field(default_factory=GridConfig)
    token_settings: TokenDisplaySettings = Field(default_factory=TokenDisplaySettings)
    fog: list[FogStroke] = Field(default_factory=list)
    # Off by default so every existing/ordinary scene keeps working exactly
    # as before — see app/services/vision_service.py for what turning this
    # on actually changes (players stop receiving live token data outside
    # their party's light+line-of-sight).
    dynamic_lighting_enabled: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "scenes"
