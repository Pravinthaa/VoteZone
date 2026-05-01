from fastapi import HTTPException
from sqlalchemy.orm import Session
from core.security import hash_password, verify_password, create_access_token
from db.models.student import Student
from schemas.student import StudentCreate, StudentLogin, StudentOut

def register_student(data: StudentCreate, db: Session):
    existing = db.query(Student).filter(Student.roll_no == data.roll_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already exists")

    hashed_pw = hash_password(data.password)
    student = Student(
        name=data.name,
        roll_no=data.roll_no,
        year=data.year,
        email=data.email,
        password_hash=hashed_pw,
        is_candidate=False
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"message": "Student registered successfully"}

def login_student(data: StudentLogin, db: Session):
    student = db.query(Student).filter(Student.roll_no == data.roll_no).first()
    if not student or not verify_password(data.password, student.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": student.roll_no, "role": "student"})
    return {"access_token": token, "token_type": "bearer"}

def get_student(id: int, db: Session):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

def get_all_students(db: Session):
    students = db.query(Student).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found")
    return students
