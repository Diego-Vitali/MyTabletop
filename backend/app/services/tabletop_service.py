from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.rulebooks import is_valid_rulebook
from app.models.tabletop import Tabletop, TabletopMember
from app.models.user import User, UserTabletopEntry
from app.schemas.tabletop import TabletopCreate


async def create_tabletop(data: TabletopCreate, creator: User) -> Tabletop:
    if not is_valid_rulebook(data.rulebook):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Livro de regras inválido")

    now = datetime.now(timezone.utc)
    tabletop = Tabletop(
        name=data.name,
        created_by=str(creator.id),
        rulebook=data.rulebook,
        members=[
            TabletopMember(
                user_id=str(creator.id), username=creator.username, role="dm", joined_at=now
            )
        ],
    )
    await tabletop.insert()

    creator.tabletops.append(
        UserTabletopEntry(tabletop_id=str(tabletop.id), role="dm", joined_at=now)
    )
    await creator.save()

    return tabletop


async def list_user_tabletops(user: User) -> list[Tabletop]:
    tabletop_ids = [PydanticObjectId(t.tabletop_id) for t in user.tabletops]
    if not tabletop_ids:
        return []
    return await Tabletop.find({"_id": {"$in": tabletop_ids}}).to_list()


async def _find_user(username_or_email: str) -> User:
    user = await User.find_one(
        {"$or": [{"username": username_or_email}, {"email": username_or_email}]}
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    return user


async def add_member(tabletop: Tabletop, username_or_email: str, role: str) -> Tabletop:
    member_user = await _find_user(username_or_email)
    member_id = str(member_user.id)

    if any(m.user_id == member_id for m in tabletop.members):
        raise HTTPException(status.HTTP_409_CONFLICT, "Usuário já faz parte desta mesa")

    now = datetime.now(timezone.utc)
    tabletop.members.append(
        TabletopMember(
            user_id=member_id, username=member_user.username, role=role, joined_at=now
        )
    )
    await tabletop.save()

    member_user.tabletops.append(
        UserTabletopEntry(tabletop_id=str(tabletop.id), role=role, joined_at=now)
    )
    await member_user.save()

    return tabletop


def _count_dms(tabletop: Tabletop) -> int:
    return sum(1 for m in tabletop.members if m.role == "dm")


async def update_member_role(tabletop: Tabletop, user_id: str, new_role: str) -> Tabletop:
    member = next((m for m in tabletop.members if m.user_id == user_id), None)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membro não encontrado nesta mesa")

    if member.role == "dm" and new_role != "dm" and _count_dms(tabletop) <= 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "A mesa precisa ter pelo menos 1 mestre (DM)"
        )

    member.role = new_role
    await tabletop.save()

    target_user = await User.get(PydanticObjectId(user_id))
    if target_user:
        for entry in target_user.tabletops:
            if entry.tabletop_id == str(tabletop.id):
                entry.role = new_role
        await target_user.save()

    return tabletop


async def remove_member(tabletop: Tabletop, user_id: str) -> Tabletop:
    member = next((m for m in tabletop.members if m.user_id == user_id), None)
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membro não encontrado nesta mesa")

    if member.role == "dm" and _count_dms(tabletop) <= 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "A mesa precisa ter pelo menos 1 mestre (DM)"
        )

    tabletop.members = [m for m in tabletop.members if m.user_id != user_id]
    await tabletop.save()

    target_user = await User.get(PydanticObjectId(user_id))
    if target_user:
        target_user.tabletops = [
            e for e in target_user.tabletops if e.tabletop_id != str(tabletop.id)
        ]
        await target_user.save()

    return tabletop
