"""
Seed script: adds demo prestador accounts and anuncios (servicos) with real
addresses spread across Campinas and Jaguariuna, SP.

Requirements:
- MySQL must be running (see backend/.env for connection settings).
- Run from the backend/ directory with the project venv:
    venv/Scripts/python.exe seed_demo_listings.py   (Windows)
    venv/bin/python seed_demo_listings.py            (macOS/Linux)

Safe to re-run: prestador accounts are matched by email, so running this
script twice will not create duplicates -- it skips any account that already
exists and only inserts what's missing.
"""

from app.auth import hash_password
from app.database import SessionLocal
from sqlalchemy import text

DEMO_PASSWORD = "Demo@2026"

# Each entry: prestador info + endereco + one servico listing.
LISTINGS = [
    {
        "empresa": "Reparos Rapidos MC",
        "email": "contato@reparosrapidosmc.com.br",
        "cpf_cnpj": "12.345.678/0001-01",
        "telefone": "19998001001",
        "endereco": {
            "cep": "13820-000",
            "rua": "Rua Antônio Carlos Lacerda",
            "numero": "245",
            "bairro": "Centro",
            "cidade": "Jaguariúna",
            "estado": "SP",
            "latitude": -22.6975,
            "longitude": -46.9836,
        },
        "categoria": "Eletricista",
        "titulo": "Eletricista residencial e comercial",
        "descricao": "Instalações, reparos elétricos e manutenção preventiva em Jaguariúna e região.",
        "valor": 95.00,
        "tipo_valor": "por_hora",
        "negociavel": True,
        "raio_km": 15,
    },
    {
        "empresa": "Faz-Tudo Jaguariúna",
        "email": "contato@faztudojaguariuna.com.br",
        "cpf_cnpj": "23.456.789/0001-02",
        "telefone": "19998001002",
        "endereco": {
            "cep": "13821-120",
            "rua": "Rua José Paulino",
            "numero": "88",
            "bairro": "Jardim Petrópolis",
            "cidade": "Jaguariúna",
            "estado": "SP",
            "latitude": -22.6890,
            "longitude": -46.9780,
        },
        "categoria": "Marido de Aluguel",
        "titulo": "Marido de aluguel: montagem e pequenos reparos",
        "descricao": "Montagem de móveis, fixação de prateleiras e reparos gerais em casa.",
        "valor": 80.00,
        "tipo_valor": "por_hora",
        "negociavel": True,
        "raio_km": 20,
    },
    {
        "empresa": "Bela Referência Salão",
        "email": "contato@belareferencia.com.br",
        "cpf_cnpj": "34.567.890/0001-03",
        "telefone": "19998001003",
        "endereco": {
            "cep": "13025-000",
            "rua": "Rua Coronel Quirino",
            "numero": "910",
            "bairro": "Cambuí",
            "cidade": "Campinas",
            "estado": "SP",
            "latitude": -22.8967,
            "longitude": -47.0564,
        },
        "categoria": "Cabeleireiro",
        "titulo": "Corte, escova e coloração",
        "descricao": "Atendimento no salão no Cambuí, com horários flexíveis durante a semana.",
        "valor": 120.00,
        "tipo_valor": "fixo",
        "negociavel": False,
        "raio_km": 10,
    },
    {
        "empresa": "Unhas & Cia Studio",
        "email": "contato@unhasecia.com.br",
        "cpf_cnpj": "45.678.901/0001-04",
        "telefone": "19998001004",
        "endereco": {
            "cep": "13070-172",
            "rua": "Avenida José Bonifácio",
            "numero": "512",
            "bairro": "Taquaral",
            "cidade": "Campinas",
            "estado": "SP",
            "latitude": -22.8737,
            "longitude": -47.0561,
        },
        "categoria": "Manicure",
        "titulo": "Manicure e nail art",
        "descricao": "Esmaltação em gel, alongamento e nail art. Atendimento em domicílio disponível.",
        "valor": 60.00,
        "tipo_valor": "fixo",
        "negociavel": True,
        "raio_km": 12,
    },
    {
        "empresa": "Pés & Mãos Studio",
        "email": "contato@pesemaosstudio.com.br",
        "cpf_cnpj": "56.789.012/0001-05",
        "telefone": "19998001005",
        "endereco": {
            "cep": "13083-970",
            "rua": "Rua Roxo Moreira",
            "numero": "1340",
            "bairro": "Barão Geraldo",
            "cidade": "Campinas",
            "estado": "SP",
            "latitude": -22.8188,
            "longitude": -47.0891,
        },
        "categoria": "Pedicure",
        "titulo": "Pedicure completa",
        "descricao": "Cuidado completo para os pés, com atendimento em Barão Geraldo.",
        "valor": 55.00,
        "tipo_valor": "fixo",
        "negociavel": False,
        "raio_km": 10,
    },
]


def get_or_create_categoria(conn, nome):
    row = conn.execute(text("SELECT id FROM categoria WHERE nome = :nome"), {"nome": nome}).first()
    if row:
        return row[0]
    result = conn.execute(text("INSERT INTO categoria (nome) VALUES (:nome)"), {"nome": nome})
    return result.lastrowid


def main():
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        for entry in LISTINGS:
            existing = db.execute(
                text("SELECT id FROM prestador WHERE email = :email"), {"email": entry["email"]}
            ).first()
            if existing:
                print(f"skip (já existe): {entry['empresa']}")
                skipped += 1
                continue

            endereco = entry["endereco"]
            endereco_id = db.execute(
                text("""
                    INSERT INTO endereco (cep, rua, numero, bairro, cidade, estado, latitude, longitude)
                    VALUES (:cep, :rua, :numero, :bairro, :cidade, :estado, :latitude, :longitude)
                """),
                endereco,
            ).lastrowid

            senha_hash = hash_password(DEMO_PASSWORD)
            prestador_id = db.execute(
                text("""
                    INSERT INTO prestador (nome_empresa, endereco_id, telefone, email, cpf_cnpj, senha_hash)
                    VALUES (:nome_empresa, :endereco_id, :telefone, :email, :cpf_cnpj, :senha_hash)
                """),
                {
                    "nome_empresa": entry["empresa"],
                    "endereco_id": endereco_id,
                    "telefone": entry["telefone"],
                    "email": entry["email"],
                    "cpf_cnpj": entry["cpf_cnpj"],
                    "senha_hash": senha_hash,
                },
            ).lastrowid

            categoria_id = get_or_create_categoria(db, entry["categoria"])

            db.execute(
                text("""
                    INSERT INTO servico
                        (prestador_id, categoria_id, titulo, descricao, valor, tipo_valor, negociavel, raio_atendimento_km)
                    VALUES
                        (:prestador_id, :categoria_id, :titulo, :descricao, :valor, :tipo_valor, :negociavel, :raio_km)
                """),
                {
                    "prestador_id": prestador_id,
                    "categoria_id": categoria_id,
                    "titulo": entry["titulo"],
                    "descricao": entry["descricao"],
                    "valor": entry["valor"],
                    "tipo_valor": entry["tipo_valor"],
                    "negociavel": entry["negociavel"],
                    "raio_km": entry["raio_km"],
                },
            )

            print(f"criado: {entry['empresa']} ({endereco['cidade']}) — {entry['titulo']}")
            created += 1

        db.commit()
        print(f"\nConcluído: {created} anúncio(s) criado(s), {skipped} já existiam.")
        print(f"Senha padrão para essas contas demo: {DEMO_PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
