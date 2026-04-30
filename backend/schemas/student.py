from pydantic import BaseModel

class StudentCreate(BaseModel):
    email: str
    password: str
    name: str
    year: int

class StudentOut(BaseModel):
    id: int
    email: str
    name: str
    year: int

    class Config:
        orm_mode = True