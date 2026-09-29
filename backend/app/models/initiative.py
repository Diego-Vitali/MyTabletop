from beanie import Document
from pydantic import BaseModel


class InitiativeEntry(BaseModel):
    id: str
    token_id: str | None = None  # links back to a live Token, if any (purely informational)
    label: str
    value: float
    hp_current: int | None = None
    hp_max: int | None = None


class Initiative(Document):
    """One document per tabletop — the DM's turn tracker. Created lazily on
    first use (see initiative_service.get_or_create)."""

    tabletop_id: str
    entries: list[InitiativeEntry] = []
    current_index: int = -1
    round: int = 0
    is_active: bool = False
    auto_sort: bool = True

    class Settings:
        name = "initiatives"
