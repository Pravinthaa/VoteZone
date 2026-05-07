from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from core.security import hash_password, verify_password, create_access_token
from db.models.admin import Admin
from db.models.candidate import Candidate, CandidateStatus
from db.models.election import Election, ElectionStatus
from db.models.vote import Vote
from db.models.student import Student
from schemas.admin import AdminCreate, AdminLogin, ElectionDurationUpdate


# ──────────────────────────────────────────────
#  Auth
# ──────────────────────────────────────────────

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
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": admin.username, "role": "admin"})
    return {"access_token": token, "token_type": "bearer"}


# ──────────────────────────────────────────────
#  Candidate Approval / Rejection
# ──────────────────────────────────────────────

def approve_candidate(candidate_id: int, db: Session):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status == CandidateStatus.approved:
        raise HTTPException(status_code=400, detail="Candidate is already approved")

    candidate.status = CandidateStatus.approved

    # Mark the linked student as a candidate
    student = db.query(Student).filter(Student.id == candidate.student_id).first()
    if student:
        student.is_candidate = True

    db.commit()
    db.refresh(candidate)
    return {"message": f"Candidate {candidate_id} approved successfully"}


def reject_candidate(candidate_id: int, db: Session):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status == CandidateStatus.rejected:
        raise HTTPException(status_code=400, detail="Candidate is already rejected")

    candidate.status = CandidateStatus.rejected

    # Unmark the linked student if they were previously approved
    student = db.query(Student).filter(Student.id == candidate.student_id).first()
    if student:
        student.is_candidate = False

    db.commit()
    db.refresh(candidate)
    return {"message": f"Candidate {candidate_id} rejected"}


# ──────────────────────────────────────────────
#  Election Management
# ──────────────────────────────────────────────

def update_election_duration(election_id: int, data: ElectionDurationUpdate, db: Session):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status == ElectionStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot update a completed election")
    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

    start_time = data.start_time.replace(tzinfo=None) if data.start_time.tzinfo else data.start_time
    end_time = data.end_time.replace(tzinfo=None) if data.end_time.tzinfo else data.end_time

    election.start_time = start_time
    election.end_time = end_time

    # Recalculate status based on updated times
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if now < election.start_time:
        election.status = ElectionStatus.upcoming
    elif election.start_time <= now <= election.end_time:
        election.status = ElectionStatus.active

    db.commit()
    db.refresh(election)
    return {
        "message": "Election duration updated",
        "election_id": election_id,
        "start_time": str(election.start_time),
        "end_time": str(election.end_time),
    }


def stop_election(election_id: int, db: Session):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status in (ElectionStatus.completed, ElectionStatus.stopped):
        raise HTTPException(status_code=400, detail="Election is already stopped/completed")

    election.status = ElectionStatus.stopped
    db.commit()
    db.refresh(election)
    return {"message": f"Election {election_id} has been stopped immediately"}


def force_release_results(election_id: int, db: Session):
    """Force-declare results before the scheduled end time."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.results_status == "declared":
        raise HTTPException(status_code=400, detail="Results already declared")

    election.status = ElectionStatus.completed
    election.results_status = "declared"
    election.publish_date = datetime.utcnow()
    db.commit()
    db.refresh(election)
    return {"message": f"Results for election {election_id} force-released"}


def declare_results(election_id: int, db: Session):
    """Formally declare results after election is completed/stopped."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status not in (ElectionStatus.completed, ElectionStatus.stopped):
        raise HTTPException(
            status_code=400,
            detail="Election must be completed or stopped before declaring results",
        )
    if election.results_status == "declared":
        raise HTTPException(status_code=400, detail="Results already declared")

    election.results_status = "declared"
    election.publish_date = datetime.utcnow()
    db.commit()
    db.refresh(election)
    return {
        "message": f"Results declared for election {election_id}",
        "publish_date": str(election.publish_date),
    }


# ──────────────────────────────────────────────
#  Voter / Non-Voter Lists
# ──────────────────────────────────────────────

def get_voters(election_id: int, db: Session):
    """Return all students who cast at least one vote in this election."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    voter_subq = (
        db.query(Vote.student_id)
        .filter(Vote.election_id == election_id)
        .distinct()
        .subquery()
    )
    voters = db.query(Student).filter(Student.id.in_(voter_subq)).all()
    return [
        {"id": s.id, "name": s.name, "roll_no": s.roll_no, "email": s.email, "year": s.year}
        for s in voters
    ]


def get_non_voters(election_id: int, db: Session):
    """Return all students who have NOT voted in this election."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    voter_subq = (
        db.query(Vote.student_id)
        .filter(Vote.election_id == election_id)
        .distinct()
        .subquery()
    )
    non_voters = db.query(Student).filter(Student.id.notin_(voter_subq)).all()
    return [
        {"id": s.id, "name": s.name, "roll_no": s.roll_no, "email": s.email, "year": s.year}
        for s in non_voters
    ]


# ──────────────────────────────────────────────
#  Live Monitoring — candidate-wise vote counts
# ──────────────────────────────────────────────

def get_live_candidate_counts(election_id: int, db: Session):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    results = (
        db.query(Vote.candidate_id, Vote.post, func.count(Vote.id).label("vote_count"))
        .filter(Vote.election_id == election_id)
        .group_by(Vote.candidate_id, Vote.post)
        .all()
    )

    tally = []
    for candidate_id, post, count in results:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        student = (
            db.query(Student).filter(Student.id == candidate.student_id).first()
            if candidate else None
        )
        tally.append({
            "candidate_name": student.name if student else "Unknown",  # renamed
            "post": post,
            "votes": count,                                             # renamed
        })

    return {"tally": tally}  # drop election_id, frontend doesn't need it
# ──────────────────────────────────────────────
#  Delete
# ──────────────────────────────────────────────

def delete_admin(admin_id: int, db: Session):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    db.delete(admin)
    db.commit()
    return {"message": f"Admin {admin_id} deleted successfully"}
