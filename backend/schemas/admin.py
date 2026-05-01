from pydantic import BaseModel
from datetime import datetime

class AdminCreate(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminOut(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True   

class ElectionDurationUpdate(BaseModel):
    start_time: datetime
    end_time: datetime