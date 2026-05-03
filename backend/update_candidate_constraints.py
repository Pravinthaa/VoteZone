import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.session import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        # Drop the old unique constraint (PostgreSQL standard naming)
        conn.execute(text("ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_student_id_key;"))
        
        # Add the new unique constraint
        conn.execute(text("ALTER TABLE candidates ADD CONSTRAINT unique_candidate_per_election UNIQUE (student_id, election_id);"))
        conn.commit()
    print("Candidates table constraints updated successfully.")
except Exception as e:
    print("Error:", e)
