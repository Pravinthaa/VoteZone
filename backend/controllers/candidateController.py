from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from db.models.candidate import Candidate, CandidateStatus
from db.models.election import Election, ElectionStatus
import os
import uuid
import shutil

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def apply_as_candidate(db: Session, student_id: int, election_id: int, post: str, photo: UploadFile, resume: UploadFile):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    if election.posts and post not in election.posts:
        raise HTTPException(status_code=400, detail="Invalid post for this election")

    existing_candidate = db.query(Candidate).filter(
        Candidate.student_id == student_id,
        Candidate.election_id == election_id
    ).first()
    if existing_candidate:
        raise HTTPException(status_code=400, detail="You have already applied as a candidate for this election")

    if photo and not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Photo must be an image file")
    
    if resume and resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Manifesto must be a PDF file")

    photo_filename = None
    if photo:
        _, ext = os.path.splitext(photo.filename)
        photo_filename = f"{uuid.uuid4()}{ext}"
        photo_path = os.path.join(UPLOAD_DIR, photo_filename)
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

    resume_filename = None
    if resume:
        _, ext = os.path.splitext(resume.filename)
        resume_filename = f"{uuid.uuid4()}{ext}"
        resume_path = os.path.join(UPLOAD_DIR, resume_filename)
        with open(resume_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)

    new_candidate = Candidate(
        student_id=student_id,
        election_id=election_id,
        post=post,
        photo_path=photo_filename,
        resume_path=resume_filename,
        status=CandidateStatus.pending
    )
    
    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)
    
    return new_candidate

def get_candidates_for_election(db: Session, election_id: int):
    candidates = db.query(Candidate).filter(
        Candidate.election_id == election_id,
        Candidate.status == CandidateStatus.approved
    ).all()
    return candidates

def get_pending_candidates(db: Session):
    return db.query(Candidate).filter(Candidate.status == CandidateStatus.pending).all()

def approve_candidate(db: Session, candidate_id: int):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.status = CandidateStatus.approved
    db.commit()
    db.refresh(candidate)
    return candidate
