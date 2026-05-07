from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.vote import VoteCreate, VoteOut
from controllers.voteController import cast_vote, get_results
from core.middleware import require_role
from sockets import manager

router = APIRouter(prefix="/votes", tags=["Votes"])

@router.post("/cast", response_model=VoteOut)
async def cast_new_vote(
    vote_in: VoteCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role("student")),
):
    return await cast_vote(vote_in, db, student_id=user["id"])


@router.get("/{election_id}/results")
def get_results(
    election_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("student")),
):
    return get_results(election_id, db)


@router.websocket("/live/{election_id}")
async def live_participation(websocket: WebSocket, election_id: int):
    await manager.connect(websocket, election_id)
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        manager.disconnect(websocket, election_id)
