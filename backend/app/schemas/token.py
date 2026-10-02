from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.models.token import SizeCategory

if TYPE_CHECKING:
    from app.models.token import Token


class TokenUpdate(BaseModel):
    x: float | None = None
    y: float | None = None
    size: float | None = None
    rotation: float | None = None
    flipped_x: bool | None = None
    name: str | None = None
    hp_current: int | None = None
    hp_max: int | None = None
    size_category: SizeCategory | None = None
    circle_crop: bool | None = None
    emits_light: bool | None = None
    light_radius: float | None = None
    restricted_to_dm: bool | None = None
    locked: bool | None = None
    hidden_from_players: bool | None = None


class TokenPlaceFromTemplate(BaseModel):
    x: float
    y: float


class TokenPublic(BaseModel):
    id: str
    tabletop_id: str
    image_url: str
    x: float
    y: float
    size: float | None
    rotation: float
    flipped_x: bool
    name: str | None
    hp_current: int | None
    hp_max: int | None
    size_category: SizeCategory | None
    circle_crop: bool
    emits_light: bool
    light_radius: float | None
    restricted_to_dm: bool
    locked: bool
    hidden_from_players: bool
    template_id: str | None
    created_by: str
    created_at: datetime

    @classmethod
    def from_token(cls, token: "Token") -> "TokenPublic":
        return cls(
            id=str(token.id),
            tabletop_id=token.tabletop_id,
            image_url=f"/uploads/{token.image_path}",
            x=token.x,
            y=token.y,
            size=token.size,
            rotation=token.rotation,
            flipped_x=token.flipped_x,
            name=token.name,
            hp_current=token.hp_current,
            hp_max=token.hp_max,
            size_category=token.size_category,
            circle_crop=token.circle_crop,
            emits_light=token.emits_light,
            light_radius=token.light_radius,
            restricted_to_dm=token.restricted_to_dm,
            locked=token.locked,
            hidden_from_players=token.hidden_from_players,
            template_id=token.template_id,
            created_by=token.created_by,
            created_at=token.created_at,
        )
