from sqlalchemy import Column, Integer, String, Float
from db.base import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name= Column(String, index=True)
    year = Column(Integer)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)