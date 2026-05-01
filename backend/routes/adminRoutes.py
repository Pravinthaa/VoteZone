from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from controllers import adminController
from db.session import get_db
from schemas.admin import AdminCreate, AdminLogin

router = APIRouter(prefix="/admins", tags=["Admins"])

@router.post("/register")
def register_admin(data: AdminCreate, db: Session = Depends(get_db)):
    return adminController.register_admin(data, db)

@router.post("/login")
def login_admin(data: AdminLogin, db: Session = Depends(get_db)):
    return adminController.login_admin(data, db)
