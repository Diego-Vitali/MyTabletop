from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.token import Token


class TokenMove(BaseModel):
    x: float
    y: float


class TokenPublic(BaseModel):
    id: str
    tabletop_id: str
    image_url: str
    x: float
    y: float
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
            created_by=token.created_by,
            created_at=token.created_at,
        )
