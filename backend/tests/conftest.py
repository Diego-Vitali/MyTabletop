import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.models.sheet import Sheet
from app.models.tabletop import Tabletop
from app.models.user import User


@pytest.fixture(autouse=True)
def isolated_uploads_dir(tmp_path, monkeypatch):
    """Image uploads go to a throwaway temp dir instead of backend/uploads/."""
    import app.core.storage as storage

    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)


@pytest_asyncio.fixture
async def client():
    mock_client = AsyncMongoMockClient()
    await init_beanie(
        database=mock_client["mytabletop_test"],
        document_models=[User, Tabletop, Sheet],
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    return _headers
