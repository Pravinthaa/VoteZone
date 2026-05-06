from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from controllers import adminController
from db.session import get_db
from schemas.admin import AdminCreate, AdminLogin, ElectionDurationUpdate

router = APIRouter(prefix="/admins", tags=["Admins"])


# ──────────────────────────────────────────────
#  Auth
# ──────────────────────────────────────────────

@router.post("/register", summary="Register a new admin")
def register_admin(data: AdminCreate, db: Session = Depends(get_db)):
    return adminController.register_admin(data, db)


@router.post("/login", summary="Admin login — returns JWT")
def login_admin(data: AdminLogin, db: Session = Depends(get_db)):
    return adminController.login_admin(data, db)


# ──────────────────────────────────────────────
#  Candidate Approval / Rejection
# ──────────────────────────────────────────────

@router.put("/candidates/{id}/approve", summary="Approve a candidate application")
def approve_candidate(id: int, db: Session = Depends(get_db)):
    return adminController.approve_candidate(id, db)


@router.put("/candidates/{id}/reject", summary="Reject a candidate application")
def reject_candidate(id: int, db: Session = Depends(get_db)):
    return adminController.reject_candidate(id, db)


# ──────────────────────────────────────────────
#  Election Management
# ──────────────────────────────────────────────

@router.put("/elections/{id}/duration", summary="Update election start/end time")
def update_election_duration(
    id: int, data: ElectionDurationUpdate, db: Session = Depends(get_db)
):
    return adminController.update_election_duration(id, data, db)


@router.put("/elections/{id}/stop", summary="Immediately stop an active election")
def stop_election(id: int, db: Session = Depends(get_db)):
    return adminController.stop_election(id, db)


@router.put("/elections/{id}/force-release", summary="Force-release results before end time")
def force_release_results(id: int, db: Session = Depends(get_db)):
    return adminController.force_release_results(id, db)


# ──────────────────────────────────────────────
#  Results
# ──────────────────────────────────────────────

@router.put("/results/{election_id}/declare", summary="Formally declare election results")
def declare_results(election_id: int, db: Session = Depends(get_db)):
    return adminController.declare_results(election_id, db)


# ──────────────────────────────────────────────
#  Voter / Non-Voter Lists
# ──────────────────────────────────────────────

@router.get("/elections/{id}/voters", summary="List students who have voted")
def get_voters(id: int, db: Session = Depends(get_db)):
    return adminController.get_voters(id, db)


@router.get("/elections/{id}/non-voters", summary="List students who have NOT voted")
def get_non_voters(id: int, db: Session = Depends(get_db)):
    return adminController.get_non_voters(id, db)

# ──────────────────────────────────────────────
#  Delete
# ──────────────────────────────────────────────

@router.delete("/{admin_id}", summary="Delete an admin")
def delete_admin(admin_id: int, db: Session = Depends(get_db)):
    return adminController.delete_admin(admin_id, db)
