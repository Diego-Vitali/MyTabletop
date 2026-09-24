from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.deps import (
    get_current_user,
    get_tabletop_or_404,
    get_token_template_or_404,
    require_member,
    require_template_editor,
)
from app.models.user import User
from app.schemas.token_template import TokenTemplatePublic, TokenTemplateUpdate
from app.services.token_template_service import (
    create_template,
    delete_template,
    list_templates,
    update_template,
)

router = APIRouter(prefix="/tabletops/{tabletop_id}/vtt/token-templates", tags=["token-templates"])


@router.post("", response_model=TokenTemplatePublic, status_code=201)
async def create(
    tabletop_id: str,
    name: str = Form(...),
    folder_id: str | None = Form(None),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> TokenTemplatePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    template = await create_template(tabletop, user, name, folder_id, image)
    return TokenTemplatePublic.from_template(template)


@router.get("", response_model=list[TokenTemplatePublic])
async def list_all(
    tabletop_id: str, user: User = Depends(get_current_user)
) -> list[TokenTemplatePublic]:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    templates = await list_templates(tabletop_id)
    return [TokenTemplatePublic.from_template(t) for t in templates]


@router.patch("/{template_id}", response_model=TokenTemplatePublic)
async def update(
    tabletop_id: str,
    template_id: str,
    data: TokenTemplateUpdate,
    user: User = Depends(get_current_user),
) -> TokenTemplatePublic:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    template = await get_token_template_or_404(tabletop_id, template_id)
    require_template_editor(tabletop, template, user)
    template = await update_template(template, data)
    return TokenTemplatePublic.from_template(template)


@router.delete("/{template_id}", status_code=204)
async def delete(
    tabletop_id: str, template_id: str, user: User = Depends(get_current_user)
) -> None:
    tabletop = await get_tabletop_or_404(tabletop_id)
    require_member(tabletop, user)
    template = await get_token_template_or_404(tabletop_id, template_id)
    require_template_editor(tabletop, template, user)
    await delete_template(template)
