from datetime import datetime

from pydantic import BaseModel

from app.models.user import UserTabletopEntry


class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime
    tabletops: list[UserTabletopEntry]
