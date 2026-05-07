from sqlalchemy import Column, Integer, ForeignKey, DateTime
import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy import UniqueConstraint
from db.base import Base

class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    election_id = Column(Integer, ForeignKey("elections.id"))
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"))
    post = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="votes")
    election = relationship("Election", back_populates="votes")
    candidate = relationship("Candidate")

    __table_args__ = (
        UniqueConstraint("student_id", "election_id", "post", name="unique_vote_per_post"),
    )
