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

    await manager.connect("tabletop-a", a1, "u1", False)
    await manager.connect("tabletop-a", a2, "u2", False)
    await manager.connect("tabletop-b", b1, "u3", False)

    await manager.broadcast("tabletop-a", {"type": "background_updated"})

    assert a1.sent == [{"type": "background_updated"}]
    assert a2.sent == [{"type": "background_updated"}]
    assert b1.sent == []


@pytest.mark.asyncio
async def test_disconnect_removes_from_room():
    manager = ConnectionManager()
    ws = FakeWebSocket()
    await manager.connect("tabletop-a", ws, "u1", False)

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
    await manager.connect("tabletop-a", dead, "u1", False)
    await manager.connect("tabletop-a", alive, "u2", False)

    await manager.broadcast("tabletop-a", {"type": "background_updated"})
    assert alive.sent == [{"type": "background_updated"}]

    # a second broadcast should no longer try to reach the dropped connection
    await manager.broadcast("tabletop-a", {"type": "background_updated"})
    assert alive.sent == [{"type": "background_updated"}, {"type": "background_updated"}]


@pytest.mark.asyncio
async def test_send_to_dm_reaches_only_dm_connections():
    manager = ConnectionManager()
    dm, player = FakeWebSocket(), FakeWebSocket()
    await manager.connect("tabletop-a", dm, "dm1", True)
    await manager.connect("tabletop-a", player, "p1", False)

    await manager.send_to_dm("tabletop-a", {"type": "secret"})

    assert dm.sent == [{"type": "secret"}]
    assert player.sent == []


@pytest.mark.asyncio
async def test_send_to_players_reaches_only_non_dm_connections():
    manager = ConnectionManager()
    dm, p1, p2 = FakeWebSocket(), FakeWebSocket(), FakeWebSocket()
    await manager.connect("tabletop-a", dm, "dm1", True)
    await manager.connect("tabletop-a", p1, "p1", False)
    await manager.connect("tabletop-a", p2, "p2", False)

    await manager.send_to_players("tabletop-a", {"type": "vision"})

    assert dm.sent == []
    assert p1.sent == [{"type": "vision"}]
    assert p2.sent == [{"type": "vision"}]


@pytest.mark.asyncio
async def test_send_to_players_respects_exclude():
    manager = ConnectionManager()
    p1, p2 = FakeWebSocket(), FakeWebSocket()
    await manager.connect("tabletop-a", p1, "p1", False)
    await manager.connect("tabletop-a", p2, "p2", False)

    await manager.send_to_players("tabletop-a", {"type": "vision"}, exclude=p1)

    assert p1.sent == []
    assert p2.sent == [{"type": "vision"}]


@pytest.mark.asyncio
async def test_send_to_user_reaches_every_connection_of_that_user():
    manager = ConnectionManager()
    tab1, tab2, other = FakeWebSocket(), FakeWebSocket(), FakeWebSocket()
    await manager.connect("tabletop-a", tab1, "p1", False)
    await manager.connect("tabletop-a", tab2, "p1", False)  # e.g. a second browser tab
    await manager.connect("tabletop-a", other, "p2", False)

    await manager.send_to_user("tabletop-a", "p1", {"type": "whisper"})

    assert tab1.sent == [{"type": "whisper"}]
    assert tab2.sent == [{"type": "whisper"}]
    assert other.sent == []
