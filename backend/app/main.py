from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    create_role_access_token,
    get_current_admin,
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
def frontend_auth():
    return RedirectResponse(url="/frontend/auth.html")


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


class AccountRegister(BaseModel):
    tipo: str
    nome: str
    email: str
    telefone: str = ""
    cpf_cnpj: str = ""
    endereco: str
    foto: str = ""
    preferencia_servico: str = ""
    senha: str


@app.post("/auth/register")
def register_account(account: AccountRegister, db: Session = Depends(get_db)):
    account_type = account.tipo.strip().lower()
    name = account.nome.strip()
    email = account.email.strip().lower()
    address = account.endereco.strip()

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
                    (:cep, :rua, :numero, NULL, :bairro, :cidade, :estado, 0, 0)
            """),
            {
                "cep": "00000-000",
                "rua": address[:200],
                "numero": "S/N",
                "bairro": "Nao informado",
                "cidade": "Nao informada",
                "estado": "NA",
            },
        )
        address_id = address_result.lastrowid
        password_hash = hash_password(account.senha)

        if account_type == "cliente":
            user_result = db.execute(
                text("""
                    INSERT INTO cliente
                        (nome_completo, foto, endereco_id, telefone, email, senha_hash)
                    VALUES (:nome, :foto, :endereco_id, :telefone, :email, :senha_hash)
                """),
                {
                    "nome": name,
                    "foto": account.foto.strip() or None,
                    "endereco_id": address_id,
                    "telefone": account.telefone.strip() or None,
                    "email": email,
                    "senha_hash": password_hash,
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


@app.get("/admin/categories", response_class=HTMLResponse)
def admin_categories_page():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>NearHand Admin - Categories</title>
        <style>
            body { font-family: sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #252525; }
            h1 { margin-bottom: 8px; }
            .notice { color: #735c00; background: #fff5c2; padding: 12px; border-radius: 6px; }
            form, li { display: flex; gap: 8px; align-items: center; }
            form { margin: 24px 0; }
            input, button { font-size: 16px; padding: 9px 12px; }
            input { flex: 1; min-width: 0; }
            button { cursor: pointer; }
            ul { list-style: none; padding: 0; }
            li { margin: 10px 0; }
            li input { border: 1px solid #bbb; border-radius: 4px; }
            .delete { color: #9b1c1c; }
            #message { min-height: 24px; }
        </style>
    </head>
    <body>
        <h1>Admin: categories</h1>
        <p>Manage the categories available for services.</p>
        <p class="notice">Sign in with an admin account to manage categories.</p>
        <form id="category-form">
            <input id="category-name" placeholder="New category name" required>
            <button type="submit">Create</button>
        </form>
        <p id="message"></p>
        <ul id="category-list"></ul>

        <script>
            const form = document.getElementById('category-form');
            const nameInput = document.getElementById('category-name');
            const message = document.getElementById('message');
            const list = document.getElementById('category-list');

            const token = localStorage.getItem('nearhand_admin_token');
            const headers = () => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });

            function handleUnauthorized(response) {
                if (response.status === 401) {
                    localStorage.removeItem('nearhand_admin_token');
                    window.location.href = '/admin/login';
                    return true;
                }
                return false;
            }

            async function loadCategories() {
                const response = await fetch('/categories', { headers: headers() });
                if (handleUnauthorized(response)) return;
                const categories = await response.json();
                list.replaceChildren();
                categories.forEach(category => {
                    const item = document.createElement('li');
                    const input = document.createElement('input');
                    input.value = category.nome;
                    input.setAttribute('aria-label', `Category ${category.id}`);

                    const saveButton = document.createElement('button');
                    saveButton.textContent = 'Save';
                    saveButton.addEventListener('click', () => updateCategory(category.id, input.value));

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete';
                    deleteButton.addEventListener('click', () => deleteCategory(category.id));

                    item.append(input, saveButton, deleteButton);
                    list.appendChild(item);
                });
            }

            async function updateCategory(id, nome) {
                const response = await fetch(`/categories/${id}`, {
                    method: 'PUT',
                    headers: headers(),
                    body: JSON.stringify({ nome })
                });
                if (handleUnauthorized(response)) return;
                const result = await response.json();
                message.textContent = response.ok ? `Saved: ${result.nome}` : result.detail;
                if (response.ok) await loadCategories();
            }

            async function deleteCategory(id) {
                if (!confirm('Delete this category?')) return;
                const response = await fetch(`/categories/${id}`, { method: 'DELETE', headers: headers() });
                if (handleUnauthorized(response)) return;
                const result = await response.json();
                message.textContent = response.ok ? 'Category deleted.' : result.detail;
                if (response.ok) await loadCategories();
            }

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const response = await fetch('/categories', {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify({ nome: nameInput.value })
                });
                if (handleUnauthorized(response)) return;
                const category = await response.json();
                message.textContent = response.ok
                    ? `Category ready: ${category.nome}`
                    : category.detail;
                if (response.ok) {
                    nameInput.value = '';
                    await loadCategories();
                }
            });

            if (!token) window.location.href = '/admin/login';
            else loadCategories();
        </script>
    </body>
    </html>
    """


@app.get("/admin/login", response_class=HTMLResponse)
def admin_login_page():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>NearHand Admin Login</title>
        <style>
            body { font-family: sans-serif; max-width: 420px; margin: 80px auto; padding: 0 20px; }
            form { display: grid; gap: 12px; }
            input, button { font-size: 16px; padding: 10px; }
            button { cursor: pointer; }
            #message { color: #9b1c1c; min-height: 24px; }
        </style>
    </head>
    <body>
        <h1>NearHand Admin</h1>
        <form id="login-form">
            <input id="email" type="email" placeholder="Email" required>
            <input id="password" type="password" placeholder="Password" required>
            <button type="submit">Sign in</button>
        </form>
        <p id="message"></p>
        <script>
            document.getElementById('login-form').addEventListener('submit', async (event) => {
                event.preventDefault();
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('email').value,
                        senha: document.getElementById('password').value
                    })
                });
                const result = await response.json();
                if (!response.ok) {
                    document.getElementById('message').textContent = result.detail;
                    return;
                }
                localStorage.setItem('nearhand_admin_token', result.access_token);
                window.location.href = '/admin/categories';
            });
        </script>
    </body>
    </html>
    """

