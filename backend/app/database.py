import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "nearhand")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", ""))

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_optional_schema():
    """Add columns introduced after the initial database script."""
    with engine.begin() as connection:
        optional_columns = {
            "prestador": {"foto": "TEXT NULL", "metodos_pagamento": "VARCHAR(60) NULL", "email_verificado": "BOOLEAN DEFAULT FALSE", "email_token": "VARCHAR(100) NULL", "email_token_expira_em": "DATETIME NULL"},
            "cliente": {"preferencias": "VARCHAR(255) NULL", "metodos_pagamento_busca": "VARCHAR(60) NULL", "email_verificado": "BOOLEAN DEFAULT FALSE", "email_token": "VARCHAR(100) NULL", "email_token_expira_em": "DATETIME NULL"},
            "servico": {"negociavel": "BOOLEAN NOT NULL DEFAULT FALSE"},
            "avaliacao": {"resposta_prestador": "TEXT NULL"},
            "metodo_pagamento": {
                "chave_pix": "VARCHAR(140) NULL",
                "ultimos_4_digitos": "CHAR(4) NULL",
            },
            "metodo_recebimento": {
                "chave_pix": "VARCHAR(140) NULL",
                "ultimos_4_digitos": "CHAR(4) NULL",
                "banco": "VARCHAR(100) NULL",
                "agencia": "VARCHAR(20) NULL",
                "conta": "VARCHAR(30) NULL",
            },
        }
        for table, columns in optional_columns.items():
            for name, definition in columns.items():
                existing = connection.execute(
                    text(f"SHOW COLUMNS FROM {table} LIKE :name"), {"name": name}
                ).first()
                if existing is not None:
                    continue
                try:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))
                except ProgrammingError as error:
                    if not error.orig.args or error.orig.args[0] != 1060:
                        raise
        # Corrige instalações antigas onde colunas de foto/imagem em base64 foram criadas
        # como VARCHAR(255) ou TEXT (limite de 64KB, pequeno demais para fotos reais
        # redimensionadas, especialmente as do carrossel de serviço em 480px).
        base64_photo_columns = [
            ("prestador", "foto", "MEDIUMTEXT NULL"),
            ("cliente", "foto", "MEDIUMTEXT NULL"),
            ("foto_servico", "url", "MEDIUMTEXT NOT NULL"),
        ]
        for table, column, definition in base64_photo_columns:
            current = connection.execute(
                text(f"SHOW COLUMNS FROM {table} LIKE :name"), {"name": column}
            ).mappings().first()
            if current is not None and current["Type"].lower() != "mediumtext":
                connection.execute(text(f"ALTER TABLE {table} MODIFY COLUMN {column} {definition}"))

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

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS favorito_prestador (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cliente_id INT NOT NULL,
                prestador_id INT NOT NULL,
                FOREIGN KEY (cliente_id) REFERENCES cliente(id),
                FOREIGN KEY (prestador_id) REFERENCES prestador(id) ON DELETE CASCADE,
                UNIQUE (cliente_id, prestador_id)
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS horario_semanal (
                id INT AUTO_INCREMENT PRIMARY KEY,
                servico_id INT NOT NULL,
                dia_semana TINYINT NOT NULL,
                hora_inicio TIME NOT NULL,
                hora_fim TIME NOT NULL,
                FOREIGN KEY (servico_id) REFERENCES servico(id) ON DELETE CASCADE
            )
        """))

        # Favorito era por prestador inteiro (favoritar 1 anúncio "contaminava" todos os
        # anúncios daquele prestador). Migra pra favoritar o anúncio (servico_id) específico.
        # Cada passo é checado individualmente (DDL do MySQL faz commit implícito, então uma
        # falha no meio do caminho não desfaz os passos já aplicados numa tentativa anterior).
        favorito_servico_col = connection.execute(
            text("SHOW COLUMNS FROM favorito LIKE 'servico_id'")
        ).first()
        if favorito_servico_col is None:
            connection.execute(text("ALTER TABLE favorito ADD COLUMN servico_id INT NULL"))

        # Favoritos antigos não sabem a qual anúncio específico se referiam - descartados.
        connection.execute(text("DELETE FROM favorito WHERE servico_id IS NULL"))

        # O índice único antigo (cliente_id, prestador_id) também sustenta a FK de
        # cliente_id - precisa soltar a FK antes de conseguir derrubar o índice.
        old_fk_names = connection.execute(text("""
            SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorito'
              AND COLUMN_NAME = 'cliente_id' AND REFERENCED_TABLE_NAME = 'cliente'
        """)).scalars().all()
        for fk_name in old_fk_names:
            connection.execute(text(f"ALTER TABLE favorito DROP FOREIGN KEY {fk_name}"))

        old_unique_index = connection.execute(text(
            "SHOW INDEX FROM favorito WHERE Key_name = 'cliente_id'"
        )).first()
        if old_unique_index is not None:
            connection.execute(text("ALTER TABLE favorito DROP INDEX cliente_id"))

        favorito_servico_col = connection.execute(
            text("SHOW COLUMNS FROM favorito LIKE 'servico_id'")
        ).mappings().first()
        if favorito_servico_col is not None and favorito_servico_col["Null"] == "YES":
            connection.execute(text("ALTER TABLE favorito MODIFY COLUMN servico_id INT NOT NULL"))

        new_unique_index = connection.execute(text(
            "SHOW INDEX FROM favorito WHERE Key_name = 'uniq_favorito_cliente_servico'"
        )).first()
        if new_unique_index is None:
            connection.execute(text(
                "ALTER TABLE favorito ADD UNIQUE KEY uniq_favorito_cliente_servico (cliente_id, servico_id)"
            ))

        servico_fk = connection.execute(text("""
            SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorito'
              AND COLUMN_NAME = 'servico_id' AND REFERENCED_TABLE_NAME = 'servico'
        """)).first()
        if servico_fk is None:
            connection.execute(text(
                "ALTER TABLE favorito ADD CONSTRAINT fk_favorito_servico "
                "FOREIGN KEY (servico_id) REFERENCES servico(id) ON DELETE CASCADE"
            ))

        cliente_fk = connection.execute(text("""
            SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorito'
              AND COLUMN_NAME = 'cliente_id' AND REFERENCED_TABLE_NAME = 'cliente'
        """)).first()
        if cliente_fk is None:
            connection.execute(text(
                "ALTER TABLE favorito ADD CONSTRAINT fk_favorito_cliente "
                "FOREIGN KEY (cliente_id) REFERENCES cliente(id)"
            ))

        # Índices para acelerar a busca de serviços (filtro por status/categoria e os
        # joins de avaliação/fotos que rodam em toda consulta do catálogo do cliente).
        helpful_indexes = [
            ("servico", "idx_servico_status_categoria", "(status, categoria_id)"),
            ("foto_servico", "idx_foto_servico_servico_tipo", "(servico_id, tipo)"),
            ("solicitacao", "idx_solicitacao_servico_status", "(servico_id, status)"),
        ]
        for table, index_name, columns in helpful_indexes:
            existing_index = connection.execute(
                text(f"SHOW INDEX FROM {table} WHERE Key_name = :name"), {"name": index_name}
            ).first()
            if existing_index is not None:
                continue
            try:
                connection.execute(text(f"CREATE INDEX {index_name} ON {table} {columns}"))
            except (ProgrammingError, OperationalError) as error:
                if not error.orig.args or error.orig.args[0] != 1061:
                    raise

# Open a database connection and provide a session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

