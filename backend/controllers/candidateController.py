from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, UploadFile
from db.models.candidate import Candidate, CandidateStatus
from db.models.election import Election, ElectionStatus
from db.models.student import Student
from typing import Optional
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
        Candidate.election_id == election_id,
        Candidate.post == post
    ).first()
    if existing_candidate:
        raise HTTPException(status_code=400, detail="You have already applied for this post in this election")

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
    try:
        db.commit()
        db.refresh(new_candidate)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already applied for this post in this election")

    return new_candidate


def get_candidates_for_election(db: Session, election_id: int):
    return db.query(Candidate).filter(
        Candidate.election_id == election_id,
        Candidate.status == CandidateStatus.approved
    ).all()


def get_pending_candidates(db: Session):
    return (
        db.query(Candidate)
        .filter(Candidate.status == CandidateStatus.pending)
        .options(joinedload(Candidate.student))
        .all()
    )


def get_all_candidates(db: Session):
    return (
        db.query(Candidate)
        .options(joinedload(Candidate.student))
        .order_by(Candidate.id.asc())
        .all()
    )


def approve_candidate(db: Session, candidate_id: int):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.status = CandidateStatus.approved
    db.commit()
    db.refresh(candidate)
    return candidate


def reject_candidate(db: Session, candidate_id: int):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.status = CandidateStatus.rejected
    db.commit()
    db.refresh(candidate)
    return candidate


def reset_candidate_to_pending(db: Session, candidate_id: int):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status != CandidateStatus.rejected:
        raise HTTPException(status_code=400, detail="Only rejected candidates can be reset to pending")
    candidate.status = CandidateStatus.pending
    db.commit()
    db.refresh(candidate)
    return candidate


def delete_candidate(db: Session, candidate_id: int):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if candidate.photo_path:
        try:
            os.remove(os.path.join(UPLOAD_DIR, candidate.photo_path))
        except FileNotFoundError:
            pass
    if candidate.resume_path:
        try:
            os.remove(os.path.join(UPLOAD_DIR, candidate.resume_path))
        except FileNotFoundError:
            pass

    db.delete(candidate)
    db.commit()
    return {"message": f"Candidate {candidate_id} deleted successfully"}


def get_my_applications(db: Session, student_id: int):
    """Return all candidate applications belonging to the logged-in student."""
    return (
        db.query(Candidate)
        .filter(Candidate.student_id == student_id)
        .order_by(Candidate.id.desc())
        .all()
    )


def edit_candidate(
    db: Session,
    candidate_id: int,
    student_id: int,
    post: Optional[str],
    photo: Optional[UploadFile],
    resume: Optional[UploadFile],
):
    """Edit a pending candidate application. Blocked if status is not pending."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.student_id != student_id:
        raise HTTPException(status_code=403, detail="Not your application")
    if candidate.status != CandidateStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending applications can be edited")

    # Update post if provided and different
    if post and post != candidate.post:
        election = db.query(Election).filter(Election.id == candidate.election_id).first()
        if election and election.posts and post not in election.posts:
            raise HTTPException(status_code=400, detail="Invalid post for this election")
        candidate.post = post

    # Replace photo if a new file was uploaded
    if photo and photo.filename:
        if not photo.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Photo must be an image file")
        if candidate.photo_path:
            try:
                os.remove(os.path.join(UPLOAD_DIR, candidate.photo_path))
            except FileNotFoundError:
                pass
        _, ext = os.path.splitext(photo.filename)
        new_name = f"{uuid.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, new_name), "wb") as buf:
            shutil.copyfileobj(photo.file, buf)
        candidate.photo_path = new_name

    # Replace manifesto if a new file was uploaded
    if resume and resume.filename:
        if resume.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Manifesto must be a PDF file")
        if candidate.resume_path:
            try:
                os.remove(os.path.join(UPLOAD_DIR, candidate.resume_path))
            except FileNotFoundError:
                pass
        _, ext = os.path.splitext(resume.filename)
        new_name = f"{uuid.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, new_name), "wb") as buf:
            shutil.copyfileobj(resume.file, buf)
        candidate.resume_path = new_name

    db.commit()
    db.refresh(candidate)
    return candidate