from pydantic import BaseModel
from datetime import datetime

class ElectionCreate(BaseModel):
    name: str
    start_time: datetime
    end_time: datetime

class ElectionOut(BaseModel):
    id: int
    name: str
    start_time: datetime
    end_time: datetime

    class Config:
        orm_mode = True