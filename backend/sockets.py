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
