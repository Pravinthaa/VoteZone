# 🗳️ College Voting Portal

A full-stack, secure online voting system for college elections. Built with **FastAPI**, **PostgreSQL**, **React**, and **Vite** — supports student registration, candidate applications, election scheduling, real-time results and an admin dashboard.

---

## ✨ Features

### 🎓 Student Module
- Registration with college ID, department, and year
- JWT-based login and authentication
- Eligibility check before voting (CGPA / year criteria)
- View approved candidates and their manifestos
- Cast one vote per post per election
- View live and final election results

### 🏆 Candidate Module
- Any registered student can apply for a post
- Upload profile photo and manifesto (PDF)
- Application goes through admin approval before going live
- View competing candidates per election

### 🗳️ Election Module
- Create elections with configurable start/end times
- Assign multiple posts to a single election
- Track status: `upcoming` → `active` → `completed`
- Automatic close at deadline via Celery beat task

### 📊 Results Module
- Real-time vote counts during active elections
- Automatic winner declaration per post at close
- Public results page with vote percentages

### 🔐 Admin Module
- Secure admin login with separate credentials
- Approve or reject candidate registrations
- Monitor live voting activity
- Generate per-election reports

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State management | Zustand |
| HTTP client | Axios |
| Backend | Python 3.11, FastAPI, Uvicorn |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Database | PostgreSQL 15 |
| Task queue | Celery + Redis |
| File storage | MinIO (S3-compatible) |
| Auth | JWT (OAuth2 password flow) |
| Containerisation | Docker + Docker Compose |

---

## 📁 Project Structure

```
voting-portal/
├── backend/
│   ├── app/
│   │   ├── main.py                  # App init, CORS, router registration
│   │   ├── core/
│   │   │   ├── config.py            # Settings via pydantic-settings
│   │   │   ├── security.py          # JWT + password hashing
│   │   │   └── deps.py              # DB session, auth guards
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── student.py
│   │   │   ├── candidate.py
│   │   │   ├── election.py
│   │   │   ├── post.py
│   │   │   ├── vote.py
│   │   │   └── admin.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── routers/                 # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── students.py
│   │   │   ├── candidates.py
│   │   │   ├── elections.py
│   │   │   ├── votes.py
│   │   │   ├── results.py
│   │   │   └── admin.py
│   │   ├── services/                # Business logic
│   │   │   ├── eligibility.py
│   │   │   ├── vote_service.py
│   │   │   └── result_service.py
│   │   └── tasks/
│   │       └── election_tasks.py    # Celery tasks (auto-close, winner compute)
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            # Axios instance + interceptors
│   │   ├── store/
│   │   │   └── authStore.ts         # Zustand auth state
│   │   ├── pages/
│   │   │   ├── auth/                # Login, Register
│   │   │   ├── student/             # Dashboard, Vote, Results
│   │   │   ├── candidate/           # Apply, Upload manifesto
│   │   │   ├── election/            # List, Detail
│   │   │   └── admin/               # Dashboard, Approvals, Reports
│   │   ├── components/              # Shared UI components
│   │   └── hooks/                   # useAuth, useElection, useResults
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 18+ (for local frontend dev without Docker)
- Python 3.11+ (for local backend dev without Docker)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/voting-portal.git
cd voting-portal
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/voting_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=voting_db

# JWT
SECRET_KEY=your-super-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://redis:6379/0

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=voting-portal

# Admin seed
FIRST_ADMIN_EMAIL=admin@college.edu
FIRST_ADMIN_PASSWORD=admin123
```

### 3. Start all services

```bash
docker-compose up --build
```

This starts:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MinIO console | http://localhost:9001 |

### 4. Run database migrations

```bash
docker-compose exec backend alembic upgrade head
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Student registration |
| POST | `/auth/login` | Login (returns JWT) |
| POST | `/auth/refresh` | Refresh access token |

### Students

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/students/me` | student | Get own profile |
| GET | `/students/eligibility/{election_id}` | student | Check voting eligibility |

### Candidates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/candidates/apply` | student | Apply for a post |
| POST | `/candidates/{id}/upload` | student | Upload photo / manifesto |
| GET | `/candidates/?election_id=` | public | List candidates for election |

### Elections

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/elections/` | admin | Create election |
| GET | `/elections/` | public | List all elections |
| GET | `/elections/{id}` | public | Election detail + status |

### Votes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/votes/` | student | Cast a vote |
| GET | `/votes/me/{election_id}` | student | Check if already voted |

### Results

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/results/{election_id}` | public | Live / final results |
| GET | `/results/{election_id}/winners` | public | Declared winners per post |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/candidates?status=pending` | admin | Pending approvals |
| PATCH | `/admin/candidates/{id}/approve` | admin | Approve candidate |
| PATCH | `/admin/candidates/{id}/reject` | admin | Reject candidate |
| GET | `/admin/elections/{id}/report` | admin | Full election report |
| GET | `/admin/activity` | admin | Live voting activity |

---

## 🗄️ Database Design

### Key constraints

```sql
-- Prevent double voting per post
CREATE UNIQUE INDEX idx_one_vote_per_post
  ON votes (student_id, post_id);

-- Election lifecycle
CREATE TYPE election_status AS ENUM
  ('draft', 'upcoming', 'active', 'completed');

-- Candidate approval flow
CREATE TYPE candidate_status AS ENUM
  ('pending', 'approved', 'rejected');
```

### Entity relationships

```
students ──< candidates ──< votes >── posts >── elections
                                         │
                                    (one vote per
                                     student per post)
```

---

## ⚙️ Background Tasks

Celery handles two scheduled jobs:

**Auto-close elections** — runs every minute, finds elections where `end_at <= now()` and `status = 'active'`, transitions them to `'completed'`.

**Winner computation** — triggered after close; aggregates `COUNT(*) GROUP BY candidate_id` per post and writes the winner to `posts.winner_id`.

To monitor tasks in development:

```bash
docker-compose exec worker celery -A app.tasks flower
# Flower UI at http://localhost:5555
```

---

## 🧪 Running Tests

```bash
# Backend
docker-compose exec backend pytest tests/ -v

# Frontend
docker-compose exec frontend npm run test
```

---

## 🏗️ Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start dev server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.tasks worker --loglevel=info

# Start Celery beat scheduler (separate terminal)
celery -A app.tasks beat --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** via `passlib`.
- JWTs use HS256 with a configurable secret. Rotate `SECRET_KEY` in production.
- The unique DB index on `(student_id, post_id)` is the final hard guard against double votes — the service layer also checks before insert for a clean 409 response.
- File uploads are validated for type (`image/*`, `application/pdf`) and size before being streamed to MinIO.
- Admin routes are isolated under a separate role claim and should be behind a VPN or IP allowlist in production.

---

## 📦 Docker Compose Services

```yaml
services:
  db:        postgres:15          # port 5432
  redis:     redis:7              # port 6379
  minio:     minio/minio          # ports 9000, 9001
  backend:   ./backend            # port 8000
  worker:    celery worker
  beat:      celery beat
  frontend:  ./frontend           # port 5173
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built for transparent, tamper-proof college elections. Questions or issues? Open a GitHub issue or contact the maintainer.
