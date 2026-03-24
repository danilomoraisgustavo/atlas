import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = Path(os.getenv('DB_FILE', str(BASE_DIR / 'service_orders.db')))
DB_FILE.parent.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{DB_FILE}")

engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith('sqlite'):
    engine_kwargs['connect_args'] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
