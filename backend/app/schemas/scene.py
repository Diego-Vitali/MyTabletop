from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.scene import Scene


class SceneUpdate(BaseModel):
    name: str | None = None
    folder_id: str | None = None


class ScenePublic(BaseModel):
    id: str
    tabletop_id: str
    folder_id: str | None
    name: str
    image_url: str
    is_active: bool
    created_by: str
    created_at: datetime

    @classmethod
    def from_scene(cls, scene: "Scene") -> "ScenePublic":
        return cls(
            id=str(scene.id),
            tabletop_id=scene.tabletop_id,
            folder_id=scene.folder_id,
            name=scene.name,
            image_url=f"/uploads/{scene.image_path}",
            is_active=scene.is_active,
            created_by=scene.created_by,
            created_at=scene.created_at,
        )
