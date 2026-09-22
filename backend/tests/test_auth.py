import pytest


@pytest.mark.asyncio
async def test_register_returns_token(client):
    resp = await client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "supersecret"},
    )
    assert resp.status_code == 201
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_register_duplicate_username_fails(client):
    payload = {"username": "alice", "email": "alice@example.com", "password": "supersecret"}
    await client.post("/auth/register", json=payload)
    resp = await client.post(
        "/auth/register",
        json={**payload, "email": "other@example.com"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/auth/register",
        json={"username": "bob", "email": "bob@example.com", "password": "supersecret"},
    )
    resp = await client.post(
        "/auth/login", json={"username_or_email": "bob", "password": "supersecret"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password_fails(client):
    await client.post(
        "/auth/register",
        json={"username": "carol", "email": "carol@example.com", "password": "supersecret"},
    )
    resp = await client.post(
        "/auth/login", json={"username_or_email": "carol", "password": "wrong"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_token(client):
    resp = await client.get("/users/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_returns_user(client, auth_headers):
    reg = await client.post(
        "/auth/register",
        json={"username": "dave", "email": "dave@example.com", "password": "supersecret"},
    )
    token = reg.json()["access_token"]
    resp = await client.get("/users/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["username"] == "dave"
