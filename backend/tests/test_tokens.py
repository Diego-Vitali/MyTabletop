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
    return {"image": ("token.png", b"\x89PNG\r\n\x1a\n" + b"fake-bytes", "image/png")}


@pytest.mark.asyncio
async def test_member_can_create_token(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "10.5", "y": "20"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["image_url"].startswith("/uploads/tokens/")
    assert body["x"] == 10.5
    assert body["y"] == 20


@pytest.mark.asyncio
async def test_owner_can_move_own_token_but_not_others(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    p1_token, _ = await _register(client, "player2a")
    p2_token, _ = await _register(client, "player2b")
    tabletop_id = await _create_tabletop(client, dm_token)
    for username in ("player2a", "player2b"):
        await client.post(
            f"/tabletops/{tabletop_id}/members",
            json={"username_or_email": username, "role": "player"},
            headers=auth_headers(dm_token),
        )

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "0", "y": "0"},
        files=_fake_image(),
        headers=auth_headers(p1_token),
    )
    token_id = created.json()["id"]

    own_move = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"x": 5, "y": 5},
        headers=auth_headers(p1_token),
    )
    assert own_move.status_code == 200
    assert own_move.json()["x"] == 5

    other_move = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"x": 99, "y": 99},
        headers=auth_headers(p2_token),
    )
    assert other_move.status_code == 403


@pytest.mark.asyncio
async def test_dm_can_move_and_delete_any_token(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    player_token, _ = await _register(client, "player3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player3", "role": "player"},
        headers=auth_headers(dm_token),
    )
    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "0", "y": "0"},
        files=_fake_image(),
        headers=auth_headers(player_token),
    )
    token_id = created.json()["id"]

    move = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"x": 1, "y": 2},
        headers=auth_headers(dm_token),
    )
    assert move.status_code == 200

    delete = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}", headers=auth_headers(dm_token)
    )
    assert delete.status_code == 204

    listing = await client.get(
        f"/tabletops/{tabletop_id}/vtt/tokens", headers=auth_headers(dm_token)
    )
    assert listing.json() == []


@pytest.mark.asyncio
async def test_replacing_background_archives_tokens_to_history_and_clears_them(
    client, auth_headers
):
    dm_token, dm_id = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    first_map = await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    first_map_url = first_map.json()["background_image_url"]

    await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "12", "y": "34"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )

    # no history yet — nothing has been replaced
    empty_history = await client.get(
        f"/tabletops/{tabletop_id}/vtt/history", headers=auth_headers(dm_token)
    )
    assert empty_history.json() == []

    await client.put(
        f"/tabletops/{tabletop_id}/vtt/background",
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )

    history = await client.get(
        f"/tabletops/{tabletop_id}/vtt/history", headers=auth_headers(dm_token)
    )
    entries = history.json()
    assert len(entries) == 1
    assert entries[0]["image_url"] == first_map_url
    assert entries[0]["replaced_by"] == dm_id
    assert len(entries[0]["tokens"]) == 1
    assert entries[0]["tokens"][0]["x"] == 12
    assert entries[0]["tokens"][0]["y"] == 34

    live_tokens = await client.get(
        f"/tabletops/{tabletop_id}/vtt/tokens", headers=auth_headers(dm_token)
    )
    assert live_tokens.json() == []
