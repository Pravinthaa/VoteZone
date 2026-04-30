from pydantic import BaseModel


class AdminBase(BaseModel):
    username: str

class AdminCreate(AdminBase):
    password: str

class AdminOut(AdminBase):
    id: int
    class Config:
        orm_mode = True