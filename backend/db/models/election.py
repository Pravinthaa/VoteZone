
from sqlalchemy import Column, Integer, String, DateTime, Enum as SqlEnum, ARRAY, Text  
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
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(SqlEnum(ElectionStatus), default=ElectionStatus.upcoming)
    posts = Column(ARRAY(Text), default=list)


    results_status = Column(String, default="pending")   # pending, declared
    publish_date = Column(DateTime(timezone=True), nullable=True)

    candidates = relationship("Candidate", back_populates="election",cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="election")