import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.models.tabletop import Tabletop
from app.models.user import User


@pytest_asyncio.fixture
async def client():
    mock_client = AsyncMongoMockClient()
    await init_beanie(
        database=mock_client["mytabletop_test"],
        document_models=[User, Tabletop],
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    return _headers
