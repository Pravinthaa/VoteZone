from pydantic import BaseModel
from datetime import datetime

class VoteBase(BaseModel):
    post: str

class VoteCreate(VoteBase):
    student_id: int
    election_id: int
    candidate_id: int

class VoteOut(VoteBase):
    id: int
    student_id: int
    election_id: int
    candidate_id: int
    timestamp: datetime
    class Config:
        orm_mode = True