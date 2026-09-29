import uuid

from app.core.ws_manager import manager
from app.models.initiative import Initiative, InitiativeEntry
from app.schemas.initiative import InitiativeEntryCreate, InitiativePublic


async def get_or_create(tabletop_id: str) -> Initiative:
    initiative = await Initiative.find_one(Initiative.tabletop_id == tabletop_id)
    if initiative is None:
        initiative = Initiative(tabletop_id=tabletop_id)
        await initiative.insert()
    return initiative


def _resort(initiative: Initiative) -> None:
    if not initiative.auto_sort:
        return
    current_id = (
        initiative.entries[initiative.current_index].id
        if 0 <= initiative.current_index < len(initiative.entries)
        else None
    )
    initiative.entries.sort(key=lambda e: e.value, reverse=True)
    if current_id is not None:
        initiative.current_index = next(
            (i for i, e in enumerate(initiative.entries) if e.id == current_id), initiative.current_index
        )


async def _broadcast(initiative: Initiative) -> None:
    await manager.broadcast(
        initiative.tabletop_id,
        {
            "type": "initiative_updated",
            "initiative": InitiativePublic.from_initiative(initiative).model_dump(mode="json"),
        },
    )


async def add_entry(initiative: Initiative, data: InitiativeEntryCreate) -> Initiative:
    initiative.entries.append(
        InitiativeEntry(
            id=str(uuid.uuid4()),
            token_id=data.token_id,
            label=data.label,
            value=data.value,
            hp_current=data.hp_current,
            hp_max=data.hp_max,
        )
    )
    _resort(initiative)
    await initiative.save()
    await _broadcast(initiative)
    return initiative


async def remove_entry(initiative: Initiative, entry_id: str) -> Initiative:
    removed_index = next((i for i, e in enumerate(initiative.entries) if e.id == entry_id), None)
    initiative.entries = [e for e in initiative.entries if e.id != entry_id]
    if removed_index is not None and initiative.current_index > removed_index:
        initiative.current_index -= 1
    if initiative.current_index >= len(initiative.entries):
        initiative.current_index = len(initiative.entries) - 1
    await initiative.save()
    await _broadcast(initiative)
    return initiative


async def start(initiative: Initiative) -> Initiative:
    _resort(initiative)
    initiative.is_active = True
    initiative.round = 1
    initiative.current_index = 0 if initiative.entries else -1
    await initiative.save()
    await _broadcast(initiative)
    return initiative


async def next_turn(initiative: Initiative) -> Initiative:
    if not initiative.entries:
        return initiative
    if initiative.current_index + 1 >= len(initiative.entries):
        initiative.current_index = 0
        initiative.round += 1
    else:
        initiative.current_index += 1
    await initiative.save()
    await _broadcast(initiative)
    return initiative


async def previous_turn(initiative: Initiative) -> Initiative:
    if not initiative.entries:
        return initiative
    if initiative.current_index - 1 < 0:
        initiative.current_index = len(initiative.entries) - 1
        initiative.round = max(1, initiative.round - 1)
    else:
        initiative.current_index -= 1
    await initiative.save()
    await _broadcast(initiative)
    return initiative


async def end(initiative: Initiative) -> Initiative:
    initiative.is_active = False
    initiative.current_index = -1
    initiative.round = 0
    await initiative.save()
    await _broadcast(initiative)
    return initiative
