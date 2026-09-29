import pytest


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


def _fake_image():
    return {"image": ("map.png", b"\x89PNG\r\n\x1a\n" + b"fake-bytes", "image/png")}


async def _create_scene(client, token: str, tabletop_id: str, name: str = "Mapa"):
    return await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": name},
        files=_fake_image(),
        headers={"Authorization": f"Bearer {token}"},
    )


@pytest.mark.asyncio
async def test_new_scene_has_grid_disabled_by_default(client, auth_headers):
    dm_token, _ = await _register(client, "gdm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await _create_scene(client, dm_token, tabletop_id)
    grid = resp.json()["grid"]
    assert grid["enabled"] is False
    assert grid["type"] == "square"
    assert grid["size"] == 70.0


@pytest.mark.asyncio
async def test_dm_can_configure_grid(client, auth_headers):
    dm_token, _ = await _register(client, "gdm2")
    tabletop_id = await _create_tabletop(client, dm_token)
    scene = (await _create_scene(client, dm_token, tabletop_id)).json()

    resp = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/scenes/{scene['id']}",
        json={
            "grid": {
                "enabled": True,
                "type": "hex",
                "size": 50.0,
                "offset_x": 5.0,
                "offset_y": -5.0,
                "opacity": 0.8,
                "snap_enabled": False,
                "unit_label": "3m",
            }
        },
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 200
    grid = resp.json()["grid"]
    assert grid["enabled"] is True
    assert grid["type"] == "hex"
    assert grid["size"] == 50.0
    assert grid["snap_enabled"] is False
    assert grid["unit_label"] == "3m"

    listed = await client.get(f"/tabletops/{tabletop_id}/vtt/scenes", headers=auth_headers(dm_token))
    assert listed.json()[0]["grid"]["type"] == "hex"


@pytest.mark.asyncio
async def test_player_cannot_configure_grid(client, auth_headers):
    dm_token, _ = await _register(client, "gdm3")
    player_token, _ = await _register(client, "gplayer3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "gplayer3", "role": "player"},
        headers=auth_headers(dm_token),
    )
    scene = (await _create_scene(client, dm_token, tabletop_id)).json()

    resp = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/scenes/{scene['id']}",
        json={"grid": {"enabled": True}},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403
