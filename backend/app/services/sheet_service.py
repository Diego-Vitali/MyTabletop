from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.deps import is_dm
from app.models.rulebooks import attribute_keys
from app.models.sheet import Sheet
from app.models.tabletop import Tabletop
from app.models.user import User
from app.schemas.sheet import SheetCreate, SheetUpdate


def _validate_attributes(rulebook: str, attributes: dict[str, int]) -> dict[str, int]:
    allowed = attribute_keys(rulebook)
    unknown = set(attributes) - allowed
    if unknown:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Atributo(s) inválido(s) para este livro de regras: {', '.join(sorted(unknown))}",
        )
    return {key: attributes.get(key, 0) for key in allowed}


async def create_sheet(tabletop: Tabletop, creator: User, data: SheetCreate) -> Sheet:
    if data.kind == "npc" and not is_dm(tabletop, creator):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Apenas o mestre (DM) pode criar fichas de NPC"
        )

    sheet = Sheet(
        tabletop_id=str(tabletop.id),
        owner_id=str(creator.id),
        kind=data.kind,
        rulebook=tabletop.rulebook,
        name=data.name,
        attributes=_validate_attributes(tabletop.rulebook, data.attributes),
    )
    await sheet.insert()
    return sheet


async def list_tabletop_sheets(tabletop_id: str) -> list[Sheet]:
    return await Sheet.find(Sheet.tabletop_id == tabletop_id).to_list()


async def update_sheet(sheet: Sheet, data: SheetUpdate) -> Sheet:
    if data.name is not None:
        sheet.name = data.name
    if data.attributes is not None:
        sheet.attributes = _validate_attributes(sheet.rulebook, data.attributes)
    sheet.updated_at = datetime.now(timezone.utc)
    await sheet.save()
    return sheet


async def delete_sheet(sheet: Sheet) -> None:
    await sheet.delete()
