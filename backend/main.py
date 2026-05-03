import uvicorn
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from core.middleware import setup_cors, log_requests
from db.base import Base
from db.session import engine
from routes import studentRoutes, adminRoutes, electionRoutes, voteRoutes, candidateRoutes

app = FastAPI(title="College Voting System")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ Setup CORS
setup_cors(app)

# ✅ Request logging middleware
app.middleware("http")(log_requests)

# ✅ Startup event (for prototyping; use Alembic in production)
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)