from sqlalchemy.orm import Session
from fastapi import HTTPException
from db.models.vote import Vote
from db.models.election import Election, ElectionStatus
from db.models.candidate import Candidate, CandidateStatus
from schemas.vote import VoteCreate
from sqlalchemy.exc import IntegrityError
from sockets import manager
from sqlalchemy import func

async def cast_vote(vote_data: VoteCreate, db: Session):
    # Check election
    election = db.query(Election).filter(Election.id == vote_data.election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status != ElectionStatus.active:
        raise HTTPException(status_code=400, detail="Election is not active")

    # Check candidate
    candidate = db.query(Candidate).filter(Candidate.id == vote_data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.election_id != vote_data.election_id:
        raise HTTPException(status_code=400, detail="Candidate does not belong to this election")
    if candidate.status != CandidateStatus.approved:
        raise HTTPException(status_code=400, detail="Candidate is not approved")
    if candidate.post != vote_data.post:
        raise HTTPException(status_code=400, detail="Candidate post mismatch")
    
    # Note: Using election.posts safely handles empty lists if posts are not set
    if election.posts and vote_data.post not in election.posts:
         raise HTTPException(status_code=400, detail="Invalid post for this election")

    # Cast vote
    db_vote = Vote(
        student_id=vote_data.student_id,
        election_id=vote_data.election_id,
        candidate_id=vote_data.candidate_id,
        post=vote_data.post
    )
    db.add(db_vote)
    try:
        db.commit()
        db.refresh(db_vote)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already voted for this post in this election")

    # Broadcast participation update (total votes for this election)
    total_votes = db.query(func.count(Vote.id)).filter(Vote.election_id == vote_data.election_id).scalar()
    await manager.broadcast_participation_update(vote_data.election_id, total_votes)

    return db_vote

def get_results(election_id: int, db: Session):
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    if election.results_status != "declared":
        raise HTTPException(status_code=403, detail="Results are not yet declared for this election")
    
    # Calculate results
    votes = db.query(Vote.post, Vote.candidate_id, func.count(Vote.id).label('vote_count')) \
              .filter(Vote.election_id == election_id) \
              .group_by(Vote.post, Vote.candidate_id) \
              .all()

    results = {}
    for post, cand_id, count in votes:
        if post not in results:
            results[post] = []
        results[post].append({
            "candidate_id": cand_id,
            "votes": count
        })
    
    return {"election_id": election_id, "results": results}