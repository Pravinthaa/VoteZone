from pydantic import BaseModel

class CandidateCreate(BaseModel):
    student_id: int
    position: str

class CandidateOut(BaseModel):
    id: int
    student_id: int
    position: str

    class Config:
        orm_mode = True