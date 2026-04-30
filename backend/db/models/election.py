from sqlalchemy import Column, Integer, String, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from enum import Enum
from db.base import Base

class ElectionStatus(Enum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"
    stopped = "stopped" 

class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(SqlEnum(ElectionStatus), default=ElectionStatus.upcoming)

    results_status = Column(String, default="pending")   # pending, declared
    publish_date = Column(DateTime, nullable=True)

    candidates = relationship("Candidate", back_populates="election")
    votes = relationship("Vote", back_populates="election")