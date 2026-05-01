from fastapi import HTTPException
from sqlalchemy.orm import Session
from core.security import hash_password, verify_password, create_access_token
from db.models.admin import Admin
from schemas.admin import AdminCreate, AdminLogin

def register_admin(data: AdminCreate, db: Session):
    existing = db.query(Admin).filter(Admin.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")

    hashed_pw = hash_password(data.password)
    admin = Admin(username=data.username, password_hash=hashed_pw)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"message": "Admin registered successfully"}

def login_admin(data: AdminLogin, db: Session):
    admin = db.query(Admin).filter(Admin.username == data.username).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": admin.username, "role": "admin"})
    return {"access_token": token, "token_type": "bearer"}

