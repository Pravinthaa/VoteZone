from pydantic import BaseModel
from datetime import datetime

class VoteBase(BaseModel):
    post: str

class VoteCreate(VoteBase):
    election_id: int
    candidate_id: int

class VoteOut(VoteBase):
    id: int
    election_id: int
    candidate_id: int
    timestamp: datetime

    class Config:
        from_attributes = True   