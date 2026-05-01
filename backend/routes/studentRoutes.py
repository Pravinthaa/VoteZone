from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from controllers import studentController
from db.session import get_db
from schemas.student import StudentCreate, StudentLogin, StudentOut
from core.middleware import get_current_user, require_role


router = APIRouter(prefix="/students", tags=["Students"])

@router.post("/register")
def register_student(data: StudentCreate, db: Session = Depends(get_db)):
    return studentController.register_student(data, db)

@router.post("/login")
def login_student(data: StudentLogin, db: Session = Depends(get_db)):
    return studentController.login_student(data, db)

# Admin-only: Fetch all students
@router.get("/all", response_model=list[StudentOut])
def get_all_students(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    return studentController.get_all_students(db)

# Student or Admin: Fetch single student
@router.get("/{id}", response_model=StudentOut)
def get_student_profile(id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user["role"] == "student" and user["id"] != id:
        raise HTTPException(status_code=403, detail="Not authorized to view other students")
    return studentController.get_student(id, db)