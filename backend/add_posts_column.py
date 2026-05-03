import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.session import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE elections ADD COLUMN IF NOT EXISTS posts JSON DEFAULT '[]'::json;"))
        conn.commit()
    print("Posts column added successfully.")
except Exception as e:
    print("Error:", e)
