from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from db.models.vote import Vote
from db.models.election import Election, ElectionStatus
from db.models.candidate import Candidate, CandidateStatus
from schemas.vote import VoteCreate
from sockets import manager, sio
from controllers.adminController import get_live_candidate_counts


# voteController.py
async def cast_vote(vote_data: VoteCreate, db: Session, student_id: int):
    # ── Validate election ────────────────────────────────────────────────────
    election = db.query(Election).filter(Election.id == vote_data.election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status != ElectionStatus.active:
        raise HTTPException(status_code=400, detail="Election is not active")

    # ── Validate candidate ───────────────────────────────────────────────────
    candidate = db.query(Candidate).filter(Candidate.id == vote_data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.election_id != vote_data.election_id:
        raise HTTPException(status_code=400, detail="Candidate does not belong to this election")
    if candidate.status != CandidateStatus.approved:
        raise HTTPException(status_code=400, detail="Candidate is not approved")
    if candidate.post != vote_data.post:
        raise HTTPException(status_code=400, detail="Candidate post mismatch")
    if election.posts and vote_data.post not in election.posts:
        raise HTTPException(status_code=400, detail="Invalid post for this election")

    # ── Persist vote ─────────────────────────────────────────────────────────
    db_vote = Vote(
        student_id=student_id,
        election_id=vote_data.election_id,
        candidate_id=vote_data.candidate_id,
        post=vote_data.post,
    )
    db.add(db_vote)
    try:
        db.commit()
        db.refresh(db_vote)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already voted for this post in this election")

    # ── Broadcast to voter dashboards (WebSocket participation counter) ───────
    total_votes = (
        db.query(func.count(Vote.id))
        .filter(Vote.election_id == vote_data.election_id)
        .scalar()
    )
    await manager.broadcast_participation_update(vote_data.election_id, total_votes)

    # ── Broadcast to admin room (Socket.IO live tally) ────────────────────────
    live_counts = get_live_candidate_counts(vote_data.election_id, db)
    await sio.emit("vote_update", {
        "election_id": vote_data.election_id,
        "post": vote_data.post,
        "candidate_id": vote_data.candidate_id,
    }, room=f"admin_{vote_data.election_id}")
    await sio.emit("admin_candidate_counts", live_counts, room=f"admin_{vote_data.election_id}")

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
