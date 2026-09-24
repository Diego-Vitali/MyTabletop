from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.core.storage import UPLOAD_DIR
from app.models.folder import Folder
from app.models.map_history import MapHistoryEntry
from app.models.map_note import MapNote
from app.models.scene import Scene
from app.models.sheet import Sheet
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.token_template import TokenTemplate
from app.models.user import User
from app.routers import auth, folders, map_notes, sheets, tabletops, token_templates, tokens, users, vtt, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncMongoClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[
            User,
            Tabletop,
            Sheet,
            Token,
            MapHistoryEntry,
            Folder,
            Scene,
            TokenTemplate,
            MapNote,
        ],
    )
    yield
    await client.close()


app = FastAPI(title="MyTabletop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tabletops.router)
app.include_router(sheets.router)
app.include_router(vtt.router)
app.include_router(folders.router)
app.include_router(token_templates.router)
app.include_router(tokens.router)
app.include_router(map_notes.router)
app.include_router(ws.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
