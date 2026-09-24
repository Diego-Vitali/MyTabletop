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


def _fake_image(content_type: str = "image/png"):
    return {"image": ("map.png", b"\x89PNG\r\n\x1a\n" + b"fake-bytes", content_type)}


async def _create_scene(client, token: str, tabletop_id: str, name: str = "Mapa"):
    return await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": name},
        files=_fake_image(),
        headers={"Authorization": f"Bearer {token}"},
    )


@pytest.mark.asyncio
async def test_new_tabletop_has_no_background(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert resp.json()["background_image_url"] is None


@pytest.mark.asyncio
async def test_first_scene_created_becomes_active(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await _create_scene(client, dm_token, tabletop_id)
    assert resp.status_code == 201
    body = resp.json()
    assert body["is_active"] is True
    assert body["image_url"].startswith("/uploads/")

    get_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert get_resp.json()["background_image_url"] == body["image_url"]


@pytest.mark.asyncio
async def test_player_cannot_create_scene(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    player_token, _ = await _register(client, "player3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player3", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await _create_scene(client, player_token, tabletop_id)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_rejects_unsupported_file_type(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": "Mapa"},
        files=_fake_image(content_type="application/pdf"),
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_second_scene_stays_inactive_until_activated(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    tabletop_id = await _create_tabletop(client, dm_token)

    first = await _create_scene(client, dm_token, tabletop_id, "Primeiro mapa")
    second = await _create_scene(client, dm_token, tabletop_id, "Segundo mapa")
    assert second.json()["is_active"] is False

    get_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert get_resp.json()["background_image_url"] == first.json()["image_url"]

    activated = await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes/{second.json()['id']}/activate",
        headers=auth_headers(dm_token),
    )
    assert activated.status_code == 200
    assert activated.json()["is_active"] is True

    get_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert get_resp.json()["background_image_url"] == second.json()["image_url"]

    scenes = await client.get(f"/tabletops/{tabletop_id}/vtt/scenes", headers=auth_headers(dm_token))
    active_flags = {s["id"]: s["is_active"] for s in scenes.json()}
    assert active_flags[first.json()["id"]] is False
    assert active_flags[second.json()["id"]] is True


@pytest.mark.asyncio
async def test_activating_a_scene_archives_the_outgoing_one_to_history(client, auth_headers):
    dm_token, dm_id = await _register(client, "dm6")
    tabletop_id = await _create_tabletop(client, dm_token)

    first = await _create_scene(client, dm_token, tabletop_id, "Primeiro mapa")
    await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "12", "y": "34"},
        files={"image": ("t.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers=auth_headers(dm_token),
    )

    empty_history = await client.get(
        f"/tabletops/{tabletop_id}/vtt/history", headers=auth_headers(dm_token)
    )
    assert empty_history.json() == []

    second = await _create_scene(client, dm_token, tabletop_id, "Segundo mapa")
    await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes/{second.json()['id']}/activate",
        headers=auth_headers(dm_token),
    )

    history = await client.get(
        f"/tabletops/{tabletop_id}/vtt/history", headers=auth_headers(dm_token)
    )
    entries = history.json()
    assert len(entries) == 1
    assert entries[0]["image_url"] == first.json()["image_url"]
    assert entries[0]["replaced_by"] == dm_id
    assert len(entries[0]["tokens"]) == 1
    assert entries[0]["tokens"][0]["x"] == 12

    live_tokens = await client.get(
        f"/tabletops/{tabletop_id}/vtt/tokens", headers=auth_headers(dm_token)
    )
    assert live_tokens.json() == []


@pytest.mark.asyncio
async def test_deleting_the_active_scene_clears_the_live_map(client, auth_headers):
    dm_token, _ = await _register(client, "dm7")
    tabletop_id = await _create_tabletop(client, dm_token)

    scene = await _create_scene(client, dm_token, tabletop_id)
    await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "1", "y": "1"},
        files={"image": ("t.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers=auth_headers(dm_token),
    )

    delete = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/scenes/{scene.json()['id']}", headers=auth_headers(dm_token)
    )
    assert delete.status_code == 204

    get_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert get_resp.json()["background_image_url"] is None

    live_tokens = await client.get(
        f"/tabletops/{tabletop_id}/vtt/tokens", headers=auth_headers(dm_token)
    )
    assert live_tokens.json() == []
