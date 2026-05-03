from sqlalchemy.orm import Session
from db.session import engine, SessionLocal
from db.models.student import Student
from core.security import hash_password
from db.base import Base

Base.metadata.create_all(bind=engine)
db = SessionLocal()
if not db.query(Student).filter_by(roll_no="admin").first():
    admin = Student(
        name="Admin User",
        roll_no="admin",
        year=4,
        email="admin@psgtech.ac.in",
        password_hash=hash_password("admin123"),
        is_candidate=False
    )
    db.add(admin)
    db.commit()
db.close()
print("Admin created")
