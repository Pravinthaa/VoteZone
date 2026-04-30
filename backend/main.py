import uvicorn
from fastapi import FastAPI
from db.base import Base
from db.session import engine


app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Server is running on port 5000!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)