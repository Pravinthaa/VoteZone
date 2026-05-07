from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from enum import Enum

class CandidateStatus(Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class CandidateBase(BaseModel):
    post: str
    resume_path: Optional[str] = None
    photo_path: Optional[str] = None

class CandidateCreate(CandidateBase):
    student_id: int
    election_id: int

class CandidateOut(BaseModel):
    id: int
    post: str
    resume_path: Optional[str] = None
    photo_path: Optional[str] = None
    status: str
    student_id: int
    election_id: int 
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_student_fields(cls, obj):
        if hasattr(obj, "student") and obj.student:
            obj.__dict__["student_name"] = obj.student.name
            obj.__dict__["student_roll_no"] = obj.student.roll_no
        return obj

    @field_validator("status", mode="before")
    @classmethod
    def status_to_str(cls, v):
        if isinstance(v, CandidateStatus):
            return v.value
        return v

    class Config:
        from_attributes = True