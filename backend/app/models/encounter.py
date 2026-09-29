from datetime import datetime, timezone

from beanie import Document
from pydantic import BaseModel, Field


class EncounterMember(BaseModel):
    template_id: str
    offset_x: float  # relative to the spawn center, computed once at creation
    offset_y: float


class Encounter(Document):
    """A saved group of token-library templates that spawns together (see
    encounter_service.spawn_encounter) — arranged in a grid around wherever
    the DM clicks, mirroring how Atlas VTT's encounter spawning works."""

    tabletop_id: str
    name: str
    members: list[EncounterMember]
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "encounters"
