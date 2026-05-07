from pydantic import BaseModel, EmailStr, field_validator
from typing import Annotated
from pydantic import StringConstraints

# Roll number must match YY + 1–2 letters + NNN
RollNoType = Annotated[str, StringConstraints(pattern=r'^[0-9]{2}[a-zA-Z]{1,2}[0-9]{3}$')]

class StudentBase(BaseModel):
    name: str
    roll_no: RollNoType
    year: int
    email: EmailStr

    
    @field_validator("email")
    def validate_email(cls, v, info):
        roll_no = info.data.get("roll_no")   # ✅ use info.data instead of values.get
        if roll_no:
            expected_email = f"{roll_no}@psgtech.ac.in"
            if v != expected_email:
                raise ValueError(f"Email must be of format {expected_email}")
        return v

class StudentCreate(StudentBase):
    password: str

class StudentLogin(BaseModel):
    roll_no: str
    password: str

class StudentOut(StudentBase):
    id: int
    is_candidate: bool

    class Config:
        from_attributes = True   # ✅ Pydantic v2 replacement for orm_mode