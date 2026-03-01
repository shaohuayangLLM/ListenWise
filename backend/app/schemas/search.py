from datetime import datetime

from pydantic import BaseModel

from app.models.base import RecordingStatus, SceneType


class SearchResultItem(BaseModel):
    id: int
    title: str
    scene_type: SceneType
    status: RecordingStatus
    duration: int
    created_at: datetime
    snippet: str  # matched text snippet

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    items: list[SearchResultItem]
    total: int
    query: str
