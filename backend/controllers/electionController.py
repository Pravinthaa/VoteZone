from sqlalchemy.orm import Session
from fastapi import HTTPException
from db.models.election import Election, ElectionStatus
from schemas.election import ElectionCreate
from datetime import datetime, timezone

def create_election(db: Session, election_in: ElectionCreate):
    if election_in.end_time <= election_in.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    now = datetime.now(timezone.utc)
    status = ElectionStatus.upcoming
    
    if now < election_in.start_time:
        status = ElectionStatus.upcoming
    elif election_in.start_time <= now < election_in.end_time:
        status = ElectionStatus.active
    else:
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

def get_all_elections(db: Session):
    elections = db.query(Election).all()
    now = datetime.now(timezone.utc)
    updated = False
    
    for e in elections:
        if e.status == ElectionStatus.stopped:
            continue
            
        old_status = e.status
        if now < e.start_time:
            e.status = ElectionStatus.upcoming
        elif e.start_time <= now < e.end_time:
            e.status = ElectionStatus.active
        else:
            e.status = ElectionStatus.completed
            
        if old_status != e.status:
            updated = True
            
    if updated:
        db.commit()
    return elections

def get_election(db: Session, election_id: int):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
        
    if election.status != ElectionStatus.stopped:
        now = datetime.now(timezone.utc)
        old_status = election.status
        if now < election.start_time:
            election.status = ElectionStatus.upcoming
        elif election.start_time <= now < election.end_time:
            election.status = ElectionStatus.active
        else:
            election.status = ElectionStatus.completed
            
        if old_status != election.status:
            db.commit()
            
    return election

def get_election_status(db: Session, election_id: int):
    election = get_election(db, election_id)
    return {"id": election.id, "status": election.status.value}

def delete_election(db: Session, election_id: int):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    db.delete(election)
    db.commit()
    return {"message": f"Election {election_id} deleted successfully"}