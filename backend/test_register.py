#!/usr/bin/env python3
"""Test registration and email verification."""
import requests
import json
import base64
from PIL import Image
from io import BytesIO

# Create a minimal test image
img = Image.new('RGB', (100, 100), color='red')
img_bytes = BytesIO()
img.save(img_bytes, format='PNG')
img_bytes.seek(0)
base64_image = base64.b64encode(img_bytes.read()).decode('utf-8')
data_url = f"data:image/png;base64,{base64_image}"

payload = {
    "tipo": "cliente",
    "nome": "Test User",
    "email": "jusouzaleandro@gmail.com",
    "telefone": "11999999999",
    "cpf_cnpj": "",
    "cep": "01310100",
    "rua": "Rua Vergueiro",
    "numero": "1",
    "complemento": "",
    "bairro": "Centro",
    "cidade": "Sao Paulo",
    "estado": "SP",
    "foto": data_url,
    "preferencias": [],
    "senha": "TestPassword123"
}

print("[*] Testing registration endpoint...")
print(f"[*] Registering email: {payload['email']}")

try:
    response = requests.post("http://127.0.0.1:8000/auth/register", json=payload, timeout=30)
    print(f"[*] Response status: {response.status_code}")
    print(f"[*] Response body:")
    print(json.dumps(response.json(), indent=2))

    if response.status_code == 200:
        print("\n[OK] Registration successful!")
        print("[*] Check your email for the verification code")
    else:
        print(f"\n[ERROR] Registration failed with status {response.status_code}")

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
