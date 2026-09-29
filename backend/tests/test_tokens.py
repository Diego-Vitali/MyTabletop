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
async def test_partial_patch_resizes_and_flips_a_token(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "0", "y": "0"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    token_id = created.json()["id"]
    assert created.json()["size"] is None
    assert created.json()["flipped_x"] is False

    resized = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"size": 96},
        headers=auth_headers(dm_token),
    )
    assert resized.status_code == 200
    assert resized.json()["size"] == 96
    # x/y untouched by a resize-only patch
    assert resized.json()["x"] == 0

    flipped = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"flipped_x": True},
        headers=auth_headers(dm_token),
    )
    assert flipped.status_code == 200
    assert flipped.json()["flipped_x"] is True
    assert flipped.json()["size"] == 96


@pytest.mark.asyncio
async def test_place_token_from_template(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    tabletop_id = await _create_tabletop(client, dm_token)

    template = await client.post(
        f"/tabletops/{tabletop_id}/vtt/token-templates",
        data={"name": "Goblin"},
        files={"image": ("goblin.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers=auth_headers(dm_token),
    )
    template_id = template.json()["id"]

    placed = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens/from-template/{template_id}",
        json={"x": 10, "y": 20},
        headers=auth_headers(dm_token),
    )
    assert placed.status_code == 201
    body = placed.json()
    assert body["template_id"] == template_id
    assert body["image_url"] == template.json()["image_url"]
    assert body["x"] == 10
    assert body["y"] == 20


@pytest.mark.asyncio
async def test_patch_sets_rotation_name_hp_and_size_category(client, auth_headers):
    dm_token, _ = await _register(client, "dm6")
    tabletop_id = await _create_tabletop(client, dm_token)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "0", "y": "0"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    token_id = created.json()["id"]
    assert created.json()["rotation"] == 0
    assert created.json()["name"] is None

    updated = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={
            "rotation": 45.5,
            "name": "Goblin batedor",
            "hp_current": 7,
            "hp_max": 12,
            "size_category": "grande",
            "emits_light": True,
            "light_radius": 150,
        },
        headers=auth_headers(dm_token),
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["rotation"] == 45.5
    assert body["name"] == "Goblin batedor"
    assert body["hp_current"] == 7
    assert body["hp_max"] == 12
    assert body["size_category"] == "grande"
    assert body["emits_light"] is True
    assert body["light_radius"] == 150

    cleared = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"name": None, "hp_current": None},
        headers=auth_headers(dm_token),
    )
    assert cleared.json()["name"] is None
    assert cleared.json()["hp_current"] is None
    # untouched fields survive an unrelated patch
    assert cleared.json()["hp_max"] == 12


@pytest.mark.asyncio
async def test_duplicate_token_offsets_position_and_copies_fields(client, auth_headers):
    dm_token, _ = await _register(client, "dm7")
    tabletop_id = await _create_tabletop(client, dm_token)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens",
        data={"x": "100", "y": "100"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    token_id = created.json()["id"]
    await client.patch(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}",
        json={"name": "Cultista", "size": 80},
        headers=auth_headers(dm_token),
    )

    dup = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}/duplicate",
        headers=auth_headers(dm_token),
    )
    assert dup.status_code == 201
    body = dup.json()
    assert body["id"] != token_id
    assert body["name"] == "Cultista"
    assert body["size"] == 80
    assert body["x"] == 124
    assert body["y"] == 124

    listing = await client.get(f"/tabletops/{tabletop_id}/vtt/tokens", headers=auth_headers(dm_token))
    assert len(listing.json()) == 2


@pytest.mark.asyncio
async def test_only_owner_or_dm_can_duplicate_a_token(client, auth_headers):
    dm_token, _ = await _register(client, "dm8")
    p1_token, _ = await _register(client, "player8a")
    p2_token, _ = await _register(client, "player8b")
    tabletop_id = await _create_tabletop(client, dm_token)
    for username in ("player8a", "player8b"):
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

    forbidden = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}/duplicate",
        headers=auth_headers(p2_token),
    )
    assert forbidden.status_code == 403

    allowed = await client.post(
        f"/tabletops/{tabletop_id}/vtt/tokens/{token_id}/duplicate",
        headers=auth_headers(p1_token),
    )
    assert allowed.status_code == 201
