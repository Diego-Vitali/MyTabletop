from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.models.encounter import EncounterMember

if TYPE_CHECKING:
    from app.models.encounter import Encounter


class EncounterCreate(BaseModel):
    name: str
    template_ids: list[str]


class EncounterSpawn(BaseModel):
    x: float
    y: float


class EncounterPublic(BaseModel):
    id: str
    tabletop_id: str
    name: str
    members: list[EncounterMember]
    created_by: str
    created_at: datetime

    @classmethod
    def from_encounter(cls, encounter: "Encounter") -> "EncounterPublic":
        return cls(
            id=str(encounter.id),
            tabletop_id=encounter.tabletop_id,
            name=encounter.name,
            members=encounter.members,
            created_by=encounter.created_by,
            created_at=encounter.created_at,
        )
