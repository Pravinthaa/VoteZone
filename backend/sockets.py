from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # Maps election_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, election_id: int):
        await websocket.accept()
        if election_id not in self.active_connections:
            self.active_connections[election_id] = []
        self.active_connections[election_id].append(websocket)

    def disconnect(self, websocket: WebSocket, election_id: int):
        if election_id in self.active_connections:
            if websocket in self.active_connections[election_id]:
                self.active_connections[election_id].remove(websocket)
            if not self.active_connections[election_id]:
                del self.active_connections[election_id]

    async def broadcast_participation_update(self, election_id: int, total_votes: int):
        if election_id in self.active_connections:
            for connection in self.active_connections[election_id]:
                try:
                    await connection.send_json({"type": "participation_update", "total_votes": total_votes})
                except Exception:
                    pass

manager = ConnectionManager()
import socketio
from db.session import SessionLocal
from controllers.adminController import get_live_candidate_counts

# ──────────────────────────────────────────────
#  Create Socket.IO async server
# ──────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",    # tighten this in production
)


# ──────────────────────────────────────────────
#  Connection lifecycle
# ──────────────────────────────────────────────

@sio.event
async def connect(sid, environ):
    print(f"[Socket] Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[Socket] Client disconnected: {sid}")


# ──────────────────────────────────────────────
#  join_role — admin joins a private room
# ──────────────────────────────────────────────

@sio.event
async def join_role(sid, data):
    """
    Client emits:  { "role": "admin", "election_id": 1 }
    Admin is placed in room  admin_<election_id>
    so that only admins monitoring that election receive live updates.
    """
    role = data.get("role")
    election_id = data.get("election_id")

    if role == "admin" and election_id:
        room = f"admin_{election_id}"
        await sio.enter_room(sid, room)
        await sio.emit("joined", {"room": room}, to=sid)
        print(f"[Socket] {sid} joined room: {room}")
    else:
        await sio.emit("error", {"detail": "Invalid role or missing election_id"}, to=sid)


# ──────────────────────────────────────────────
#  vote_cast — broadcast vote event to admin room
# ──────────────────────────────────────────────

@sio.event
async def vote_cast(sid, data):
    """
    Emitted by the vote controller after a successful vote.
    Expected data: { "election_id": 1, "post": "President", "candidate_id": 3 }

    Broadcasts to the admin room:
      1. The raw vote event (vote_update)
      2. Refreshed live candidate counts (admin_candidate_counts)
    """
    election_id = data.get("election_id")
    if not election_id:
        return

    room = f"admin_{election_id}"

    # 1. Forward the raw vote event to admins watching this election
    await sio.emit("vote_update", data, room=room)

    # 2. Push updated live tally to the same room
    db = SessionLocal()
    try:
        counts = get_live_candidate_counts(election_id, db)
        await sio.emit("admin_candidate_counts", counts, room=room)
    finally:
        db.close()


# ──────────────────────────────────────────────
#  admin_candidate_counts — on-demand live tally
# ──────────────────────────────────────────────

@sio.event
async def admin_candidate_counts(sid, data):
    """
    Admin explicitly requests live vote counts.
    Expected data: { "election_id": 1 }
    Response emitted only back to the requesting admin.
    """
    election_id = data.get("election_id")
    if not election_id:
        await sio.emit("error", {"detail": "Missing election_id"}, to=sid)
        return

    db = SessionLocal()
    try:
        counts = get_live_candidate_counts(election_id, db)
        await sio.emit("admin_candidate_counts", counts, to=sid)
    finally:
        db.close()
