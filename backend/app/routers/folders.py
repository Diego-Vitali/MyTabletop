from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import (
    get_current_user,
    get_folder_or_404,
    get_tabletop_or_404,
    require_dm,
    require_folder_editor,
    require_member,
)
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderPublic, FolderUpdate
from app.services.folder_service import create_folder, delete_folder, list_folders, update_folder

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/folders", tags=["folders"])


@router.post("", response_model=FolderPublic, status_code=201)
async def create(
    tabletop_id: str, data: FolderCreate, user: User = Depends(get_current_user)
) -> FolderPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    if data.kind == "scene":
        require_dm(tabletop, user)
    folder = await create_folder(tabletop, user, data.kind, data.name)
    return FolderPublic.from_folder(folder)


@router.get("", response_model=list[FolderPublic])
async def list_all(
    tabletop_id: str, kind: str | None = None, user: User = Depends(get_current_user)
) -> list[FolderPublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    if kind is not None and kind not in ("scene", "token"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "kind inválido")
    folders = await list_folders(tabletop_id, kind)  # type: ignore[arg-type]
    return [FolderPublic.from_folder(f) for f in folders]


@router.patch("/{folder_id}", response_model=FolderPublic)
async def update(
    tabletop_id: str, folder_id: str, data: FolderUpdate, user: User = Depends(get_current_user)
) -> FolderPublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    folder = await get_folder_or_404(tabletop_id, folder_id)
    require_folder_editor(tabletop, folder, user)
    folder = await update_folder(folder, data)
    return FolderPublic.from_folder(folder)


@router.delete("/{folder_id}", status_code=204)
async def delete(tabletop_id: str, folder_id: str, user: User = Depends(get_current_user)) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    folder = await get_folder_or_404(tabletop_id, folder_id)
    require_folder_editor(tabletop, folder, user)
    await delete_folder(folder)
