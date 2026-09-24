from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.map_history import MapHistoryEntry


class TokenSnapshotPublic(BaseModel):
    image_url: str
    x: float
    y: float
    size: float | None
    flipped_x: bool


class MapHistoryEntryPublic(BaseModel):
    id: str
    tabletop_id: str
    image_url: str
    tokens: list[TokenSnapshotPublic]
    replaced_by: str
    created_at: datetime

    @classmethod
    def from_entry(cls, entry: "MapHistoryEntry") -> "MapHistoryEntryPublic":
        return cls(
            id=str(entry.id),
            tabletop_id=entry.tabletop_id,
            image_url=f"/uploads/{entry.image_path}",
            tokens=[
                TokenSnapshotPublic(
                    image_url=f"/uploads/{t.image_path}",
                    x=t.x,
                    y=t.y,
                    size=t.size,
                    flipped_x=t.flipped_x,
                )
                for t in entry.tokens
            ],
            replaced_by=entry.replaced_by,
            created_at=entry.created_at,
        )
