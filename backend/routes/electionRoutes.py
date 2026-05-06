from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.election import ElectionCreate, ElectionOut
from controllers.electionController import create_election, get_election, get_election_status, get_all_elections,delete_election

router = APIRouter(prefix="/elections", tags=["Elections"])

@router.get("/", response_model=list[ElectionOut])
def read_all_elections(db: Session = Depends(get_db)):
    return get_all_elections(db)

@router.post("/", response_model=ElectionOut)
def create_new_election(election_in: ElectionCreate, db: Session = Depends(get_db)):
    return create_election(db, election_in)

@router.get("/{id}", response_model=ElectionOut)
def read_election(id: int, db: Session = Depends(get_db)):
    return get_election(db, id)

@router.get("/{id}/status")
def read_election_status(id: int, db: Session = Depends(get_db)):
    return get_election_status(db, id)

@router.delete("/delete/{id}")
def remove_election(id: int, db: Session = Depends(get_db)):
    return delete_election(db, id)