"""
test_admin_endpoints.py
=======================
Pytest test-suite for the admin module endpoints.

Strategy
--------
* Uses FastAPI's TestClient (backed by httpx) — no real HTTP calls needed.
* Overrides `get_db` with a fresh SQLite in-memory session per test so
  every test starts with a clean slate and the production Supabase DB is
  never touched.

Run with:
    cd d:\\vote\\VoteZone\\backend
    pytest test_admin_endpoints.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta, timezone

from main import app
from db.base import Base
from db.session import get_db
from db.models.admin import Admin
from db.models.student import Student
from db.models.candidate import Candidate, CandidateStatus
from db.models.election import Election, ElectionStatus
from db.models.vote import Vote
from core.security import hash_password


# ══════════════════════════════════════════════════════════════════════════════
#  Fixtures
# ══════════════════════════════════════════════════════════════════════════════

SQLITE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_session():
    """Fresh in-memory SQLite session for every test."""
    engine = create_engine(
        SQLITE_URL, 
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient with DB dependency overridden to use test session."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ──────────────────────────────────────────────
#  Seed helpers
# ──────────────────────────────────────────────

def seed_admin(db, username="admin1", password="secret123"):
    admin = Admin(username=username, password_hash=hash_password(password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def seed_student(db, name="Alice", email="alice@test.com", roll_no="CS001", year=2):
    student = Student(name=name, email=email, roll_no=roll_no, year=year)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def seed_election(db, status=ElectionStatus.upcoming, days_offset=1):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    election = Election(
        name="Test Election",
        start_time=now + timedelta(days=days_offset),
        end_time=now + timedelta(days=days_offset + 2),
        status=status,
    )
    db.add(election)
    db.commit()
    db.refresh(election)
    return election


def seed_candidate(db, student_id, election_id,
                   status=CandidateStatus.pending, post="President"):
    candidate = Candidate(
        student_id=student_id,
        election_id=election_id,
        post=post,
        status=status,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def seed_vote(db, student_id, candidate_id, election_id, post="President"):
    vote = Vote(
        student_id=student_id,
        candidate_id=candidate_id,
        election_id=election_id,
        post=post,
    )
    db.add(vote)
    db.commit()
    db.refresh(vote)
    return vote


# ══════════════════════════════════════════════════════════════════════════════
#  1. POST /admins/register
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminRegister:

    def test_register_success(self, client):
        res = client.post("/admins/register", json={"username": "newadmin", "password": "pass1234"})
        assert res.status_code == 200
        assert res.json()["message"] == "Admin registered successfully"

    def test_register_duplicate_returns_400(self, client, db_session):
        seed_admin(db_session, "dup_admin", "pass")
        res = client.post("/admins/register", json={"username": "dup_admin", "password": "pass"})
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"]

    def test_register_missing_password_returns_422(self, client):
        res = client.post("/admins/register", json={"username": "nopw"})
        assert res.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
#  2. POST /admins/login
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminLogin:

    def test_login_success_returns_token(self, client, db_session):
        seed_admin(db_session, "admin1", "secret123")
        res = client.post("/admins/login", json={"username": "admin1", "password": "secret123"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client, db_session):
        seed_admin(db_session, "admin2", "correct")
        res = client.post("/admins/login", json={"username": "admin2", "password": "wrong"})
        assert res.status_code == 401
        assert "Invalid credentials" in res.json()["detail"]

    def test_login_nonexistent_user_returns_401(self, client):
        res = client.post("/admins/login", json={"username": "ghost", "password": "nothing"})
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
#  3. PUT /admins/candidates/{id}/approve
# ══════════════════════════════════════════════════════════════════════════════

class TestApproveCandidate:

    def test_approve_pending_candidate(self, client, db_session):
        student   = seed_student(db_session)
        election  = seed_election(db_session)
        candidate = seed_candidate(db_session, student.id, election.id)

        res = client.put(f"/admins/candidates/{candidate.id}/approve")
        assert res.status_code == 200
        assert "approved" in res.json()["message"]

        db_session.refresh(candidate)
        assert candidate.status == CandidateStatus.approved
        db_session.refresh(student)
        assert student.is_candidate is True

    def test_approve_already_approved_returns_400(self, client, db_session):
        student   = seed_student(db_session)
        election  = seed_election(db_session)
        candidate = seed_candidate(db_session, student.id, election.id, CandidateStatus.approved)

        res = client.put(f"/admins/candidates/{candidate.id}/approve")
        assert res.status_code == 400
        assert "already approved" in res.json()["detail"]

    def test_approve_nonexistent_candidate_returns_404(self, client):
        res = client.put("/admins/candidates/9999/approve")
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
#  4. PUT /admins/candidates/{id}/reject
# ══════════════════════════════════════════════════════════════════════════════

class TestRejectCandidate:

    def test_reject_pending_candidate(self, client, db_session):
        student   = seed_student(db_session)
        election  = seed_election(db_session)
        candidate = seed_candidate(db_session, student.id, election.id)

        res = client.put(f"/admins/candidates/{candidate.id}/reject")
        assert res.status_code == 200
        assert "rejected" in res.json()["message"]

        db_session.refresh(candidate)
        assert candidate.status == CandidateStatus.rejected

    def test_reject_already_rejected_returns_400(self, client, db_session):
        student   = seed_student(db_session)
        election  = seed_election(db_session)
        candidate = seed_candidate(db_session, student.id, election.id, CandidateStatus.rejected)

        res = client.put(f"/admins/candidates/{candidate.id}/reject")
        assert res.status_code == 400

    def test_reject_nonexistent_returns_404(self, client):
        res = client.put("/admins/candidates/9999/reject")
        assert res.status_code == 404

    def test_reject_clears_is_candidate_flag(self, client, db_session):
        """Rejecting a previously-approved candidate must unset is_candidate."""
        student   = seed_student(db_session)
        election  = seed_election(db_session)
        candidate = seed_candidate(db_session, student.id, election.id, CandidateStatus.approved)
        student.is_candidate = True
        db_session.commit()

        res = client.put(f"/admins/candidates/{candidate.id}/reject")
        assert res.status_code == 200
        db_session.refresh(student)
        assert student.is_candidate is False


# ══════════════════════════════════════════════════════════════════════════════
#  5. PUT /admins/elections/{id}/duration
# ══════════════════════════════════════════════════════════════════════════════

class TestUpdateElectionDuration:

    def _payload(self, start_offset_days=1, window_days=3):
        start = datetime.now(timezone.utc) + timedelta(days=start_offset_days)
        end   = start + timedelta(days=window_days)
        return {"start_time": start.isoformat(), "end_time": end.isoformat()}

    def test_update_upcoming_election(self, client, db_session):
        election = seed_election(db_session)
        res = client.put(f"/admins/elections/{election.id}/duration", json=self._payload())
        assert res.status_code == 200
        data = res.json()
        assert data["election_id"] == election.id
        assert "start_time" in data and "end_time" in data

    def test_update_completed_election_returns_400(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.completed)
        res = client.put(f"/admins/elections/{election.id}/duration", json=self._payload())
        assert res.status_code == 400
        assert "completed" in res.json()["detail"]

    def test_invalid_time_order_returns_400(self, client, db_session):
        election = seed_election(db_session)
        now = datetime.now(timezone.utc)
        payload = {
            "start_time": (now + timedelta(days=5)).isoformat(),
            "end_time":   (now + timedelta(days=2)).isoformat(),   # end before start
        }
        res = client.put(f"/admins/elections/{election.id}/duration", json=payload)
        assert res.status_code == 400
        assert "start_time" in res.json()["detail"]

    def test_update_nonexistent_election_returns_404(self, client):
        res = client.put("/admins/elections/9999/duration", json=self._payload())
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
#  6. PUT /admins/elections/{id}/stop
# ══════════════════════════════════════════════════════════════════════════════

class TestStopElection:

    def test_stop_active_election(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.active)
        res = client.put(f"/admins/elections/{election.id}/stop")
        assert res.status_code == 200
        assert "stopped" in res.json()["message"]
        db_session.refresh(election)
        assert election.status == ElectionStatus.stopped

    def test_stop_already_stopped_returns_400(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.stopped)
        res = client.put(f"/admins/elections/{election.id}/stop")
        assert res.status_code == 400

    def test_stop_completed_election_returns_400(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.completed)
        res = client.put(f"/admins/elections/{election.id}/stop")
        assert res.status_code == 400

    def test_stop_nonexistent_returns_404(self, client):
        res = client.put("/admins/elections/9999/stop")
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
#  7. PUT /admins/elections/{id}/force-release
# ══════════════════════════════════════════════════════════════════════════════

class TestForceReleaseResults:

    def test_force_release_active_election(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.active)
        res = client.put(f"/admins/elections/{election.id}/force-release")
        assert res.status_code == 200
        assert "force-released" in res.json()["message"]
        db_session.refresh(election)
        assert election.results_status == "declared"
        assert election.status == ElectionStatus.completed

    def test_force_release_already_declared_returns_400(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.completed)
        election.results_status = "declared"
        db_session.commit()
        res = client.put(f"/admins/elections/{election.id}/force-release")
        assert res.status_code == 400
        assert "already declared" in res.json()["detail"]

    def test_force_release_nonexistent_returns_404(self, client):
        res = client.put("/admins/elections/9999/force-release")
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
#  8. PUT /admins/results/{election_id}/declare
# ══════════════════════════════════════════════════════════════════════════════

class TestDeclareResults:

    def test_declare_after_stop(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.stopped)
        res = client.put(f"/admins/results/{election.id}/declare")
        assert res.status_code == 200
        data = res.json()
        assert "declared" in data["message"]
        assert "publish_date" in data

    def test_declare_after_completion(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.completed)
        res = client.put(f"/admins/results/{election.id}/declare")
        assert res.status_code == 200

    def test_declare_active_election_returns_400(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.active)
        res = client.put(f"/admins/results/{election.id}/declare")
        assert res.status_code == 400
        assert "completed or stopped" in res.json()["detail"]

    def test_declare_already_declared_returns_400(self, client, db_session):
        election = seed_election(db_session, ElectionStatus.completed)
        election.results_status = "declared"
        db_session.commit()
        res = client.put(f"/admins/results/{election.id}/declare")
        assert res.status_code == 400
        assert "already declared" in res.json()["detail"]

    def test_declare_nonexistent_returns_404(self, client):
        res = client.put("/admins/results/9999/declare")
        assert res.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
#  9. GET /admins/elections/{id}/voters
# ══════════════════════════════════════════════════════════════════════════════

class TestGetVoters:

    def test_returns_students_who_voted(self, client, db_session):
        student   = seed_student(db_session, "Bob", "bob@test.com", "CS002")
        election  = seed_election(db_session, ElectionStatus.active, days_offset=-1)
        candidate = seed_candidate(db_session, student.id, election.id)
        seed_vote(db_session, student.id, candidate.id, election.id)

        res = client.get(f"/admins/elections/{election.id}/voters")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["roll_no"] == "CS002"

    def test_no_votes_returns_empty_list(self, client, db_session):
        election = seed_election(db_session)
        res = client.get(f"/admins/elections/{election.id}/voters")
        assert res.status_code == 200
        assert res.json() == []

    def test_nonexistent_election_returns_404(self, client):
        res = client.get("/admins/elections/9999/voters")
        assert res.status_code == 404

    def test_voter_fields_present(self, client, db_session):
        student   = seed_student(db_session, "Carol", "carol@test.com", "CS003", year=3)
        election  = seed_election(db_session, ElectionStatus.active, days_offset=-1)
        candidate = seed_candidate(db_session, student.id, election.id)
        seed_vote(db_session, student.id, candidate.id, election.id)

        res = client.get(f"/admins/elections/{election.id}/voters")
        assert res.status_code == 200
        voter = res.json()[0]
        for field in ("id", "name", "roll_no", "email", "year"):
            assert field in voter, f"Expected field '{field}' missing from voter response"


# ══════════════════════════════════════════════════════════════════════════════
#  10. GET /admins/elections/{id}/non-voters
# ══════════════════════════════════════════════════════════════════════════════

class TestGetNonVoters:

    def test_returns_students_who_did_not_vote(self, client, db_session):
        voter   = seed_student(db_session, "Voter",   "voter@test.com",   "CS010")
        abstain = seed_student(db_session, "Abstain", "abstain@test.com", "CS011")
        election  = seed_election(db_session, ElectionStatus.active, days_offset=-1)
        candidate = seed_candidate(db_session, voter.id, election.id)
        seed_vote(db_session, voter.id, candidate.id, election.id)

        res = client.get(f"/admins/elections/{election.id}/non-voters")
        assert res.status_code == 200
        roll_nos = [s["roll_no"] for s in res.json()]
        assert "CS011" in roll_nos
        assert "CS010" not in roll_nos

    def test_all_voted_returns_empty_list(self, client, db_session):
        student   = seed_student(db_session, "OnlyOne", "one@test.com", "CS020")
        election  = seed_election(db_session, ElectionStatus.active, days_offset=-1)
        candidate = seed_candidate(db_session, student.id, election.id)
        seed_vote(db_session, student.id, candidate.id, election.id)

        res = client.get(f"/admins/elections/{election.id}/non-voters")
        assert res.status_code == 200
        assert res.json() == []

    def test_nonexistent_election_returns_404(self, client):
        res = client.get("/admins/elections/9999/non-voters")
        assert res.status_code == 404

    def test_non_voter_fields_present(self, client, db_session):
        seed_student(db_session, "Dan", "dan@test.com", "CS030", year=1)
        election = seed_election(db_session)

        res = client.get(f"/admins/elections/{election.id}/non-voters")
        assert res.status_code == 200
        non_voter = res.json()[0]
        for field in ("id", "name", "roll_no", "email", "year"):
            assert field in non_voter, f"Expected field '{field}' missing"
