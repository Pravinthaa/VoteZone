import uvicorn
import os
import socketio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from core.middleware import setup_cors, log_requests
from db.base import Base
from db.session import engine
from routes import studentRoutes, adminRoutes, electionRoutes, voteRoutes, candidateRoutes
from routes import studentRoutes, adminRoutes
from sockets import sio

app = FastAPI(title="College Voting System")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ Setup CORS
setup_cors(app)

# ✅ Request logging middleware
app.middleware("http")(log_requests)

# ✅ Startup event — create tables if not exists
@app.on_event("startup")
def init_db():
    Base.metadata.create_all(bind=engine)

# ✅ Mount routers
app.include_router(studentRoutes.router)
app.include_router(adminRoutes.router)
app.include_router(electionRoutes.router)
app.include_router(voteRoutes.router)
app.include_router(candidateRoutes.router)

# ✅ Health check endpoint
@app.get("/")
def root():
    return {"message": "College Voting System backend is running!"}

# ✅ Wrap FastAPI with Socket.IO — this is the ASGI app to serve
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    # Run socket_app (not app) so Socket.IO and REST share the same port
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)