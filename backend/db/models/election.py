from sqlalchemy import Column, Integer, String, DateTime
from db.base import Base

class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)