from pydantic import BaseModel, EmailStr
from typing import Optional

class StudentBase(BaseModel):
    name: str
    roll_no: str
    year: int
    email: EmailStr

class StudentCreate(StudentBase):
    password: str

class StudentOut(StudentBase):
    id: int
    is_candidate: bool
    class Config:
        orm_mode = True