from fastapi import UploadFile

from app.core.storage import save_image
from app.core.ws_manager import manager
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.user import User
from app.schemas.token import TokenPublic


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


async def list_tokens(tabletop_id: str) -> list[Token]:
    return await Token.find(Token.tabletop_id == tabletop_id).to_list()


async def move_token(token: Token, x: float, y: float) -> Token:
    token.x = x
    token.y = y
    await token.save()

    await manager.broadcast(
        token.tabletop_id,
        {"type": "token_moved", "token_id": str(token.id), "x": x, "y": y},
    )
    return token


async def delete_token(token: Token) -> None:
    tabletop_id = token.tabletop_id
    token_id = str(token.id)
    await token.delete()

    await manager.broadcast(tabletop_id, {"type": "token_deleted", "token_id": token_id})
