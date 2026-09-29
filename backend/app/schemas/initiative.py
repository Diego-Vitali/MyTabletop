from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.models.initiative import InitiativeEntry

if TYPE_CHECKING:
    from app.models.initiative import Initiative


class InitiativeEntryCreate(BaseModel):
    token_id: str | None = None
    label: str
    value: float
    hp_current: int | None = None
    hp_max: int | None = None


class InitiativePublic(BaseModel):
    id: str
    tabletop_id: str
    entries: list[InitiativeEntry]
    current_index: int
    round: int
    is_active: bool
    auto_sort: bool

    @classmethod
    def from_initiative(cls, initiative: "Initiative") -> "InitiativePublic":
        return cls(
            id=str(initiative.id),
            tabletop_id=initiative.tabletop_id,
            entries=initiative.entries,
            current_index=initiative.current_index,
            round=initiative.round,
            is_active=initiative.is_active,
            auto_sort=initiative.auto_sort,
        )
