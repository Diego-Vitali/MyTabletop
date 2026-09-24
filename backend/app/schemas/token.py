from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.token import Token


class TokenUpdate(BaseModel):
    x: float | None = None
    y: float | None = None
    size: float | None = None
    flipped_x: bool | None = None


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
    flipped_x: bool
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
            flipped_x=token.flipped_x,
            template_id=token.template_id,
            created_by=token.created_by,
            created_at=token.created_at,
        )
