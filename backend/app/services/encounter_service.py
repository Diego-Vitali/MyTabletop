import math

from beanie import PydanticObjectId

from app.core.ws_manager import manager
from app.models.encounter import Encounter, EncounterMember
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.token_template import TokenTemplate
from app.models.user import User
from app.schemas.encounter import EncounterPublic
from app.services.token_service import create_token_from_template

SPACING = 80.0


def _grid_offsets(count: int) -> list[tuple[float, float]]:
    if count == 0:
        return []
    cols = math.ceil(math.sqrt(count))
    rows = math.ceil(count / cols)
    offsets = []
    for i in range(count):
        col = i % cols
        row = i // cols
        offsets.append(((col - (cols - 1) / 2) * SPACING, (row - (rows - 1) / 2) * SPACING))
    return offsets


async def create_encounter(
    tabletop: Tabletop, creator: User, name: str, template_ids: list[str]
) -> Encounter:
    offsets = _grid_offsets(len(template_ids))
    encounter = Encounter(
        tabletop_id=str(tabletop.id),
        name=name,
        members=[
            EncounterMember(template_id=tid, offset_x=ox, offset_y=oy)
            for tid, (ox, oy) in zip(template_ids, offsets)
        ],
        created_by=str(creator.id),
    )
    await encounter.insert()

    await manager.broadcast(
        str(tabletop.id),
        {
            "type": "encounter_created",
            "encounter": EncounterPublic.from_encounter(encounter).model_dump(mode="json"),
        },
    )
    return encounter


async def list_encounters(tabletop_id: str) -> list[Encounter]:
    return await Encounter.find(Encounter.tabletop_id == tabletop_id).to_list()


async def delete_encounter(encounter: Encounter) -> None:
    tabletop_id = encounter.tabletop_id
    encounter_id = str(encounter.id)
    await encounter.delete()

    await manager.broadcast(tabletop_id, {"type": "encounter_deleted", "encounter_id": encounter_id})


async def spawn_encounter(
    tabletop: Tabletop, encounter: Encounter, user: User, center_x: float, center_y: float
) -> list[Token]:
    """Creates one live Token per encounter member at (center ± its saved
    offset). Members whose template was since deleted are skipped rather
    than failing the whole spawn."""
    spawned: list[Token] = []
    for member in encounter.members:
        template = await TokenTemplate.get(PydanticObjectId(member.template_id))
        if not template or template.tabletop_id != str(tabletop.id):
            continue
        token = await create_token_from_template(
            tabletop, template, user, center_x + member.offset_x, center_y + member.offset_y
        )
        spawned.append(token)
    return spawned
