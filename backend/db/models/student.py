from sqlalchemy import Column, Integer, String, Float,CheckConstraint
from sqlalchemy import Boolean
from sqlalchemy.orm import relationship

from db.base import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name= Column(String, index=True)
    roll_no = Column(String, unique=True, index=True)
    year = Column(Integer, CheckConstraint('year >= 1 AND year <= 4'), nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_candidate = Column(Boolean, default=False)

    votes = relationship("Vote", back_populates="student")
    candidate_profile = relationship("Candidate", back_populates="student", uselist=False)
