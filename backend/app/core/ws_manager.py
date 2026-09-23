from fastapi import WebSocket


class ConnectionManager:
    """One room per tabletop, broadcast-only. In-process/in-memory — fine for
    a single backend instance (the local self-hosted deploy this project
    targets); would need a pub/sub backend to scale beyond one process."""

    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = {}

    async def connect(self, tabletop_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms.setdefault(tabletop_id, set()).add(websocket)

    def disconnect(self, tabletop_id: str, websocket: WebSocket) -> None:
        room = self._rooms.get(tabletop_id)
        if not room:
            return
        room.discard(websocket)
        if not room:
            self._rooms.pop(tabletop_id, None)

    async def broadcast(self, tabletop_id: str, message: dict) -> None:
        for ws in list(self._rooms.get(tabletop_id, ())):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(tabletop_id, ws)


manager = ConnectionManager()
