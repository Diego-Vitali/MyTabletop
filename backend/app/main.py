from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models.tabletop import Tabletop
from app.models.user import User
from app.routers import auth, tabletops, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncMongoClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[User, Tabletop],
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

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tabletops.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
