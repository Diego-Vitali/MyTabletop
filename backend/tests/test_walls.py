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


async def _create_scene(client, token: str, tabletop_id: str):
    return await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": "Mapa"},
        files={"image": ("map.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )


@pytest.mark.asyncio
async def test_no_walls_without_active_scene(client, auth_headers):
    dm_token, _ = await _register(client, "wall1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.get(f"/tabletops/{tabletop_id}/vtt/walls", headers=auth_headers(dm_token))
    assert resp.json() == []


@pytest.mark.asyncio
async def test_dm_can_create_and_delete_wall(client, auth_headers):
    dm_token, _ = await _register(client, "wall2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await _create_scene(client, dm_token, tabletop_id)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/walls",
        json={"x1": 0, "y1": 0, "x2": 100, "y2": 0},
        headers=auth_headers(dm_token),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["blocks_light"] is True

    listed = await client.get(f"/tabletops/{tabletop_id}/vtt/walls", headers=auth_headers(dm_token))
    assert len(listed.json()) == 1

    deleted = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/walls/{body['id']}", headers=auth_headers(dm_token)
    )
    assert deleted.status_code == 204

    listed_after = await client.get(f"/tabletops/{tabletop_id}/vtt/walls", headers=auth_headers(dm_token))
    assert listed_after.json() == []


@pytest.mark.asyncio
async def test_player_cannot_create_or_delete_walls(client, auth_headers):
    dm_token, _ = await _register(client, "wall3")
    player_token, _ = await _register(client, "wallplayer3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "wallplayer3", "role": "player"},
        headers=auth_headers(dm_token),
    )
    await _create_scene(client, dm_token, tabletop_id)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/walls",
        json={"x1": 0, "y1": 0, "x2": 10, "y2": 10},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/walls",
        json={"x1": 0, "y1": 0, "x2": 10, "y2": 10},
        headers=auth_headers(dm_token),
    )
    forbidden_delete = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/walls/{created.json()['id']}", headers=auth_headers(player_token)
    )
    assert forbidden_delete.status_code == 403


@pytest.mark.asyncio
async def test_scene_dynamic_lighting_toggle_defaults_off(client, auth_headers):
    dm_token, _ = await _register(client, "wall4")
    tabletop_id = await _create_tabletop(client, dm_token)
    scene = (await _create_scene(client, dm_token, tabletop_id)).json()
    assert scene["dynamic_lighting_enabled"] is False

    updated = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/scenes/{scene['id']}",
        json={"dynamic_lighting_enabled": True},
        headers=auth_headers(dm_token),
    )
    assert updated.json()["dynamic_lighting_enabled"] is True
