from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from enum import Enum
from db.base import Base

class CandidateStatus(Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True)
    election_id = Column(Integer, ForeignKey("elections.id"))
    post = Column(String, nullable=False)
    resume_path = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    status = Column(SqlEnum(CandidateStatus), default=CandidateStatus.pending)

    student = relationship("Student", back_populates="candidate_profile")
    election = relationship("Election", back_populates="candidates")