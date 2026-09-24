from fastapi import UploadFile

from app.core.storage import save_image
from app.core.ws_manager import manager
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.token_template import TokenTemplate
from app.models.user import User
from app.schemas.token import TokenPublic, TokenUpdate


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

    await manager.broadcast(
        str(tabletop.id),
        {"type": "token_added", "token": TokenPublic.from_token(token).model_dump(mode="json")},
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

    await manager.broadcast(
        str(tabletop.id),
        {"type": "token_added", "token": TokenPublic.from_token(token).model_dump(mode="json")},
    )
    return token


async def list_tokens(tabletop_id: str) -> list[Token]:
    return await Token.find(Token.tabletop_id == tabletop_id).to_list()


async def update_token(token: Token, data: TokenUpdate) -> Token:
    if data.x is not None:
        token.x = data.x
    if data.y is not None:
        token.y = data.y
    if data.size is not None:
        token.size = data.size
    if data.flipped_x is not None:
        token.flipped_x = data.flipped_x
    await token.save()

    await manager.broadcast(
        token.tabletop_id,
        {"type": "token_updated", "token": TokenPublic.from_token(token).model_dump(mode="json")},
    )
    return token


async def delete_token(token: Token) -> None:
    tabletop_id = token.tabletop_id
    token_id = str(token.id)
    await token.delete()

    await manager.broadcast(tabletop_id, {"type": "token_deleted", "token_id": token_id})
