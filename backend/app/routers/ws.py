import jwt
from beanie import PydanticObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.deps import is_dm
from app.core.security import decode_access_token
from app.core.ws_manager import manager
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.user import User
from app.services.vision_service import is_token_visible_to_players

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

    await manager.connect(tabletop_id, websocket, str(user.id), is_dm(tabletop, user))
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "token_move_live":
                live_token_id = data.get("token_id")
                message = {
                    "type": "token_moved",
                    "token_id": live_token_id,
                    "x": data.get("x"),
                    "y": data.get("y"),
                }
                scene = await Scene.find_one(
                    Scene.tabletop_id == tabletop_id, Scene.is_active == True  # noqa: E712
                )
                if scene and scene.dynamic_lighting_enabled:
                    await manager.send_to_dm(tabletop_id, message, exclude=websocket)
                    if await is_token_visible_to_players(str(scene.id), live_token_id):
                        await manager.send_to_players(tabletop_id, message, exclude=websocket)
                else:
                    await manager.broadcast(tabletop_id, message, exclude=websocket)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(tabletop_id, websocket)
