import jwt
from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.models.folder import Folder
from app.models.map_note import MapNote
from app.models.scene import Scene
from app.models.sheet import Sheet
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.token_template import TokenTemplate
from app.models.user import User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado"
        ) from exc

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado")
    return user


async def get_tabletop_or_404(tabletop_id: str) -> Tabletop:
    tabletop = await Tabletop.get(PydanticObjectId(tabletop_id))
    if not tabletop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa não encontrada")
    return tabletop


def require_member(tabletop: Tabletop, user: User) -> None:
    if not any(m.user_id == str(user.id) for m in tabletop.members):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não faz parte desta mesa")


def is_dm(tabletop: Tabletop, user: User) -> bool:
    return any(m.user_id == str(user.id) and m.role == "dm" for m in tabletop.members)


def require_dm(tabletop: Tabletop, user: User) -> None:
    if not is_dm(tabletop, user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Apenas o mestre (DM) pode fazer isso"
        )


async def get_sheet_or_404(tabletop_id: str, sheet_id: str) -> Sheet:
    sheet = await Sheet.get(PydanticObjectId(sheet_id))
    if not sheet or sheet.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ficha não encontrada")
    return sheet


def require_sheet_editor(tabletop: Tabletop, sheet: Sheet, user: User) -> None:
    if is_dm(tabletop, user):
        return
    if sheet.kind == "character" and sheet.owner_id == str(user.id):
        return
    raise HTTPException(
        status.HTTP_403_FORBIDDEN, "Você não tem permissão para editar esta ficha"
    )


async def get_token_or_404(tabletop_id: str, token_id: str) -> Token:
    token = await Token.get(PydanticObjectId(token_id))
    if not token or token.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Token não encontrado")
    return token


def require_token_editor(tabletop: Tabletop, token: Token, user: User) -> None:
    if is_dm(tabletop, user) or token.created_by == str(user.id):
        return
    raise HTTPException(
        status.HTTP_403_FORBIDDEN, "Você não tem permissão para mover/remover este token"
    )


async def get_folder_or_404(tabletop_id: str, folder_id: str) -> Folder:
    folder = await Folder.get(PydanticObjectId(folder_id))
    if not folder or folder.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pasta não encontrada")
    return folder


def require_folder_editor(tabletop: Tabletop, folder: Folder, user: User) -> None:
    if folder.kind == "scene":
        require_dm(tabletop, user)
        return
    if is_dm(tabletop, user) or folder.created_by == str(user.id):
        return
    raise HTTPException(
        status.HTTP_403_FORBIDDEN, "Você não tem permissão para editar esta pasta"
    )


async def get_scene_or_404(tabletop_id: str, scene_id: str) -> Scene:
    scene = await Scene.get(PydanticObjectId(scene_id))
    if not scene or scene.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cena não encontrada")
    return scene


async def get_token_template_or_404(tabletop_id: str, template_id: str) -> TokenTemplate:
    template = await TokenTemplate.get(PydanticObjectId(template_id))
    if not template or template.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Token de biblioteca não encontrado")
    return template


def require_template_editor(tabletop: Tabletop, template: TokenTemplate, user: User) -> None:
    if is_dm(tabletop, user) or template.created_by == str(user.id):
        return
    raise HTTPException(
        status.HTTP_403_FORBIDDEN, "Você não tem permissão para editar este token de biblioteca"
    )


async def get_map_note_or_404(tabletop_id: str, note_id: str) -> MapNote:
    note = await MapNote.get(PydanticObjectId(note_id))
    if not note or note.tabletop_id != tabletop_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anotação não encontrada")
    return note
