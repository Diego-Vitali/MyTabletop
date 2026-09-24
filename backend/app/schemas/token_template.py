from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.token_template import TokenTemplate


class TokenTemplateUpdate(BaseModel):
    name: str | None = None
    folder_id: str | None = None


class TokenTemplatePublic(BaseModel):
    id: str
    tabletop_id: str
    folder_id: str | None
    name: str
    image_url: str
    created_by: str
    created_at: datetime

    @classmethod
    def from_template(cls, template: "TokenTemplate") -> "TokenTemplatePublic":
        return cls(
            id=str(template.id),
            tabletop_id=template.tabletop_id,
            folder_id=template.folder_id,
            name=template.name,
            image_url=f"/uploads/{template.image_path}",
            created_by=template.created_by,
            created_at=template.created_at,
        )
