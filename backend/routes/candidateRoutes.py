from fastapi import APIRouter, Depends, Form, UploadFile, File
from sqlalchemy.orm import Session
from schemas.candidate import CandidateOut
from typing import List, Optional
from db.session import get_db
from controllers.candidateController import (
    apply_as_candidate,
    get_candidates_for_election,
    get_pending_candidates,
    get_all_candidates,
    approve_candidate,
    reject_candidate,
    reset_candidate_to_pending,
    delete_candidate,
    get_my_applications,
    edit_candidate,
)
from core.middleware import require_role

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post("/apply", response_model=CandidateOut)
def apply(
    election_id: int = Form(...),
    post: str = Form(...),
    photo: UploadFile = File(None),
    resume: UploadFile = File(None),
    db: Session = Depends(get_db),
    user=Depends(require_role("student"))
):
    return apply_as_candidate(db, user["id"], election_id, post, photo, resume)


@router.get("/all", response_model=List[CandidateOut])   # ✅ BEFORE /{election_id}
def list_all_candidates(db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return get_all_candidates(db)


@router.get("/pending", response_model=List[CandidateOut])   # ✅ BEFORE /{election_id}
def list_pending(db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return get_pending_candidates(db)


@router.get("/my", response_model=List[CandidateOut])    # ✅ BEFORE /{election_id}
def my_applications(
    db: Session = Depends(get_db),
    user=Depends(require_role("student"))
):
    return get_my_applications(db, user["id"])


@router.get("/{election_id}", response_model=List[CandidateOut])
def get_candidates(election_id: int, db: Session = Depends(get_db)):
    return get_candidates_for_election(db, election_id)


@router.put("/{candidate_id}/approve", response_model=CandidateOut)
def approve(candidate_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return approve_candidate(db, candidate_id)


@router.put("/{candidate_id}/reject", response_model=CandidateOut)
def reject(candidate_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return reject_candidate(db, candidate_id)


@router.put("/{candidate_id}/reset", response_model=CandidateOut)
def reset_to_pending(candidate_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return reset_candidate_to_pending(db, candidate_id)


@router.put("/{candidate_id}/edit", response_model=CandidateOut)
def edit_application(
    candidate_id: int,
    post: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    resume: UploadFile = File(None),
    db: Session = Depends(get_db),
    user=Depends(require_role("student")),
):
    return edit_candidate(db, candidate_id, user["id"], post, photo, resume)


@router.delete("/{candidate_id}")
def remove_candidate(candidate_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return delete_candidate(db, candidate_id)