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
    circle_crop: bool = False  # False = show the full token image; True = crop it to a circle
    emits_light: bool = False
    light_radius: float | None = None  # px, only meaningful when emits_light
    # Movement is open to every member by default (see token_service.update_token
    # and app/core/deps.require_token_mover) — these two are the DM's opt-in
    # restrictions, and they're not the same thing: `restricted_to_dm` only
    # blocks players (the DM can still move it), `locked` blocks EVERYONE
    # including the DM, until a DM unlocks it again via the token panel.
    restricted_to_dm: bool = False
    locked: bool = False
    # DM-only visibility switch: a hidden token is withheld entirely from
    # non-DM members — not in their GET /tokens list, no WS broadcast about
    # it — so it's also implicitly untouchable (they never have its id).
    # Independent of restricted_to_dm/locked and of dynamic_lighting_enabled.
    hidden_from_players: bool = False
    template_id: str | None = None  # the TokenTemplate this was placed from, if any
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tokens"
