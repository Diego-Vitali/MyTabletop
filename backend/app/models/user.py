from datetime import datetime, timezone
from typing import Literal

import pymongo
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class UserTabletopEntry(BaseModel):
    tabletop_id: str
    role: Literal["dm", "player"]
    joined_at: datetime


class User(Document):
    username: Indexed(str, unique=True)
    email: Indexed(str, unique=True)
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tabletops: list[UserTabletopEntry] = []

    class Settings:
        name = "users"
        indexes = [
            pymongo.IndexModel("username", unique=True),
            pymongo.IndexModel("email", unique=True),
        ]
