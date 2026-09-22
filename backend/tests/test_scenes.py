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


def _fake_image(name: str = "map.png", content_type: str = "image/png"):
    return {"image": (name, b"\x89PNG\r\n\x1a\n" + b"fake-bytes", content_type)}


@pytest.mark.asyncio
async def test_dm_can_upload_scene_and_it_becomes_active(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/scenes",
        data={"name": "Floresta Sombria"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Floresta Sombria"
    assert body["image_url"].startswith("/uploads/")

    tt_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert tt_resp.json()["active_scene_id"] == body["id"]


@pytest.mark.asyncio
async def test_player_cannot_upload_scene(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    player_token, _ = await _register(client, "player2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player2", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.post(
        f"/tabletops/{tabletop_id}/scenes",
        data={"name": "Mapa"},
        files=_fake_image(),
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_rejects_unsupported_file_type(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/scenes",
        data={"name": "Mapa"},
        files=_fake_image(name="map.pdf", content_type="application/pdf"),
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_dm_can_switch_active_scene(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    first = await client.post(
        f"/tabletops/{tabletop_id}/scenes",
        data={"name": "Cena 1"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    second = await client.post(
        f"/tabletops/{tabletop_id}/scenes",
        data={"name": "Cena 2"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    first_id = first.json()["id"]
    second_id = second.json()["id"]

    # uploading "Cena 2" made it active; switch back to "Cena 1"
    activate_resp = await client.patch(
        f"/tabletops/{tabletop_id}/scenes/{first_id}/activate",
        headers=auth_headers(dm_token),
    )
    assert activate_resp.status_code == 200
    assert activate_resp.json()["active_scene_id"] == first_id

    list_resp = await client.get(
        f"/tabletops/{tabletop_id}/scenes", headers=auth_headers(dm_token)
    )
    assert {s["id"] for s in list_resp.json()} == {first_id, second_id}


@pytest.mark.asyncio
async def test_deleting_active_scene_clears_it(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    tabletop_id = await _create_tabletop(client, dm_token)

    created = await client.post(
        f"/tabletops/{tabletop_id}/scenes",
        data={"name": "Cena"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    scene_id = created.json()["id"]

    del_resp = await client.delete(
        f"/tabletops/{tabletop_id}/scenes/{scene_id}", headers=auth_headers(dm_token)
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["active_scene_id"] is None
