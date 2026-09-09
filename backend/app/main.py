from datetime import date, datetime, time, timedelta
from pathlib import Path
import re
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    create_role_access_token,
    get_current_admin,
    get_current_client_id,
    get_current_provider_id,
    hash_password,
    BEARER,
    SECRET_KEY,
    verify_password,
)
from app.database import ensure_optional_schema, get_db

app = FastAPI(title="NearHand API")

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")


@app.on_event("startup")
def initialize_database_schema():
    ensure_optional_schema()


@app.get("/", include_in_schema=False)
def home():
    return RedirectResponse(url="/auth")


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


class ServiceCreate(BaseModel):
    titulo: str
    descricao: str = ""
    categoria_id: int
    valor: float
    tipo_valor: str
    raio_atendimento_km: int = 5
    fotos: list[str]


class ServiceUpdate(BaseModel):
    titulo: str
    descricao: str = ""
    categoria_id: int
    valor: float
    tipo_valor: str
    raio_atendimento_km: int = 5
    fotos: list[str] | None = None


class ServiceStatusUpdate(BaseModel):
    status: str


class FavoriteCreate(BaseModel):
    prestador_id: int


class RequestCreate(BaseModel):
    servico_id: int
    data_hora_agendada: datetime | None = None
    valor_proposto: float | None = None


class RequestStatusUpdate(BaseModel):
    status: str


class MessageCreate(BaseModel):
    texto: str


class AvailabilityCreate(BaseModel):
    data: date
    hora_inicio: time
    hora_fim: time
    bloqueado: bool = False


class EvaluationCreate(BaseModel):
    solicitacao_id: int
    nota: int
    comentario: str = ""


class EvaluationReply(BaseModel):
    resposta_prestador: str


class PaymentMethodCreate(BaseModel):
    tipo: str
    chave_pix: str = ""
    ultimos_4_digitos: str = ""


class ReceivingMethodCreate(BaseModel):
    tipo: str
    chave_pix: str = ""
    ultimos_4_digitos: str = ""
    banco: str = ""
    agencia: str = ""
    conta: str = ""


