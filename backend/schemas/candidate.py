from pydantic import BaseModel,model_validator
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
    student_id: int
    election_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def extract_student_fields(cls, v: any):
        if hasattr(v, 'student') and v.student:
            v.__dict__['student_name'] = v.student.name
            v.__dict__['student_email'] = v.student.email
        return v


    class Config:
        from_attributes = True  