from datetime import datetime, timezone
from typing import Literal

from beanie import Document
from pydantic import Field

SizeCategory = Literal["pequeno", "medio", "grande", "enorme", "descomunal"]


class Token(Document):
    tabletop_id: str
    image_path: str  # e.g. "tokens/<uuid>.png", see app/core/storage.py
    x: float
    y: float
    size: float | None = None  # px in the background image's natural pixel space; None = frontend default
    rotation: float = 0.0  # degrees
    flipped_x: bool = False
    name: str | None = None
    hp_current: int | None = None
    hp_max: int | None = None
    size_category: SizeCategory | None = None
    emits_light: bool = False
    light_radius: float | None = None  # px, only meaningful when emits_light
    template_id: str | None = None  # the TokenTemplate this was placed from, if any
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tokens"
