from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    create_role_access_token,
    get_current_admin,
    get_current_client_id,
    get_current_provider_id,
    hash_password,
    verify_password,
)
from app.database import get_db

app = FastAPI(title="NearHand API")

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")


@app.get("/", include_in_schema=False)
def home():
    return RedirectResponse(url="/admin/login")


@app.get("/app", include_in_schema=False)
def frontend_home():
    return RedirectResponse(url="/frontend/index.html")


@app.get("/auth", include_in_schema=False)
def frontend_auth(request: Request):
    query = f"?{request.url.query}" if request.url.query else ""
    return RedirectResponse(url=f"/frontend/auth.html{query}")


class CategoryCreate(BaseModel):
    nome: str


class CategoryUpdate(BaseModel):
    nome: str


class AdminLogin(BaseModel):
    email: str
    senha: str


class AccountLogin(BaseModel):
    tipo: str
    identificador: str
    senha: str


class AddressFields(BaseModel):
    cep: str = ""
    rua: str
    numero: str = ""
    complemento: str = ""
    bairro: str = ""
    cidade: str = ""
    estado: str = ""


def _address_params(payload: AddressFields) -> dict:
    return {
        "cep": payload.cep.strip()[:9] or "00000-000",
        "rua": payload.rua.strip()[:200],
        "numero": payload.numero.strip()[:10] or "S/N",
        "complemento": payload.complemento.strip()[:100] or None,
        "bairro": payload.bairro.strip()[:100] or "Nao informado",
        "cidade": payload.cidade.strip()[:100] or "Nao informada",
        "estado": (payload.estado.strip()[:2] or "NA").upper(),
    }


class AccountRegister(AddressFields):
    tipo: str
    nome: str
    email: str
    telefone: str = ""
    cpf_cnpj: str = ""
    foto: str = ""
    preferencias: list[str] = []
    senha: str


