import jwt
from beanie import PydanticObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.core.ws_manager import manager
from app.models.tabletop import Tabletop
from app.models.user import User

router = APIRouter()


@router.websocket("/ws/tabletops/{tabletop_id}")
async def tabletop_ws(websocket: WebSocket, tabletop_id: str) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        user_id = decode_access_token(token)
    except jwt.PyJWTError:
        await websocket.close(code=4001)
        return

    user = await User.get(PydanticObjectId(user_id))
    tabletop = await Tabletop.get(PydanticObjectId(tabletop_id))
    is_member = user and tabletop and any(m.user_id == str(user.id) for m in tabletop.members)
    if not is_member:
        await websocket.close(code=4003)
        return

    await manager.connect(tabletop_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "token_move_live":
                await manager.broadcast(
                    tabletop_id,
                    {
                        "type": "token_moved",
                        "token_id": data.get("token_id"),
                        "x": data.get("x"),
                        "y": data.get("y")
                    },
                    exclude=websocket,
                )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(tabletop_id, websocket)
