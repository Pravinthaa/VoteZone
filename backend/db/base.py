
from sqlalchemy.orm import declarative_base

Base = declarative_base()


from db.models.student import Student
from db.models.candidate import Candidate
from db.models.election import Election
from db.models.vote import Vote
from db.models.admin import Admin