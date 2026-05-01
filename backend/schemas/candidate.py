from pydantic import BaseModel
from typing import Optional

class CandidateBase(BaseModel):
    post: str
    resume_path: Optional[str] = None
    photo_path: Optional[str] = None

class CandidateCreate(CandidateBase):
    student_id: int
    election_id: int

class CandidateOut(CandidateBase):
    id: int
    status: str

    class Config:
        from_attributes = True  