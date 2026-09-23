import pytest

from app.core.ws_manager import ConnectionManager


class FakeWebSocket:
    def __init__(self):
        self.accepted = False
        self.sent: list[dict] = []
        self.fail_next_send = False

    async def accept(self):
        self.accepted = True

    async def send_json(self, message: dict):
        if self.fail_next_send:
            raise RuntimeError("connection closed")
        self.sent.append(message)


@pytest.mark.asyncio
async def test_broadcast_reaches_only_the_target_room():
    manager = ConnectionManager()
    a1, a2, b1 = FakeWebSocket(), FakeWebSocket(), FakeWebSocket()

    await manager.connect("tabletop-a", a1)
    await manager.connect("tabletop-a", a2)
    await manager.connect("tabletop-b", b1)

    await manager.broadcast("tabletop-a", {"type": "background_updated"})

    assert a1.sent == [{"type": "background_updated"}]
    assert a2.sent == [{"type": "background_updated"}]
    assert b1.sent == []


@pytest.mark.asyncio
async def test_disconnect_removes_from_room():
    manager = ConnectionManager()
    ws = FakeWebSocket()
    await manager.connect("tabletop-a", ws)

    manager.disconnect("tabletop-a", ws)
    await manager.broadcast("tabletop-a", {"type": "background_updated"})

    assert ws.sent == []


@pytest.mark.asyncio
async def test_broadcast_to_unknown_room_is_a_noop():
    manager = ConnectionManager()
    await manager.broadcast("does-not-exist", {"type": "background_updated"})  # should not raise


@pytest.mark.asyncio
async def test_broadcast_drops_dead_connections():
    manager = ConnectionManager()
    dead, alive = FakeWebSocket(), FakeWebSocket()
    dead.fail_next_send = True
    await manager.connect("tabletop-a", dead)
    await manager.connect("tabletop-a", alive)

    await manager.broadcast("tabletop-a", {"type": "background_updated"})
    assert alive.sent == [{"type": "background_updated"}]

    # a second broadcast should no longer try to reach the dropped connection
    await manager.broadcast("tabletop-a", {"type": "background_updated"})
    assert alive.sent == [{"type": "background_updated"}, {"type": "background_updated"}]
