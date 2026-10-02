from fastapi import UploadFile

from app.core.storage import save_image
from app.core.ws_manager import manager
from app.models.tabletop import Tabletop
from app.models.token_template import TokenTemplate
from app.models.user import User
from app.schemas.token_template import TokenTemplatePublic, TokenTemplateUpdate


async def create_template(
    tabletop: Tabletop, creator: User, name: str, folder_id: str | None, image: UploadFile
) -> TokenTemplate:
    image_path = await save_image(image, category="tokens")
    template = TokenTemplate(
        tabletop_id=str(tabletop.id),
        folder_id=folder_id,
        name=name,
        image_path=image_path,
        created_by=str(creator.id),
    )
    await template.insert()

    await manager.send_to_user(
        str(tabletop.id),
        str(creator.id),
        {
            "type": "template_created",
            "template": TokenTemplatePublic.from_template(template).model_dump(mode="json"),
        },
    )
    return template


async def list_templates(tabletop_id: str, creator_id: str) -> list[TokenTemplate]:
    """Each member's token library is their own — see the VTT architecture
    note in CLAUDE.md. Scenes stay tabletop-wide (every client needs the
    active scene's grid/fog/lighting config), but templates are personal."""
    return await TokenTemplate.find(
        TokenTemplate.tabletop_id == tabletop_id, TokenTemplate.created_by == creator_id
    ).to_list()


async def update_template(template: TokenTemplate, data: TokenTemplateUpdate) -> TokenTemplate:
    if data.name is not None:
        template.name = data.name
    if "folder_id" in data.model_fields_set:
        template.folder_id = data.folder_id
    await template.save()

    await manager.send_to_user(
        template.tabletop_id,
        template.created_by,
        {
            "type": "template_updated",
            "template": TokenTemplatePublic.from_template(template).model_dump(mode="json"),
        },
    )
    return template


async def delete_template(template: TokenTemplate) -> None:
    tabletop_id = template.tabletop_id
    template_id = str(template.id)
    owner_id = template.created_by
    await template.delete()

    await manager.send_to_user(tabletop_id, owner_id, {"type": "template_deleted", "template_id": template_id})
