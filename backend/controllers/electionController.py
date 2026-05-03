from sqlalchemy.orm import Session
from fastapi import HTTPException
from db.models.election import Election, ElectionStatus
from schemas.election import ElectionCreate
from datetime import datetime

def create_election(db: Session, election_in: ElectionCreate):
    if election_in.end_time <= election_in.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    now = datetime.utcnow()
    status = ElectionStatus.upcoming
    if election_in.start_time <= now < election_in.end_time:
        status = ElectionStatus.active
    elif now >= election_in.end_time:
        status = ElectionStatus.completed

    db_election = Election(
        name=election_in.name,
        start_time=election_in.start_time,
        end_time=election_in.end_time,
        posts=election_in.posts,
        status=status,
    )
    db.add(db_election)
    db.commit()
    db.refresh(db_election)
    return db_election

def get_election(db: Session, election_id: int):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election

def get_election_status(db: Session, election_id: int):
    election = get_election(db, election_id)
    return {"id": election.id, "status": election.status.value}
