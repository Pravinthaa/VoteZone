from pydantic import BaseModel

class VoteCreate(BaseModel):
    student_id: int
    candidate_id: int
    election_id: int

class VoteOut(BaseModel):
    id: int
    student_id: int
    candidate_id: int
    election_id: int

    class Config:
        orm_mode = True