import getpass

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.auth import hash_password
from app.database import SessionLocal


name = input("Admin name: ").strip()
email = input("Admin email: ").strip().lower()
password = getpass.getpass("Admin password: ")
password_confirmation = getpass.getpass("Confirm password: ")

if not name or not email or not password:
    raise SystemExit("Name, email, and password are required.")

if password != password_confirmation:
    raise SystemExit("Passwords do not match.")

if len(password) < 8:
    raise SystemExit("Password must contain at least 8 characters.")

with SessionLocal() as db:
    try:
        db.execute(
            text("""
                INSERT INTO admin (nome, email, senha_hash)
                VALUES (:nome, :email, :senha_hash)
            """),
            {"nome": name, "email": email, "senha_hash": hash_password(password)},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise SystemExit("An admin with this email already exists.")

print("Admin created successfully.")
