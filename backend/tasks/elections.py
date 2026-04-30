from celery_worker import celery_app
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models.election import Election, ElectionStatus
from datetime import datetime

@celery_app.task
def check_election_status(election_id: int):
    db: Session = SessionLocal()
    election = db.query(Election).get(election_id)
    if not election:
        return "Election not found"

    now = datetime.utcnow()
    if election.start_time <= now < election.end_time:
        election.status = ElectionStatus.active
    elif now >= election.end_time and election.status != ElectionStatus.stopped:
        election.status = ElectionStatus.completed

    db.commit()
    db.close()
    return f"Election {election_id} status updated to {election.status.value}"