from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from controllers import studentController
from db.session import get_db
from schemas.student import StudentCreate, StudentLogin, StudentOut

router = APIRouter(prefix="/students", tags=["Students"])

@router.post("/register")
def register_student(data: StudentCreate, db: Session = Depends(get_db)):
    return studentController.register_student(data, db)

@router.post("/login")
def login_student(data: StudentLogin, db: Session = Depends(get_db)):
    return studentController.login_student(data, db)

@router.get("/{id}", response_model=StudentOut)
def get_student(id: int, db: Session = Depends(get_db)):
    return studentController.get_student(id, db)

@router.get("/", response_model=list[StudentOut])
def get_all_students(db: Session = Depends(get_db)):
    return studentController.get_all_students(db)
