from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class ConnInfo:
    user_id: str
    is_dm: bool


class ConnectionManager:
    """One room per tabletop. In-process/in-memory — fine for a single
    backend instance (the local self-hosted deploy this project targets);
    would need a pub/sub backend to scale beyond one process.

    Each connection is tagged with the connecting user's id and DM-ness
    (resolved once at connect time in routers/ws.py) so callers can address
    just the DM, just the players, or a specific user — not only
    broadcast-to-everyone — which is what lets vision_service (see fatia I)
    actually withhold data from a player's socket instead of only hiding it
    in the UI."""

    def __init__(self) -> None:
        self._rooms: dict[str, dict[WebSocket, ConnInfo]] = {}

    async def connect(self, tabletop_id: str, websocket: WebSocket, user_id: str, is_dm: bool) -> None:
        await websocket.accept()
        self._rooms.setdefault(tabletop_id, {})[websocket] = ConnInfo(user_id=user_id, is_dm=is_dm)

    def disconnect(self, tabletop_id: str, websocket: WebSocket) -> None:
        room = self._rooms.get(tabletop_id)
        if not room:
            return
        room.pop(websocket, None)
        if not room:
            self._rooms.pop(tabletop_id, None)

    async def _send(self, tabletop_id: str, websocket: WebSocket, message: dict) -> None:
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(tabletop_id, websocket)

    async def broadcast(self, tabletop_id: str, message: dict, exclude: WebSocket | None = None) -> None:
        for ws in list(self._rooms.get(tabletop_id, {})):
            if ws is exclude:
                continue
            await self._send(tabletop_id, ws, message)

    async def send_to_dm(self, tabletop_id: str, message: dict, exclude: WebSocket | None = None) -> None:
        for ws, info in list(self._rooms.get(tabletop_id, {}).items()):
            if info.is_dm and ws is not exclude:
                await self._send(tabletop_id, ws, message)

    async def send_to_players(
        self, tabletop_id: str, message: dict, exclude: WebSocket | None = None
    ) -> None:
        for ws, info in list(self._rooms.get(tabletop_id, {}).items()):
            if not info.is_dm and ws is not exclude:
                await self._send(tabletop_id, ws, message)

    async def send_to_user(self, tabletop_id: str, user_id: str, message: dict) -> None:
        for ws, info in list(self._rooms.get(tabletop_id, {}).items()):
            if info.user_id == user_id:
                await self._send(tabletop_id, ws, message)


manager = ConnectionManager()
