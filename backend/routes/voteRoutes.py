from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.vote import VoteCreate, VoteOut
from controllers.voteController import cast_vote, get_results,get_my_votes
from core.middleware import require_role
from sockets import manager

router = APIRouter(prefix="/votes", tags=["Votes"])

@router.post("/cast", response_model=VoteOut)
async def cast_new_vote(
    vote_in: VoteCreate, 
    db: Session = Depends(get_db),
    user = Depends(require_role("student"))
):
    # Enforce that the student_id matches the authenticated user
    vote_in.student_id = user["id"]
    return await cast_vote(vote_in, db)

@router.get("/{election_id}/results")
def read_election_results(election_id: int, db: Session = Depends(get_db)):
    return get_results(election_id, db)

@router.get("/my-votes/{election_id}")
def my_votes(election_id: int, db: Session = Depends(get_db),
             current_user=Depends(require_role("student"))):
    return get_my_votes(election_id, current_user, db)

@router.websocket("/live/{election_id}")
async def live_participation(websocket: WebSocket, election_id: int):
    await manager.connect(websocket, election_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, election_id)