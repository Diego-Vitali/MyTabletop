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
async def test_member_can_create_and_list_template(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/token-templates",
        data={"name": "Goblin"},
        files=_fake_image(),
        headers=auth_headers(dm_token),
    )
    assert created.status_code == 201
    assert created.json()["name"] == "Goblin"

    listing = await client.get(
        f"/tabletops/{tabletop_id}/vtt/token-templates", headers=auth_headers(dm_token)
    )
    assert len(listing.json()) == 1


@pytest.mark.asyncio
async def test_only_dm_or_creator_can_delete_template(client, auth_headers):
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
        f"/tabletops/{tabletop_id}/vtt/token-templates",
        data={"name": "Goblin"},
        files=_fake_image(),
        headers=auth_headers(p1_token),
    )
    template_id = created.json()["id"]

    other_delete = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/token-templates/{template_id}", headers=auth_headers(p2_token)
    )
    assert other_delete.status_code == 403

    dm_delete = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/token-templates/{template_id}", headers=auth_headers(dm_token)
    )
    assert dm_delete.status_code == 204
