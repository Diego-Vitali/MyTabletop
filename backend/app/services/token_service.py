from fastapi import UploadFile

from app.core.storage import save_image
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.token_template import TokenTemplate
from app.models.user import User
from app.schemas.token import TokenPublic, TokenUpdate
from app.services.vision_service import gated_token_broadcast


async def create_token(tabletop: Tabletop, creator: User, x: float, y: float, image: UploadFile) -> Token:
    image_path = await save_image(image, category="tokens")
    token = Token(
        tabletop_id=str(tabletop.id),
        image_path=image_path,
        x=x,
        y=y,
        created_by=str(creator.id),
    )
    await token.insert()

    await gated_token_broadcast(
        tabletop, {"type": "token_added", "token": TokenPublic.from_token(token).model_dump(mode="json")}
    )
    return token


async def create_token_from_template(
    tabletop: Tabletop, template: TokenTemplate, creator: User, x: float, y: float
) -> Token:
    token = Token(
        tabletop_id=str(tabletop.id),
        image_path=template.image_path,
        x=x,
        y=y,
        template_id=str(template.id),
        created_by=str(creator.id),
    )
    await token.insert()

    await gated_token_broadcast(
        tabletop, {"type": "token_added", "token": TokenPublic.from_token(token).model_dump(mode="json")}
    )
    return token


async def list_tokens(tabletop_id: str) -> list[Token]:
    return await Token.find(Token.tabletop_id == tabletop_id).to_list()


async def update_token(tabletop: Tabletop, token: Token, data: TokenUpdate) -> Token:
    if data.x is not None:
        token.x = data.x
    if data.y is not None:
        token.y = data.y
    if data.size is not None:
        token.size = data.size
    if data.rotation is not None:
        token.rotation = data.rotation
    if data.flipped_x is not None:
        token.flipped_x = data.flipped_x
    if data.emits_light is not None:
        token.emits_light = data.emits_light
    fields_set = data.model_fields_set
    if "name" in fields_set:
        token.name = data.name
    if "hp_current" in fields_set:
        token.hp_current = data.hp_current
    if "hp_max" in fields_set:
        token.hp_max = data.hp_max
    if "size_category" in fields_set:
        token.size_category = data.size_category
    if "light_radius" in fields_set:
        token.light_radius = data.light_radius
    await token.save()

    await gated_token_broadcast(
        tabletop, {"type": "token_updated", "token": TokenPublic.from_token(token).model_dump(mode="json")}
    )
    return token


async def duplicate_token(tabletop: Tabletop, token: Token, creator: User, offset: float = 24.0) -> Token:
    """Clones a live token with a small positional offset — used by the
    canvas's Ctrl+D / "Duplicate" action."""
    clone = Token(
        tabletop_id=token.tabletop_id,
        image_path=token.image_path,
        x=token.x + offset,
        y=token.y + offset,
        size=token.size,
        rotation=token.rotation,
        flipped_x=token.flipped_x,
        name=token.name,
        hp_current=token.hp_current,
        hp_max=token.hp_max,
        size_category=token.size_category,
        emits_light=token.emits_light,
        light_radius=token.light_radius,
        template_id=token.template_id,
        created_by=str(creator.id),
    )
    await clone.insert()

    await gated_token_broadcast(
        tabletop, {"type": "token_added", "token": TokenPublic.from_token(clone).model_dump(mode="json")}
    )
    return clone


async def delete_token(tabletop: Tabletop, token: Token) -> None:
    token_id = str(token.id)
    await token.delete()

    await gated_token_broadcast(tabletop, {"type": "token_deleted", "token_id": token_id})
