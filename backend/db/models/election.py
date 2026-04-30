from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy import Enum
from db.base import Base

class ElectionStatus(enum.Enum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"

class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(ElectionStatus), default=ElectionStatus.upcoming)

    results_status = Column(String, default="pending")   # pending, declared
    publish_date = Column(DateTime, nullable=True)

    candidates = relationship("Candidate", back_populates="election")
    votes = relationship("Vote", back_populates="election")

