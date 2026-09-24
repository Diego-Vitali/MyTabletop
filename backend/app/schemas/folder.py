from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.models.folder import Folder


class FolderCreate(BaseModel):
    kind: Literal["scene", "token"]
    name: str = Field(min_length=1, max_length=100)


class FolderUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class FolderPublic(BaseModel):
    id: str
    tabletop_id: str
    kind: Literal["scene", "token"]
    name: str
    created_by: str
    created_at: datetime

    @classmethod
    def from_folder(cls, folder: "Folder") -> "FolderPublic":
        return cls(
            id=str(folder.id),
            tabletop_id=folder.tabletop_id,
            kind=folder.kind,
            name=folder.name,
            created_by=folder.created_by,
            created_at=folder.created_at,
        )
