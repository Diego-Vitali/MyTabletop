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


@pytest.mark.asyncio
async def test_new_tabletop_has_no_background(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert resp.json()["background_image_url"] is None


@pytest.mark.asyncio
async def test_dm_can_set_background(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 200
    assert resp.json()["background_image_url"].startswith("/uploads/")

    get_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert get_resp.json()["background_image_url"] == resp.json()["background_image_url"]


@pytest.mark.asyncio
async def test_player_cannot_set_background(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    player_token, _ = await _register(client, "player3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player3", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(),
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_rejects_unsupported_file_type(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(content_type="application/pdf"),
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_replacing_background_swaps_the_url(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    tabletop_id = await _create_tabletop(client, dm_token)

    first = await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    second = await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    assert first.json()["background_image_url"] != second.json()["background_image_url"]

    get_resp = await client.get(f"/tabletops/{tabletop_id}", headers=auth_headers(dm_token))
    assert get_resp.json()["background_image_url"] == second.json()["background_image_url"]
