from datetime import datetime

from pydantic import BaseModel


class ScenePublic(BaseModel):
    id: str
    tabletop_id: str
    name: str
    image_url: str
    created_by: str
    created_at: datetime
