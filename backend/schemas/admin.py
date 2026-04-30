from pydantic import BaseModel

class AdminCreate(BaseModel):
    username: str
    password: str

class AdminOut(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True