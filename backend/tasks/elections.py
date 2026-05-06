from celery_worker import celery_app
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models.election import Election, ElectionStatus
from datetime import datetime, timezone

@celery_app.task
def check_election_status(election_id: int):
    db: Session = SessionLocal()
    election = db.query(Election).get(election_id)
    if not election:
        return "Election not found"

    now = datetime.now(timezone.utc)
    
    if election.status == ElectionStatus.stopped:
        return f"Election {election_id} is stopped, skipping status update"

    if now < election.start_time:
        election.status = ElectionStatus.upcoming
    elif election.start_time <= now < election.end_time:
        election.status = ElectionStatus.active
    else:
        election.status = ElectionStatus.completed

    db.commit()
    db.close()
    return f"Election {election_id} status updated to {election.status.value}"

@celery_app.task
def update_all_election_statuses():
    db: Session = SessionLocal()
    elections = db.query(Election).filter(
        Election.status.in_([ElectionStatus.upcoming, ElectionStatus.active, ElectionStatus.completed])
    ).all()

    now = datetime.now(timezone.utc)
    updated_count = 0
    for election in elections:
        old_status = election.status
        
        if now < election.start_time:
            election.status = ElectionStatus.upcoming
        elif election.start_time <= now < election.end_time:
            election.status = ElectionStatus.active
        else:
            election.status = ElectionStatus.completed
        
        if old_status != election.status:
            updated_count += 1

    db.commit()
    db.close()
    return f"Updated statuses for {updated_count} elections"