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
        columns = connection.execute(text("SHOW COLUMNS FROM avaliacao LIKE 'resposta_prestador'"))
        if columns.first() is None:
            connection.execute(text("ALTER TABLE avaliacao ADD COLUMN resposta_prestador TEXT NULL"))
        payment_columns = {
            "chave_pix": "VARCHAR(140) NULL",
            "ultimos_4_digitos": "CHAR(4) NULL",
        }
        for name, definition in payment_columns.items():
            columns = connection.execute(text(f"SHOW COLUMNS FROM metodo_pagamento LIKE '{name}'"))
            if columns.first() is None:
                connection.execute(text(f"ALTER TABLE metodo_pagamento ADD COLUMN {name} {definition}"))
        receiving_columns = {
            "chave_pix": "VARCHAR(140) NULL",
            "ultimos_4_digitos": "CHAR(4) NULL",
            "banco": "VARCHAR(100) NULL",
            "agencia": "VARCHAR(20) NULL",
            "conta": "VARCHAR(30) NULL",
        }
        for name, definition in receiving_columns.items():
            columns = connection.execute(text(f"SHOW COLUMNS FROM metodo_recebimento LIKE '{name}'"))
            if columns.first() is None:
                connection.execute(text(f"ALTER TABLE metodo_recebimento ADD COLUMN {name} {definition}"))
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS notificacao (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                usuario_tipo VARCHAR(10) NOT NULL,
                tipo VARCHAR(40) NOT NULL,
                mensagem VARCHAR(255) NOT NULL,
                lida BOOLEAN NOT NULL DEFAULT FALSE,
                criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notificacao_usuario (usuario_id, usuario_tipo, lida, criado_em)
            )
        """))

# Open a database connection and provide a session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

