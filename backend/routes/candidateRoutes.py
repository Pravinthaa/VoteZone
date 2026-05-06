from fastapi import APIRouter, Depends, Form, UploadFile, File
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.candidate import CandidateOut
from controllers.candidateController import apply_as_candidate, get_candidates_for_election, get_pending_candidates, approve_candidate,delete_candidate
from core.middleware import require_role
from typing import List

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.put("/{candidate_id}/approve", response_model=CandidateOut)
def approve(candidate_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    return approve_candidate(db, candidate_id)

@router.post("/apply", response_model=CandidateOut)
def apply(
    election_id: int = Form(...),
    post: str = Form(...),
    photo: UploadFile = File(None),
    resume: UploadFile = File(None),
    db: Session = Depends(get_db),
    user=Depends(require_role("student"))
):
    student_id = user["id"]
    return apply_as_candidate(db, student_id, election_id, post, photo, resume)

@router.get("/{election_id}", response_model=List[CandidateOut])
def get_candidates(election_id: int, db: Session = Depends(get_db)):
    return get_candidates_for_election(db, election_id)

@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db), user=Depends (require_role("admin"))):
    return delete_candidate(db, candidate_id)   