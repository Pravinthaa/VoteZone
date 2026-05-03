from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ElectionBase(BaseModel):
    name: str
    start_time: datetime
    end_time: datetime
    posts: list[str] = []

class ElectionCreate(ElectionBase):
    pass

class ElectionOut(ElectionBase):
    id: int
    status: str
    results_status: str
    publish_date: Optional[datetime]

    class Config:
        from_attributes = True   