@app.get("/prestadores/me/metrics")
def provider_metrics(
    mes: int | None = Query(None, ge=1, le=12),
    ano: int | None = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    reference = datetime.now()
    selected_month = mes or reference.month
    selected_year = ano or reference.year
    result = db.execute(
        text("""
            SELECT
                COUNT(so.id) AS total_requests,
                COALESCE(SUM(so.status IN ('confirmado', 'em_andamento', 'concluido')), 0) AS accepted_requests,
                COALESCE(SUM(CASE WHEN so.status = 'concluido' THEN so.valor_proposto ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(so.status = 'concluido'), 0) AS completed_services,
                COALESCE(AVG(CASE WHEN a.denunciada = FALSE THEN a.nota END), 0) AS average_rating
            FROM solicitacao so
            JOIN servico s ON s.id = so.servico_id
            LEFT JOIN avaliacao a ON a.solicitacao_id = so.id
            WHERE s.prestador_id = :provider_id
              AND YEAR(so.criado_em) = :ano
              AND MONTH(so.criado_em) = :mes
        """),
        {"provider_id": provider_id, "ano": selected_year, "mes": selected_month},
    ).mappings().one()
    total = int(result["total_requests"] or 0)
    accepted = int(result["accepted_requests"] or 0)
    return {
        "mes": selected_month,
        "ano": selected_year,
        "solicitacoes": total,
        "taxa_aceitacao": round((accepted / total) * 100, 1) if total else 0,
        "nota_media": round(float(result["average_rating"] or 0), 1),
        "faturamento": float(result["revenue"] or 0),
        "servicos_realizados": int(result["completed_services"] or 0),
    }


def _payment_row(row) -> dict:
    return dict(row)


@app.post("/clientes/me/metodos-pagamento")
def add_payment_method(
    method: PaymentMethodCreate,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    if method.tipo not in {"pix", "cartao_credito", "cartao_debito"}:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if method.tipo == "pix" and not method.chave_pix.strip():
        raise HTTPException(status_code=400, detail="Pix key is required")
    if method.tipo.startswith("cartao") and not re.fullmatch(r"\d{4}", method.ultimos_4_digitos):
        raise HTTPException(status_code=400, detail="Provide only the last 4 card digits")
    result = db.execute(
        text("""
            INSERT INTO metodo_pagamento (cliente_id, tipo, chave_pix, ultimos_4_digitos)
            VALUES (:cliente_id, :tipo, :chave_pix, :ultimos_4)
        """),
        {
            "cliente_id": client_id,
            "tipo": method.tipo,
            "chave_pix": method.chave_pix.strip() or None,
            "ultimos_4": method.ultimos_4_digitos or None,
        },
    )
    db.commit()
    return get_payment_method(result.lastrowid, db, client_id)


def get_payment_method(method_id: int, db: Session, client_id: int):
    row = db.execute(
        text("""
            SELECT id, tipo, chave_pix, ultimos_4_digitos
            FROM metodo_pagamento
            WHERE id = :id AND cliente_id = :cliente_id
        """),
        {"id": method_id, "cliente_id": client_id},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return _payment_row(row)


@app.get("/clientes/me/metodos-pagamento")
def list_payment_methods(
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    rows = db.execute(
        text("""
            SELECT id, tipo, chave_pix, ultimos_4_digitos
            FROM metodo_pagamento
            WHERE cliente_id = :cliente_id ORDER BY id DESC
        """),
        {"cliente_id": client_id},
    ).mappings().all()
    return [_payment_row(row) for row in rows]


@app.delete("/clientes/me/metodos-pagamento/{method_id}")
def delete_payment_method(
    method_id: int,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    result = db.execute(
        text("DELETE FROM metodo_pagamento WHERE id = :id AND cliente_id = :cliente_id"),
        {"id": method_id, "cliente_id": client_id},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"status": "deleted"}


@app.post("/prestadores/me/metodos-recebimento")
def add_receiving_method(
    method: ReceivingMethodCreate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    if method.tipo not in {"pix", "banco", "cartao"}:
        raise HTTPException(status_code=400, detail="Invalid receiving method")
    if method.tipo == "pix" and not method.chave_pix.strip():
        raise HTTPException(status_code=400, detail="Pix key is required")
    if method.tipo == "banco" and not method.banco.strip():
        raise HTTPException(status_code=400, detail="Bank is required")
    if method.tipo == "cartao" and not re.fullmatch(r"\d{4}", method.ultimos_4_digitos):
        raise HTTPException(status_code=400, detail="Provide only the last 4 card digits")
    result = db.execute(
        text("""
            INSERT INTO metodo_recebimento
                (prestador_id, tipo, chave_pix, ultimos_4_digitos, banco, agencia, conta)
            VALUES (:prestador_id, :tipo, :chave_pix, :ultimos_4, :banco, :agencia, :conta)
        """),
        {
            "prestador_id": provider_id,
            "tipo": method.tipo,
            "chave_pix": method.chave_pix.strip() or None,
            "ultimos_4": method.ultimos_4_digitos or None,
            "banco": method.banco.strip() or None,
            "agencia": method.agencia.strip() or None,
            "conta": method.conta.strip() or None,
        },
    )
    db.commit()
    return get_receiving_method(result.lastrowid, db, provider_id)


def get_receiving_method(method_id: int, db: Session, provider_id: int):
    row = db.execute(
        text("""
            SELECT id, tipo, chave_pix, ultimos_4_digitos, banco, agencia, conta
            FROM metodo_recebimento
            WHERE id = :id AND prestador_id = :prestador_id
        """),
        {"id": method_id, "prestador_id": provider_id},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Receiving method not found")
    return _payment_row(row)


@app.get("/prestadores/me/metodos-recebimento")
def list_receiving_methods(
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    rows = db.execute(
        text("""
            SELECT id, tipo, chave_pix, ultimos_4_digitos, banco, agencia, conta
            FROM metodo_recebimento
            WHERE prestador_id = :prestador_id ORDER BY id DESC
        """),
        {"prestador_id": provider_id},
    ).mappings().all()
    return [_payment_row(row) for row in rows]


@app.delete("/prestadores/me/metodos-recebimento/{method_id}")
def delete_receiving_method(
    method_id: int,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    result = db.execute(
        text("DELETE FROM metodo_recebimento WHERE id = :id AND prestador_id = :prestador_id"),
        {"id": method_id, "prestador_id": provider_id},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Receiving method not found")
    return {"status": "deleted"}


def _current_account(credentials: HTTPAuthorizationCredentials | None) -> tuple[int, str]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return int(payload["sub"]), payload["role"]
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid authentication token")


def create_notification(db: Session, user_id: int, user_type: str, notification_type: str, message: str):
    db.execute(
        text("""
            INSERT INTO notificacao (usuario_id, usuario_tipo, tipo, mensagem)
            VALUES (:usuario_id, :usuario_tipo, :tipo, :mensagem)
        """),
        {"usuario_id": user_id, "usuario_tipo": user_type, "tipo": notification_type, "mensagem": message[:255]},
    )


def notification_row(row) -> dict:
    item = dict(row)
    if item.get("criado_em") is not None:
        item["criado_em"] = item["criado_em"].isoformat()
    item["lida"] = bool(item["lida"])
    return item


@app.get("/notificacoes/me")
def list_notifications(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    user_id, user_type = _current_account(credentials)
    rows = db.execute(
        text("""
            SELECT id, tipo, mensagem, lida, criado_em
            FROM notificacao
            WHERE usuario_id = :usuario_id AND usuario_tipo = :usuario_tipo
            ORDER BY criado_em DESC, id DESC
            LIMIT 50
        """),
        {"usuario_id": user_id, "usuario_tipo": user_type},
    ).mappings().all()
    return [notification_row(row) for row in rows]


@app.patch("/notificacoes/{notification_id}/lida")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    user_id, user_type = _current_account(credentials)
    result = db.execute(
        text("""
            UPDATE notificacao SET lida = TRUE
            WHERE id = :id AND usuario_id = :usuario_id AND usuario_tipo = :usuario_tipo
        """),
        {"id": notification_id, "usuario_id": user_id, "usuario_tipo": user_type},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "read"}


@app.patch("/notificacoes/marcar-todas-lidas")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    user_id, user_type = _current_account(credentials)
    db.execute(
        text("""
            UPDATE notificacao SET lida = TRUE
            WHERE usuario_id = :usuario_id AND usuario_tipo = :usuario_tipo AND lida = FALSE
        """),
        {"usuario_id": user_id, "usuario_tipo": user_type},
    )
    db.commit()
    return {"status": "read"}


def _check_message_participant(request_id: int, db: Session, credentials: HTTPAuthorizationCredentials | None):
    account_id, role = _current_account(credentials)
    request = db.execute(
        text("""
            SELECT so.id, so.cliente_id, s.prestador_id
            FROM solicitacao so
            JOIN servico s ON s.id = so.servico_id
            WHERE so.id = :id
        """),
        {"id": request_id},
    ).mappings().first()
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    allowed = (role == "cliente" and request["cliente_id"] == account_id) or (
        role == "prestador" and request["prestador_id"] == account_id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="You are not part of this request")
    return account_id, role


def _message_row(row) -> dict:
    message = dict(row)
    if message.get("data_hora") is not None:
        message["data_hora"] = message["data_hora"].isoformat()
    return message


@app.post("/solicitacoes/{request_id}/mensagens")
def create_message(
    request_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    account_id, role = _check_message_participant(request_id, db, credentials)
    text_message = message.texto.strip()
    if not text_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    result = db.execute(
        text("""
            INSERT INTO mensagem (solicitacao_id, remetente_id, remetente_tipo, texto)
            VALUES (:solicitacao_id, :remetente_id, :remetente_tipo, :texto)
        """),
        {
            "solicitacao_id": request_id,
            "remetente_id": account_id,
            "remetente_tipo": role,
            "texto": text_message,
        },
    )
    participant = db.execute(
        text("""
            SELECT so.cliente_id, s.prestador_id
            FROM solicitacao so JOIN servico s ON s.id = so.servico_id
            WHERE so.id = :id
        """),
        {"id": request_id},
    ).mappings().one()
    recipient_id = participant["prestador_id"] if role == "cliente" else participant["cliente_id"]
    recipient_type = "prestador" if role == "cliente" else "cliente"
    create_notification(db, recipient_id, recipient_type, "nova_mensagem", "Você recebeu uma nova mensagem.")
    db.commit()
    row = db.execute(
        text("""
            SELECT id, solicitacao_id, remetente_id, remetente_tipo, texto, data_hora
            FROM mensagem WHERE id = :id
        """),
        {"id": result.lastrowid},
    ).mappings().first()
    return _message_row(row)


@app.get("/solicitacoes/{request_id}/mensagens")
def list_messages(
    request_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    _check_message_participant(request_id, db, credentials)
    rows = db.execute(
        text("""
            SELECT id, solicitacao_id, remetente_id, remetente_tipo, texto, data_hora
            FROM mensagem
            WHERE solicitacao_id = :solicitacao_id
            ORDER BY data_hora, id
        """),
        {"solicitacao_id": request_id},
    ).mappings().all()
    return [_message_row(row) for row in rows]


@app.get("/addresses/cep/{cep}")
def lookup_address_by_cep(cep: str):
    normalized_cep = re.sub(r"\D", "", cep)
    if len(normalized_cep) != 8:
        raise HTTPException(status_code=400, detail="CEP must contain 8 digits")

    request = UrlRequest(
        f"https://viacep.com.br/ws/{normalized_cep}/json/",
        headers={"Accept": "application/json", "User-Agent": "NearHand/1.0"},
    )
    try:
        with urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="Could not contact the CEP service")

    if data.get("erro"):
        raise HTTPException(status_code=404, detail="CEP not found")

    return {
        "cep": data.get("cep", normalized_cep),
        "rua": data.get("logradouro", ""),
        "complemento": data.get("complemento", ""),
        "bairro": data.get("bairro", ""),
        "cidade": data.get("localidade", ""),
        "estado": data.get("uf", ""),
    }


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


def _digits_only(value: str) -> str:
    return re.sub(r"\D", "", value)


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
    if not account.foto.strip():
        raise HTTPException(status_code=400, detail="Profile or company photo is required")
    if account_type == "prestador" and not account.cpf_cnpj.strip():
        raise HTTPException(status_code=400, detail="CPF or CNPJ is required")

    if account_type == "cliente":
        existing_client = db.execute(
            text("SELECT id FROM cliente WHERE LOWER(email) = :email"),
            {"email": email},
        ).first()
        if existing_client:
            raise HTTPException(status_code=409, detail="This email already has a client account")
    else:
        existing_provider = db.execute(
            text("SELECT id FROM prestador WHERE LOWER(email) = :email"),
            {"email": email},
        ).first()
        if existing_provider:
            raise HTTPException(status_code=409, detail="This email already has a provider account")
        existing_document = db.execute(
            text("""
                SELECT id FROM prestador
                WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = :cpf_cnpj
            """),
            {"cpf_cnpj": _digits_only(account.cpf_cnpj)},
        ).first()
        if existing_document:
            raise HTTPException(status_code=409, detail="This CPF/CNPJ already has a provider account")

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
                    "telefone": _digits_only(account.telefone) or None,
                    "email": email,
                    "senha_hash": password_hash,
                    "preferencias": preferencias,
                },
            )
        else:
            user_result = db.execute(
                text("""
                    INSERT INTO prestador
                        (nome_empresa, foto, endereco_id, telefone, email, cpf_cnpj, senha_hash)
                    VALUES (:nome, :foto, :endereco_id, :telefone, :email, :cpf_cnpj, :senha_hash)
                """),
                {
                    "nome": name,
                    "foto": account.foto.strip() or None,
                    "endereco_id": address_id,
                    "telefone": _digits_only(account.telefone) or None,
                    "email": email,
                    "cpf_cnpj": _digits_only(account.cpf_cnpj),
                    "senha_hash": password_hash,
                },
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="The account data conflicts with an existing account")
    except DataError:
        db.rollback()
        raise HTTPException(status_code=400, detail="One of the provided fields is too long or invalid")

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
                SELECT id, nome_completo AS nome, email, foto, senha_hash
                FROM cliente
                WHERE LOWER(email) = :identifier
                   OR REPLACE(REPLACE(REPLACE(REPLACE(telefone, ' ', ''), '-', ''), '(', ''), ')', '') = :phone
            """),
            {"identifier": identifier, "phone": _digits_only(account.identificador)},
        ).mappings().first()
    elif account_type == "prestador":
        user = db.execute(
            text("""
                SELECT id, nome_empresa AS nome, email, foto, senha_hash
                FROM prestador
                WHERE LOWER(email) = :identifier
                   OR REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = :document
            """),
            {"identifier": identifier, "document": _digits_only(account.identificador)},
        ).mappings().first()
    else:
        raise HTTPException(status_code=400, detail="Invalid account type")

    if user is None or not verify_password(account.senha, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": create_role_access_token(user["id"], account_type),
        "token_type": "bearer",
        "tipo": account_type,
        "user": {
            "id": user["id"],
            "nome": user["nome"],
            "email": user["email"],
            "foto": user.get("foto"),
        },
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


@app.post("/categories/provider")
def create_provider_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    name = category.nome.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    try:
        result = db.execute(
            text("INSERT INTO categoria (nome) VALUES (:nome)"),
            {"nome": name},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.execute(
            text("SELECT id, nome FROM categoria WHERE nome = :nome"),
            {"nome": name},
        ).mappings().first()
        if existing:
            return existing
        raise HTTPException(status_code=409, detail="Category already exists")
    return {"id": result.lastrowid, "nome": name}


@app.post("/favoritos")
def add_favorite(
    favorite: FavoriteCreate,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    provider_id = favorite.prestador_id

    provider_exists = db.execute(
        text("SELECT id FROM prestador WHERE id = :id"),
        {"id": provider_id},
    ).first()
    if provider_exists is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    try:
        db.execute(
            text("""
                INSERT INTO favorito (cliente_id, prestador_id)
                VALUES (:cliente_id, :prestador_id)
                ON DUPLICATE KEY UPDATE id = id
            """),
            {"cliente_id": client_id, "prestador_id": provider_id},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not save favorite")

    return {"status": "favorited", "prestador_id": provider_id}


@app.delete("/favoritos/{provider_id}")
def remove_favorite(
    provider_id: int,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    result = db.execute(
        text("""
            DELETE FROM favorito
            WHERE cliente_id = :cliente_id AND prestador_id = :prestador_id
        """),
        {"cliente_id": client_id, "prestador_id": provider_id},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"status": "unfavorited", "prestador_id": provider_id}


@app.get("/clientes/me/favoritos")
def list_my_favorites(
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    query = text(SERVICE_SELECT.format(distance_expression="NULL") + """
        JOIN favorito fav ON fav.prestador_id = s.prestador_id
                         AND fav.cliente_id = :cliente_id
        WHERE s.status = 'ativo'
        GROUP BY s.id, s.titulo, s.descricao, s.valor, s.tipo_valor, s.status, s.raio_atendimento_km,
                 c.id, c.nome, p.id, p.nome_empresa, e.latitude, e.longitude, r.rating, r.reviews
        ORDER BY p.nome_empresa, s.titulo
    """)
    rows = db.execute(query, {"cliente_id": client_id, "lat": 0, "lng": 0}).mappings().all()
    return [_decode_service_row(row) for row in rows]


def _request_row(row) -> dict:
    request = dict(row)
    for key in ("data_hora_agendada", "criado_em"):
        if request.get(key) is not None:
            request[key] = request[key].isoformat()
    if request.get("valor_proposto") is not None:
        request["valor_proposto"] = float(request["valor_proposto"])
    return request


REQUEST_SELECT = """
    SELECT
        so.id,
        so.cliente_id,
        so.servico_id,
        so.data_hora_agendada,
        so.valor_proposto,
        so.status,
        so.criado_em,
        s.titulo AS servico_titulo,
        s.descricao AS servico_descricao,
        p.id AS prestador_id,
        p.nome_empresa AS prestador_nome,
        c.nome_completo AS cliente_nome,
        c.email AS cliente_email
    FROM solicitacao so
    JOIN servico s ON s.id = so.servico_id
    JOIN prestador p ON p.id = s.prestador_id
    JOIN cliente c ON c.id = so.cliente_id
"""


@app.post("/solicitacoes")
def create_request(
    request: RequestCreate,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    service = db.execute(
        text("SELECT id, valor, status FROM servico WHERE id = :id"),
        {"id": request.servico_id},
    ).mappings().first()
    if service is None or service["status"] != "ativo":
        raise HTTPException(status_code=404, detail="Active service not found")
    if request.valor_proposto is not None and request.valor_proposto < 0:
        raise HTTPException(status_code=400, detail="Proposed value cannot be negative")

    result = db.execute(
        text("""
            INSERT INTO solicitacao
                (cliente_id, servico_id, data_hora_agendada, valor_proposto, status)
            VALUES
                (:cliente_id, :servico_id, :data_hora_agendada, :valor_proposto, 'solicitado')
        """),
        {
            "cliente_id": client_id,
            "servico_id": request.servico_id,
            "data_hora_agendada": request.data_hora_agendada,
            "valor_proposto": request.valor_proposto if request.valor_proposto is not None else service["valor"],
        },
    )
    recipient = db.execute(
        text("SELECT prestador_id FROM servico WHERE id = :id"), {"id": request.servico_id}
    ).scalar_one()
    create_notification(db, recipient, "prestador", "nova_solicitacao", "Você recebeu uma nova solicitação de serviço.")
    db.commit()
    return _get_request(result.lastrowid, db, client_id=client_id)


@app.get("/clientes/me/solicitacoes")
def list_client_requests(
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    rows = db.execute(
        text(REQUEST_SELECT + """
            WHERE so.cliente_id = :client_id
            ORDER BY so.criado_em DESC
        """),
        {"client_id": client_id},
    ).mappings().all()
    return [_request_row(row) for row in rows]


@app.get("/prestadores/me/solicitacoes")
def list_provider_requests(
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    rows = db.execute(
        text(REQUEST_SELECT + """
            WHERE s.prestador_id = :provider_id
            ORDER BY so.criado_em DESC
        """),
        {"provider_id": provider_id},
    ).mappings().all()
    return [_request_row(row) for row in rows]


def _get_request(
    request_id: int,
    db: Session,
    client_id: int | None = None,
    provider_id: int | None = None,
):
    row = db.execute(
        text(REQUEST_SELECT + """
            WHERE so.id = :request_id
              AND (:client_id IS NULL OR so.cliente_id = :client_id)
              AND (:provider_id IS NULL OR s.prestador_id = :provider_id)
        """),
        {"request_id": request_id, "client_id": client_id, "provider_id": provider_id},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return _request_row(row)


@app.get("/solicitacoes/{request_id}")
def get_request_detail(request_id: int, db: Session = Depends(get_db)):
    return _get_request(request_id, db)


@app.patch("/solicitacoes/{request_id}/status")
def update_request_status(
    request_id: int,
    payload: RequestStatusUpdate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token_payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        account_id = int(token_payload["sub"])
        role = token_payload["role"]
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    request_row = db.execute(
        text(REQUEST_SELECT + " WHERE so.id = :request_id"),
        {"request_id": request_id},
    ).mappings().first()
    if request_row is None:
        raise HTTPException(status_code=404, detail="Request not found")

    current_status = request_row["status"]
    next_status = payload.status
    provider_transitions = {
        "solicitado": {"confirmado", "cancelado"},
        "confirmado": {"em_andamento", "cancelado"},
        "em_andamento": {"concluido"},
    }
    client_transitions = {
        "solicitado": {"cancelado"},
        "confirmado": {"cancelado"},
    }
    if role == "prestador":
        if request_row["prestador_id"] != account_id or next_status not in provider_transitions.get(current_status, set()):
            raise HTTPException(status_code=403, detail="Invalid provider status transition")
    elif role == "cliente":
        if request_row["cliente_id"] != account_id or next_status not in client_transitions.get(current_status, set()):
            raise HTTPException(status_code=403, detail="Invalid client status transition")
    else:
        raise HTTPException(status_code=403, detail="Only clients and providers can update requests")

    db.execute(
        text("UPDATE solicitacao SET status = :status WHERE id = :id"),
        {"status": next_status, "id": request_id},
    )
    recipient_id = request_row["cliente_id"] if role == "prestador" else request_row["prestador_id"]
    recipient_type = "cliente" if role == "prestador" else "prestador"
    create_notification(db, recipient_id, recipient_type, "status_solicitacao", f"Sua solicitação foi atualizada para: {next_status}.")
    db.commit()
    return _get_request(request_id, db)


def _evaluation_row(row) -> dict:
    evaluation = dict(row)
    if evaluation.get("criado_em") is not None:
        evaluation["criado_em"] = evaluation["criado_em"].isoformat()
    return evaluation


EVALUATION_SELECT = """
    SELECT
        a.id,
        a.solicitacao_id,
        a.nota,
        a.comentario,
        a.resposta_prestador,
        a.denunciada,
        a.criado_em,
        so.cliente_id,
        so.servico_id,
        s.titulo AS servico_titulo,
        p.id AS prestador_id,
        p.nome_empresa AS prestador_nome,
        c.nome_completo AS cliente_nome
    FROM avaliacao a
    JOIN solicitacao so ON so.id = a.solicitacao_id
    JOIN servico s ON s.id = so.servico_id
    JOIN prestador p ON p.id = s.prestador_id
    JOIN cliente c ON c.id = so.cliente_id
"""


@app.post("/avaliacoes")
def create_evaluation(
    evaluation: EvaluationCreate,
    db: Session = Depends(get_db),
    client_id: int = Depends(get_current_client_id),
):
    if evaluation.nota < 1 or evaluation.nota > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    request = db.execute(
        text("""
            SELECT id FROM solicitacao
            WHERE id = :id AND cliente_id = :cliente_id AND status = 'concluido'
        """),
        {"id": evaluation.solicitacao_id, "cliente_id": client_id},
    ).first()
    if request is None:
        raise HTTPException(status_code=400, detail="Only completed requests can be evaluated")
    try:
        result = db.execute(
            text("""
                INSERT INTO avaliacao (solicitacao_id, nota, comentario)
                VALUES (:solicitacao_id, :nota, :comentario)
            """),
            {
                "solicitacao_id": evaluation.solicitacao_id,
                "nota": evaluation.nota,
                "comentario": evaluation.comentario.strip() or None,
            },
        )
        recipient = db.execute(
            text("""
                SELECT s.prestador_id
                FROM solicitacao so JOIN servico s ON s.id = so.servico_id
                WHERE so.id = :id
            """),
            {"id": evaluation.solicitacao_id},
        ).scalar_one()
        create_notification(db, recipient, "prestador", "nova_avaliacao", "Você recebeu uma nova avaliação.")
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This request has already been evaluated")
    row = db.execute(
        text(EVALUATION_SELECT + " WHERE a.id = :id"), {"id": result.lastrowid}
    ).mappings().first()
    return _evaluation_row(row)


@app.get("/prestadores/{provider_id}/avaliacoes")
def list_provider_evaluations(provider_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        text(EVALUATION_SELECT + """
            WHERE p.id = :provider_id AND a.denunciada = FALSE
            ORDER BY a.criado_em DESC
        """),
        {"provider_id": provider_id},
    ).mappings().all()
    return [_evaluation_row(row) for row in rows]


@app.patch("/avaliacoes/{evaluation_id}/resposta")
def reply_to_evaluation(
    evaluation_id: int,
    reply: EvaluationReply,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    text_reply = reply.resposta_prestador.strip()
    if not text_reply:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    result = db.execute(
        text("""
            UPDATE avaliacao a
            JOIN solicitacao so ON so.id = a.solicitacao_id
            JOIN servico s ON s.id = so.servico_id
            SET a.resposta_prestador = :resposta
            WHERE a.id = :id AND s.prestador_id = :prestador_id
        """),
        {"resposta": text_reply, "id": evaluation_id, "prestador_id": provider_id},
    )
    recipient = db.execute(
        text("SELECT so.cliente_id FROM avaliacao a JOIN solicitacao so ON so.id = a.solicitacao_id WHERE a.id = :id"),
        {"id": evaluation_id},
    ).scalar()
    if recipient is not None:
        create_notification(db, recipient, "cliente", "resposta_avaliacao", "O prestador respondeu à sua avaliação.")
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    row = db.execute(
        text(EVALUATION_SELECT + " WHERE a.id = :id"), {"id": evaluation_id}
    ).mappings().first()
    return _evaluation_row(row)


@app.patch("/avaliacoes/{evaluation_id}/denunciar")
def report_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        account_id = int(payload["sub"])
        role = payload["role"]
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    row = db.execute(
        text(EVALUATION_SELECT + " WHERE a.id = :id"), {"id": evaluation_id}
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    allowed = (role == "cliente" and row["cliente_id"] == account_id) or (
        role == "prestador" and row["prestador_id"] == account_id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot report this evaluation")
    db.execute(text("UPDATE avaliacao SET denunciada = TRUE WHERE id = :id"), {"id": evaluation_id})
    db.commit()
    return {"status": "reported"}


def _format_time_value(value) -> str:
    # MySQL TIME columns come back from PyMySQL as datetime.timedelta, which has
    # no .isoformat(); datetime.time (and date) objects do, so prefer that when available.
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return str(value)


def _availability_row(row) -> dict:
    availability = dict(row)
    if availability.get("data") is not None:
        availability["data"] = availability["data"].isoformat()
    for key in ("hora_inicio", "hora_fim"):
        if availability.get(key) is not None:
            availability[key] = _format_time_value(availability[key])
    availability["bloqueado"] = bool(availability["bloqueado"])
    return availability


@app.post("/disponibilidade")
def create_availability(
    availability: AvailabilityCreate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    if availability.hora_fim <= availability.hora_inicio:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    result = db.execute(
        text("""
            INSERT INTO disponibilidade
                (prestador_id, data, hora_inicio, hora_fim, bloqueado)
            VALUES (:prestador_id, :data, :hora_inicio, :hora_fim, :bloqueado)
        """),
        {
            "prestador_id": provider_id,
            "data": availability.data,
            "hora_inicio": availability.hora_inicio,
            "hora_fim": availability.hora_fim,
            "bloqueado": availability.bloqueado,
        },
    )
    db.commit()
    return get_availability(result.lastrowid, db)


def get_availability(availability_id: int, db: Session):
    row = db.execute(
        text("""
            SELECT id, prestador_id, data, hora_inicio, hora_fim, bloqueado
            FROM disponibilidade
            WHERE id = :id
        """),
        {"id": availability_id},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Availability not found")
    return _availability_row(row)


def list_availability(provider_id: int, db: Session, include_blocked: bool = True):
    rows = db.execute(
        text("""
            SELECT id, prestador_id, data, hora_inicio, hora_fim, bloqueado
            FROM disponibilidade
                        WHERE prestador_id = :prestador_id
                            AND (:include_blocked OR bloqueado = FALSE)
            ORDER BY data, hora_inicio
        """),
        {"prestador_id": provider_id, "include_blocked": include_blocked},
    ).mappings().all()
    return [_availability_row(row) for row in rows]


@app.get("/prestadores/me/disponibilidade")
def get_my_availability(
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    return list_availability(provider_id, db, include_blocked=False)


@app.get("/prestadores/{provider_id}/disponibilidade")
def get_provider_availability(provider_id: int, db: Session = Depends(get_db)):
    exists = db.execute(
        text("SELECT id FROM prestador WHERE id = :id"), {"id": provider_id}
    ).first()
    if exists is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    return list_availability(provider_id, db)


@app.delete("/disponibilidade/{availability_id}")
def delete_availability(
    availability_id: int,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    result = db.execute(
        text("""
            DELETE FROM disponibilidade
            WHERE id = :id AND prestador_id = :prestador_id
        """),
        {"id": availability_id, "prestador_id": provider_id},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Availability not found")
    return {"status": "deleted"}


SERVICE_SELECT = """
    SELECT
        s.id,
        s.titulo AS title,
        s.descricao AS description,
        s.valor AS price,
        s.tipo_valor AS price_type,
        s.status,
        s.raio_atendimento_km,
        c.id AS categoria_id,
        c.nome AS category,
        p.id AS prestador_id,
        p.nome_empresa AS provider,
        e.latitude AS lat,
        e.longitude AS lng,
        COALESCE(r.rating, 0) AS rating,
        COALESCE(r.reviews, 0) AS reviews,
        {distance_expression} AS distance,
        COALESCE(
            JSON_ARRAYAGG(
                CASE WHEN f.id IS NOT NULL THEN JSON_OBJECT(
                    'id', f.id, 'url', f.url, 'tipo', f.tipo, 'ordem', f.ordem
                ) END
            ), JSON_ARRAY()
        ) AS photos
    FROM servico s
    JOIN categoria c ON c.id = s.categoria_id
    JOIN prestador p ON p.id = s.prestador_id
    JOIN endereco e ON e.id = p.endereco_id
    LEFT JOIN (
        SELECT
            so.servico_id,
            AVG(a.nota) AS rating,
            COUNT(a.id) AS reviews
        FROM solicitacao so
        JOIN avaliacao a ON a.solicitacao_id = so.id
        WHERE so.status = 'concluido' AND a.denunciada = FALSE
        GROUP BY so.servico_id
    ) r ON r.servico_id = s.id
    LEFT JOIN foto_servico f ON f.servico_id = s.id AND f.tipo = 'carrossel'
"""


def _distance_expression(lat_param: str = ":lat", lng_param: str = ":lng") -> str:
    return f"""
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS({lat_param} - e.latitude) / 2), 2)
            + COS(RADIANS({lat_param})) * COS(RADIANS(e.latitude))
            * POWER(SIN(RADIANS({lng_param} - e.longitude) / 2), 2)
        ))
    """


def _decode_service_row(row) -> dict:
    service = dict(row)
    photos = service.get("photos") or []
    if isinstance(photos, str):
        import json

        photos = json.loads(photos)
    service["photos"] = [photo for photo in photos if photo and photo.get("url")]
    service["price"] = float(service["price"])
    service["rating"] = float(service["rating"])
    service["reviews"] = int(service["reviews"])
    service["distance"] = float(service["distance"]) if service["distance"] is not None else None
    service["unit"] = "/h" if service["price_type"] == "por_hora" else ""
    return service


@app.post("/services")
def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    if service.tipo_valor not in {"fixo", "por_hora"}:
        raise HTTPException(status_code=400, detail="tipo_valor must be fixo or por_hora")
    if not service.titulo.strip() or service.valor < 0 or service.raio_atendimento_km <= 0:
        raise HTTPException(status_code=400, detail="Price and radius must be positive")
    photos = [photo.strip() for photo in service.fotos if photo.strip()]
    if len(photos) < 2:
        raise HTTPException(status_code=400, detail="At least 2 photos are required")

    category_exists = db.execute(
        text("SELECT id FROM categoria WHERE id = :id"), {"id": service.categoria_id}
    ).first()
    if category_exists is None:
        raise HTTPException(status_code=404, detail="Category not found")

    try:
        result = db.execute(
            text("""
                INSERT INTO servico
                    (prestador_id, categoria_id, titulo, descricao, valor, tipo_valor, raio_atendimento_km)
                VALUES
                    (:prestador_id, :categoria_id, :titulo, :descricao, :valor, :tipo_valor, :raio)
            """),
            {
                "prestador_id": provider_id,
                "categoria_id": service.categoria_id,
                "titulo": service.titulo.strip(),
                "descricao": service.descricao.strip() or None,
                "valor": service.valor,
                "tipo_valor": service.tipo_valor,
                "raio": service.raio_atendimento_km,
            },
        )
        service_id = result.lastrowid
        db.execute(
            text("""
                INSERT INTO foto_servico (servico_id, url, tipo, ordem)
                VALUES (:servico_id, :url, 'carrossel', :ordem)
            """),
            [{"servico_id": service_id, "url": url, "ordem": index} for index, url in enumerate(photos)],
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid service data")
    except DataError:
        db.rollback()
        raise HTTPException(status_code=400, detail="One of the provided fields is too long or invalid")

    return get_service(service_id, db)


@app.get("/services")
def list_services(
    categoria: str | None = None,
    preco_min: float | None = None,
    preco_max: float | None = None,
    avaliacao_min: float = 0,
    busca: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    raio_km: float | None = None,
    ordenacao: str = Query("distancia", alias="ordenacao"),
    db: Session = Depends(get_db),
):
    if (lat is None) != (lng is None):
        raise HTTPException(status_code=400, detail="lat and lng must be provided together")
    if ordenacao not in {"distancia", "avaliacao", "preco"}:
        raise HTTPException(status_code=400, detail="Invalid ordering")

    params = {
        "lat": lat if lat is not None else 0,
        "lng": lng if lng is not None else 0,
        "preco_min": preco_min,
        "preco_max": preco_max,
        "avaliacao_min": avaliacao_min,
        "busca": f"%{busca.strip()}%" if busca and busca.strip() else None,
        "categoria": categoria,
        "raio_km": raio_km,
    }
    distance = _distance_expression() if lat is not None else "NULL"
    query = text(SERVICE_SELECT.format(distance_expression=distance) + """
        WHERE s.status = 'ativo'
          AND (:categoria IS NULL OR c.nome = :categoria OR CAST(c.id AS CHAR) = :categoria)
          AND (:preco_min IS NULL OR s.valor >= :preco_min)
          AND (:preco_max IS NULL OR s.valor <= :preco_max)
          AND (:avaliacao_min <= COALESCE(r.rating, 0))
          AND (:busca IS NULL OR s.titulo LIKE :busca OR s.descricao LIKE :busca OR p.nome_empresa LIKE :busca)
        GROUP BY s.id, s.titulo, s.descricao, s.valor, s.tipo_valor, s.status, s.raio_atendimento_km,
                 c.id, c.nome, p.id, p.nome_empresa, e.latitude, e.longitude, r.rating, r.reviews
        HAVING (:raio_km IS NULL OR {distance} <= :raio_km)
        ORDER BY {order_by}
    """.format(
        distance=distance,
        order_by={
            "distancia": "distance ASC, s.id DESC",
            "avaliacao": "rating DESC, s.id DESC",
            "preco": "s.valor ASC, s.id DESC",
        }[ordenacao],
    ))
    return [_decode_service_row(row) for row in db.execute(query, params).mappings().all()]


@app.get("/services/mine")
def list_my_services(
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    query = text(SERVICE_SELECT.format(distance_expression="0") + """
        WHERE s.prestador_id = :provider_id
        GROUP BY s.id, s.titulo, s.descricao, s.valor, s.tipo_valor, s.status, s.raio_atendimento_km,
                 c.id, c.nome, p.id, p.nome_empresa, e.latitude, e.longitude, r.rating, r.reviews
        ORDER BY s.criado_em DESC
    """)
    return [
        _decode_service_row(row)
        for row in db.execute(query, {"provider_id": provider_id, "lat": 0, "lng": 0}).mappings().all()
    ]


@app.get("/services/{service_id}")
def get_service(service_id: int, db: Session = Depends(get_db)):
    query = text(SERVICE_SELECT.format(distance_expression="0") + """
        WHERE s.id = :service_id
        GROUP BY s.id, s.titulo, s.descricao, s.valor, s.tipo_valor, s.status, s.raio_atendimento_km,
                 c.id, c.nome, p.id, p.nome_empresa, e.latitude, e.longitude, r.rating, r.reviews
    """)
    row = db.execute(query, {"service_id": service_id, "lat": 0, "lng": 0}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return _decode_service_row(row)


def _check_service_owner(service_id: int, provider_id: int, db: Session):
    row = db.execute(
        text("SELECT id FROM servico WHERE id = :id AND prestador_id = :prestador_id"),
        {"id": service_id, "prestador_id": provider_id},
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Service not found")


@app.put("/services/{service_id}")
def update_service(
    service_id: int,
    service: ServiceUpdate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    _check_service_owner(service_id, provider_id, db)
    if service.tipo_valor not in {"fixo", "por_hora"} or service.valor < 0 or service.raio_atendimento_km <= 0:
        raise HTTPException(status_code=400, detail="Invalid service values")
    if service.fotos is not None and len([photo for photo in service.fotos if photo.strip()]) < 2:
        raise HTTPException(status_code=400, detail="At least 2 photos are required")
    try:
        db.execute(
            text("""
                UPDATE servico
                SET categoria_id = :categoria_id, titulo = :titulo, descricao = :descricao,
                    valor = :valor, tipo_valor = :tipo_valor, raio_atendimento_km = :raio
                WHERE id = :id AND prestador_id = :prestador_id
            """),
            {
                "categoria_id": service.categoria_id,
                "titulo": service.titulo.strip(),
                "descricao": service.descricao.strip() or None,
                "valor": service.valor,
                "tipo_valor": service.tipo_valor,
                "raio": service.raio_atendimento_km,
                "id": service_id,
                "prestador_id": provider_id,
            },
        )
        if service.fotos is not None:
            db.execute(text("DELETE FROM foto_servico WHERE servico_id = :id"), {"id": service_id})
            photos = [photo.strip() for photo in service.fotos if photo.strip()]
            db.execute(
                text("""
                    INSERT INTO foto_servico (servico_id, url, tipo, ordem)
                    VALUES (:servico_id, :url, 'carrossel', :ordem)
                """),
                [{"servico_id": service_id, "url": url, "ordem": index} for index, url in enumerate(photos)],
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid service data")
    except DataError:
        db.rollback()
        raise HTTPException(status_code=400, detail="One of the provided fields is too long or invalid")
    return get_service(service_id, db)


@app.patch("/services/{service_id}/status")
def update_service_status(
    service_id: int,
    payload: ServiceStatusUpdate,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    _check_service_owner(service_id, provider_id, db)
    if payload.status not in {"ativo", "pausado", "removido"}:
        raise HTTPException(status_code=400, detail="Invalid service status")
    db.execute(
        text("UPDATE servico SET status = :status WHERE id = :id AND prestador_id = :prestador_id"),
        {"status": payload.status, "id": service_id, "prestador_id": provider_id},
    )
    db.commit()
    return {"id": service_id, "status": payload.status}


@app.delete("/services/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    provider_id: int = Depends(get_current_provider_id),
):
    _check_service_owner(service_id, provider_id, db)
    db.execute(
        text("DELETE FROM servico WHERE id = :id AND prestador_id = :prestador_id"),
        {"id": service_id, "prestador_id": provider_id},
    )
    db.commit()
    return {"status": "deleted"}


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
                "telefone": _digits_only(payload.telefone) or None,
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
    foto: str = ""


@app.get("/prestadores/me")
def get_provider_profile(db: Session = Depends(get_db), provider_id: int = Depends(get_current_provider_id)):
    row = db.execute(
        text(f"""
            SELECT p.id, p.nome_empresa AS nome, p.email, p.telefone, p.cpf_cnpj, p.foto,
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
    cpf_cnpj = _digits_only(payload.cpf_cnpj)

    if not name or not email or not address or not cpf_cnpj:
        raise HTTPException(status_code=400, detail="Name, email, address, and CPF/CNPJ are required")

    try:
        db.execute(
            text("""
                UPDATE prestador
                SET nome_empresa = :nome, email = :email, telefone = :telefone,
                    cpf_cnpj = :cpf_cnpj, foto = :foto
                WHERE id = :id
            """),
            {
                "nome": name,
                "email": email,
                "telefone": _digits_only(payload.telefone) or None,
                "cpf_cnpj": cpf_cnpj,
                "foto": payload.foto.strip() or None,
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


@app.get("/admin/avaliacoes-denunciadas")
def list_reported_evaluations(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    rows = db.execute(
        text(EVALUATION_SELECT + """
            WHERE a.denunciada = TRUE
            ORDER BY a.criado_em DESC
        """),
    ).mappings().all()
    return [_evaluation_row(row) for row in rows]


class ModerationAction(BaseModel):
    acao: str


@app.patch("/admin/avaliacoes/{evaluation_id}/moderar")
def moderate_evaluation(
    evaluation_id: int,
    action: ModerationAction,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if action.acao == "aprovar":
        result = db.execute(
            text("UPDATE avaliacao SET denunciada = FALSE WHERE id = :id"),
            {"id": evaluation_id},
        )
        db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return {"status": "approved"}
    if action.acao == "remover":
        result = db.execute(text("DELETE FROM avaliacao WHERE id = :id"), {"id": evaluation_id})
        db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return {"status": "removed"}
    raise HTTPException(status_code=400, detail="Action must be aprovar or remover")


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


@app.get("/admin/avaliacoes", include_in_schema=False)
def admin_evaluations_page():
    return RedirectResponse(url="/frontend/admin-avaliacoes.html")


@app.get("/admin/login", include_in_schema=False)
def admin_login_page():
    return RedirectResponse(url="/frontend/admin-login.html")