@app.post("/auth/register")
def register_account(account: AccountRegister, db: Session = Depends(get_db)):
    account_type = account.tipo.strip().lower()
    name = account.nome.strip()
    email = account.email.strip().lower()
    address = account.rua.strip()

    if account_type not in {"cliente", "prestador"}:
        raise HTTPException(status_code=400, detail="Invalid account type")
    if not name or not email or not address or len(account.senha) < 8:
        raise HTTPException(
            status_code=400,
            detail="Name, email, address, and an 8-character password are required",
        )
    if account_type == "cliente" and not account.foto.strip():
        raise HTTPException(status_code=400, detail="Profile photo is required")
    if account_type == "prestador" and not account.cpf_cnpj.strip():
        raise HTTPException(status_code=400, detail="CPF or CNPJ is required")

    try:
        address_result = db.execute(
            text("""
                INSERT INTO endereco
                    (cep, rua, numero, complemento, bairro, cidade, estado, latitude, longitude)
                VALUES
                    (:cep, :rua, :numero, :complemento, :bairro, :cidade, :estado, 0, 0)
            """),
            _address_params(account),
        )
        address_id = address_result.lastrowid
        password_hash = hash_password(account.senha)

        if account_type == "cliente":
            preferencias = ",".join(p.strip() for p in account.preferencias if p.strip()) or None
            user_result = db.execute(
                text("""
                    INSERT INTO cliente
                        (nome_completo, foto, endereco_id, telefone, email, senha_hash, preferencias)
                    VALUES (:nome, :foto, :endereco_id, :telefone, :email, :senha_hash, :preferencias)
                """),
                {
                    "nome": name,
                    "foto": account.foto.strip() or None,
                    "endereco_id": address_id,
                    "telefone": account.telefone.strip() or None,
                    "email": email,
                    "senha_hash": password_hash,
                    "preferencias": preferencias,
                },
            )
        else:
            user_result = db.execute(
                text("""
                    INSERT INTO prestador
                        (nome_empresa, endereco_id, telefone, email, cpf_cnpj, senha_hash)
                    VALUES (:nome, :endereco_id, :telefone, :email, :cpf_cnpj, :senha_hash)
                """),
                {
                    "nome": name,
                    "endereco_id": address_id,
                    "telefone": account.telefone.strip() or None,
                    "email": email,
                    "cpf_cnpj": account.cpf_cnpj.strip(),
                    "senha_hash": password_hash,
                },
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email, phone, or document already exists")

    return {
        "message": "Account created successfully",
        "tipo": account_type,
        "id": user_result.lastrowid,
    }


@app.post("/auth/login")
def login_account(account: AccountLogin, db: Session = Depends(get_db)):
    account_type = account.tipo.strip().lower()
    identifier = account.identificador.strip().lower()

    if account_type == "cliente":
        user = db.execute(
            text("""
                SELECT id, nome_completo AS nome, email, senha_hash
                FROM cliente
                WHERE LOWER(email) = :identifier OR telefone = :phone
            """),
            {"identifier": identifier, "phone": account.identificador.strip()},
        ).mappings().first()
    elif account_type == "prestador":
        user = db.execute(
            text("""
                SELECT id, nome_empresa AS nome, email, senha_hash
                FROM prestador
                WHERE LOWER(email) = :identifier
                   OR LOWER(cpf_cnpj) = :identifier
            """),
            {"identifier": identifier},
        ).mappings().first()
    else:
        raise HTTPException(status_code=400, detail="Invalid account type")

    if user is None or not verify_password(account.senha, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": create_role_access_token(user["id"], account_type),
        "token_type": "bearer",
        "tipo": account_type,
        "user": {"id": user["id"], "nome": user["nome"], "email": user["email"]},
    }


@app.get("/categories/public")
def list_public_categories(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT c.id, c.nome, COUNT(s.id) AS servico_count
            FROM categoria c
            LEFT JOIN servico s ON s.categoria_id = c.id
            GROUP BY c.id, c.nome
            ORDER BY servico_count DESC, c.nome ASC
        """)
    ).mappings().all()
    return rows


@app.get("/auth/account-exists")
def account_exists(tipo: str, email: str, db: Session = Depends(get_db)):
    account_type = tipo.strip().lower()
    normalized_email = email.strip().lower()

    if account_type == "cliente":
        row = db.execute(
            text("SELECT id FROM cliente WHERE LOWER(email) = :email"),
            {"email": normalized_email},
        ).first()
    elif account_type == "prestador":
        row = db.execute(
            text("SELECT id FROM prestador WHERE LOWER(email) = :email"),
            {"email": normalized_email},
        ).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid account type")

    return {"exists": row is not None}


class ClientProfileUpdate(AddressFields):
    nome: str
    email: str
    telefone: str = ""
    foto: str = ""
    preferencias: list[str] = []


ADDRESS_COLUMNS_SQL = """
    e.cep, e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.estado
"""


@app.get("/clientes/me")
def get_client_profile(db: Session = Depends(get_db), client_id: int = Depends(get_current_client_id)):
    row = db.execute(
        text(f"""
            SELECT c.id, c.nome_completo AS nome, c.email, c.telefone, c.foto, c.preferencias,
                   {ADDRESS_COLUMNS_SQL}
            FROM cliente c
            JOIN endereco e ON e.id = c.endereco_id
            WHERE c.id = :id
        """),
        {"id": client_id},
    ).mappings().first()

    profile = dict(row)
    profile["preferencias"] = profile["preferencias"].split(",") if profile["preferencias"] else []
    return profile


@app.put("/clientes/me")
def update_client_profile(
    payload: ClientProfileUpdate,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    name = payload.nome.strip()
    email = payload.email.strip().lower()
    address = payload.rua.strip()

    if not name or not email or not address:
        raise HTTPException(status_code=400, detail="Name, email, and address are required")

    preferencias = ",".join(p.strip() for p in payload.preferencias if p.strip()) or None

    try:
        db.execute(
            text("""
                UPDATE cliente
                SET nome_completo = :nome, email = :email, telefone = :telefone,
                    foto = :foto, preferencias = :preferencias
                WHERE id = :id
            """),
            {
                "nome": name,
                "email": email,
                "telefone": payload.telefone.strip() or None,
                "foto": payload.foto.strip() or None,
                "preferencias": preferencias,
                "id": client_id,
            },
        )
        db.execute(
            text("""
                UPDATE endereco
                JOIN cliente ON cliente.endereco_id = endereco.id
                SET endereco.cep = :cep, endereco.rua = :rua, endereco.numero = :numero,
                    endereco.complemento = :complemento, endereco.bairro = :bairro,
                    endereco.cidade = :cidade, endereco.estado = :estado
                WHERE cliente.id = :id
            """),
            {**_address_params(payload), "id": client_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already in use")

    return get_client_profile(db=db, client_id=client_id)


class ProviderProfileUpdate(AddressFields):
    nome: str
    email: str
    telefone: str = ""
    cpf_cnpj: str


@app.get("/prestadores/me")
def get_provider_profile(db: Session = Depends(get_db), provider_id: int = Depends(get_current_provider_id)):
    row = db.execute(
        text(f"""
            SELECT p.id, p.nome_empresa AS nome, p.email, p.telefone, p.cpf_cnpj,
                   {ADDRESS_COLUMNS_SQL}
            FROM prestador p
            JOIN endereco e ON e.id = p.endereco_id
            WHERE p.id = :id
        """),
        {"id": provider_id},
    ).mappings().first()
    return row


@app.put("/prestadores/me")
def update_provider_profile(
    payload: ProviderProfileUpdate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    name = payload.nome.strip()
    email = payload.email.strip().lower()
    address = payload.rua.strip()
    cpf_cnpj = payload.cpf_cnpj.strip()

    if not name or not email or not address or not cpf_cnpj:
        raise HTTPException(status_code=400, detail="Name, email, address, and CPF/CNPJ are required")

    try:
        db.execute(
            text("""
                UPDATE prestador
                SET nome_empresa = :nome, email = :email, telefone = :telefone, cpf_cnpj = :cpf_cnpj
                WHERE id = :id
            """),
            {
                "nome": name,
                "email": email,
                "telefone": payload.telefone.strip() or None,
                "cpf_cnpj": cpf_cnpj,
                "id": provider_id,
            },
        )
        db.execute(
            text("""
                UPDATE endereco
                JOIN prestador ON prestador.endereco_id = endereco.id
                SET endereco.cep = :cep, endereco.rua = :rua, endereco.numero = :numero,
                    endereco.complemento = :complemento, endereco.bairro = :bairro,
                    endereco.cidade = :cidade, endereco.estado = :estado
                WHERE prestador.id = :id
            """),
            {**_address_params(payload), "id": provider_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email or CPF/CNPJ already in use")

    return get_provider_profile(db=db, provider_id=provider_id)


@app.post("/admin/login")
def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    admin = db.execute(
        text("""
            SELECT id, nome, email, senha_hash
            FROM admin
            WHERE email = :email
        """),
        {"email": credentials.email.strip().lower()},
    ).mappings().first()

    if admin is None or not verify_password(credentials.senha, admin["senha_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "access_token": create_access_token(admin["id"]),
        "token_type": "bearer",
        "admin": {"id": admin["id"], "nome": admin["nome"], "email": admin["email"]},
    }


@app.get("/admin/me")
def admin_me(admin=Depends(get_current_admin)):
    return admin


# Health check endpoint for the database
@app.get("/health/db")
def check_db(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}

# Endpoint to list all categories
@app.get("/categories")
def list_categories(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = text("""
        SELECT id, nome
        FROM categoria
        ORDER BY nome
    """)
    result = db.execute(query)
    return result.mappings().all()


@app.post("/categories")
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    name = category.nome.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Category name is required",
        )

    try:
        db.execute(
            text("""
                INSERT INTO categoria (nome)
                VALUES (:nome)
            """),
            {"nome": name},
        )
        db.commit()
    except IntegrityError:
        db.rollback()

    result = db.execute(
        text("""
            SELECT id, nome
            FROM categoria
            WHERE nome = :nome
        """),
        {"nome": name},
    )

    return result.mappings().first()


@app.put("/categories/{category_id}")
def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    name = category.nome.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Category name is required",
        )

    try:
        result = db.execute(
            text("""
                UPDATE categoria
                SET nome = :nome
                WHERE id = :category_id
            """),
            {"nome": name, "category_id": category_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists",
        )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    return db.execute(
        text("""
            SELECT id, nome
            FROM categoria
            WHERE id = :category_id
        """),
        {"category_id": category_id},
    ).mappings().first()


@app.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    service_count = db.execute(
        text("""
            SELECT COUNT(*)
            FROM servico
            WHERE categoria_id = :category_id
        """),
        {"category_id": category_id},
    ).scalar_one()

    if service_count:
        raise HTTPException(
            status_code=409,
            detail="This category is used by a service and cannot be deleted",
        )

    result = db.execute(
        text("""
            DELETE FROM categoria
            WHERE id = :category_id
        """),
        {"category_id": category_id},
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"status": "deleted"}


@app.get("/admin/categories", include_in_schema=False)
def admin_categories_page():
    return RedirectResponse(url="/frontend/admin-categories.html")


@app.get("/admin/login", include_in_schema=False)
def admin_login_page():
    return RedirectResponse(url="/frontend/admin-login.html")

