import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "nearhand")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", ""))

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_optional_schema():
    """Add columns introduced after the initial database script."""
    with engine.begin() as connection:
        columns = connection.execute(text("SHOW COLUMNS FROM prestador LIKE 'foto'"))
        if columns.first() is None:
            connection.execute(text("ALTER TABLE prestador ADD COLUMN foto VARCHAR(255) NULL"))

# Open a database connection and provide a session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

