import pytest

from app.core.ws_manager import manager as ws_manager


class FakeWebSocket:
    def __init__(self):
        self.sent: list[dict] = []

    async def accept(self):
        pass

    async def send_json(self, message: dict):
        self.sent.append(message)


async def _register(client, username: str) -> tuple[str, str]:
    resp = await client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "supersecret",
        },
    )
    token = resp.json()["access_token"]
    me = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    return token, me.json()["id"]


async def _create_tabletop(client, dm_token: str) -> str:
    resp = await client.post(
        "/tabletops",
        json={"name": "Mesa de Teste", "rulebook": "ordem_paranormal_classico"},
        headers={"Authorization": f"Bearer {dm_token}"},
    )
    return resp.json()["id"]


async def _create_scene(client, token: str, tabletop_id: str):
    return await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": "Mapa"},
        files={"image": ("map.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )


def _fake_image():
    return {"image": ("t.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")}


def _entered_ids(sent: list[dict]) -> set[str]:
    return {m["token"]["id"] for m in sent if m["type"] in ("token_added", "token_entered_view")}


@pytest.mark.asyncio
async def test_player_socket_never_receives_a_token_outside_party_light(client, auth_headers):
    dm_token, dm_id = await _register(client, "visdm1")
    player_token, player_id = await _register(client, "visplayer1")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "visplayer1", "role": "player"},
        headers=auth_headers(dm_token),
    )
    scene = (await _create_scene(client, dm_token, tabletop_id)).json()
    await client.patch(
        f"/tabletops/{tabletop_id}/vtt/scenes/{scene['id']}",
        json={"dynamic_lighting_enabled": True},
        headers=auth_headers(dm_token),
    )

    dm_ws, player_ws = FakeWebSocket(), FakeWebSocket()
    await ws_manager.connect(tabletop_id, dm_ws, dm_id, True)
    await ws_manager.connect(tabletop_id, player_ws, player_id, False)
    try:
        # Player places their own token — no one emits light yet, so it
        # isn't visible to the player's own vision system either.
        placed = await client.post(
            f"/tabletops/{tabletop_id}/vtt/tokens",
            data={"x": "0", "y": "0"},
            files=_fake_image(),
            headers=auth_headers(player_token),
        )
        pc_id = placed.json()["id"]
        assert pc_id in [m["token"]["id"] for m in dm_ws.sent if m["type"] == "token_added"]
        assert pc_id not in _entered_ids(player_ws.sent)

        # Turning it into a light source makes it (self-)visible to the player.
        await client.patch(
            f"/tabletops/{tabletop_id}/vtt/tokens/{pc_id}",
            json={"emits_light": True, "light_radius": 100},
            headers=auth_headers(player_token),
        )
        assert pc_id in _entered_ids(player_ws.sent)

        # DM places an NPC far outside that light's radius.
        far_npc = await client.post(
            f"/tabletops/{tabletop_id}/vtt/tokens",
            data={"x": "5000", "y": "5000"},
            files=_fake_image(),
            headers=auth_headers(dm_token),
        )
        npc_id = far_npc.json()["id"]

        assert npc_id in [m["token"]["id"] for m in dm_ws.sent if m["type"] == "token_added"]
        assert npc_id not in _entered_ids(player_ws.sent)
    finally:
        ws_manager.disconnect(tabletop_id, dm_ws)
        ws_manager.disconnect(tabletop_id, player_ws)


@pytest.mark.asyncio
async def test_wall_blocks_light_even_within_radius(client, auth_headers):
    dm_token, dm_id = await _register(client, "visdm2")
    player_token, player_id = await _register(client, "visplayer2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "visplayer2", "role": "player"},
        headers=auth_headers(dm_token),
    )
    scene = (await _create_scene(client, dm_token, tabletop_id)).json()
    await client.patch(
        f"/tabletops/{tabletop_id}/vtt/scenes/{scene['id']}",
        json={"dynamic_lighting_enabled": True},
        headers=auth_headers(dm_token),
    )
    # A wall directly between the light and where the NPC will stand.
    await client.post(
        f"/tabletops/{tabletop_id}/vtt/walls",
        json={"x1": 50, "y1": -50, "x2": 50, "y2": 50},
        headers=auth_headers(dm_token),
    )

    placed = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "0", "y": "0"},
        files=_fake_image(),
        headers=auth_headers(player_token),
    )
    pc_id = placed.json()["id"]
    await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{pc_id}",
        json={"emits_light": True, "light_radius": 200},
        headers=auth_headers(player_token),
    )

    dm_ws, player_ws = FakeWebSocket(), FakeWebSocket()
    await ws_manager.connect(tabletop_id, dm_ws, dm_id, True)
    await ws_manager.connect(tabletop_id, player_ws, player_id, False)
    try:
        # Well within the 200px radius, but behind the wall at x=50.
        behind_wall = await client.post(
            f"/tabletops/{tabletop_id}/vtt/tokens",
            data={"x": "100", "y": "0"},
            files=_fake_image(),
            headers=auth_headers(dm_token),
        )
        hidden_id = behind_wall.json()["id"]
        assert hidden_id not in _entered_ids(player_ws.sent)

        # Deleting the wall should reveal it on the next mutation.
        walls = await client.get(f"/tabletops/{tabletop_id}/vtt/walls", headers=auth_headers(dm_token))
        wall_id = walls.json()[0]["id"]
        await client.delete(f"/tabletops/{tabletop_id}/vtt/walls/{wall_id}", headers=auth_headers(dm_token))
        assert hidden_id in _entered_ids(player_ws.sent)
    finally:
        ws_manager.disconnect(tabletop_id, dm_ws)
        ws_manager.disconnect(tabletop_id, player_ws)


@pytest.mark.asyncio
async def test_dynamic_lighting_disabled_broadcasts_to_everyone_as_before(client, auth_headers):
    dm_token, dm_id = await _register(client, "visdm3")
    player_token, player_id = await _register(client, "visplayer3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "visplayer3", "role": "player"},
        headers=auth_headers(dm_token),
    )
    await _create_scene(client, dm_token, tabletop_id)  # dynamic_lighting_enabled stays False

    dm_ws, player_ws = FakeWebSocket(), FakeWebSocket()
    await ws_manager.connect(tabletop_id, dm_ws, dm_id, True)
    await ws_manager.connect(tabletop_id, player_ws, player_id, False)
    try:
        created = await client.post(
            f"/tabletops/{tabletop_id}/vtt/tokens",
            data={"x": "5000", "y": "5000"},
            files=_fake_image(),
            headers=auth_headers(dm_token),
        )
        token_id = created.json()["id"]
        assert token_id in [m["token"]["id"] for m in dm_ws.sent if m["type"] == "token_added"]
        assert token_id in [m["token"]["id"] for m in player_ws.sent if m["type"] == "token_added"]
    finally:
        ws_manager.disconnect(tabletop_id, dm_ws)
        ws_manager.disconnect(tabletop_id, player_ws)
