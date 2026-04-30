from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ElectionBase(BaseModel):
    name: str
    start_time: datetime
    end_time: datetime

class ElectionCreate(ElectionBase):
    pass

class ElectionOut(ElectionBase):
    id: int
    status: str
    results_status: str
    publish_date: Optional[datetime]
    class Config:
        orm_mode = True