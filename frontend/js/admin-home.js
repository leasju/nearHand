const token = localStorage.getItem("nearhand_admin_token");

function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function handleUnauthorized(response) {
  if (response.status === 401) {
    localStorage.removeItem("nearhand_admin_token");
    window.location.href = "/admin/login";
    return true;
  }
  return false;
}

async function loadCount(path, elementId, label) {
  try {
    const response = await fetch(path, { headers: headers() });
    if (handleUnauthorized(response)) return;
    const data = await response.json();
    if (!response.ok) return;
    const el = document.getElementById(elementId);
    const count = Array.isArray(data) ? data.length : 0;
    el.textContent = label(count);
  } catch {
    // deixa o traço padrão se a contagem falhar
  }
}

async function loadAdmin() {
  try {
    const response = await fetch("/admin/me", { headers: headers() });
    if (handleUnauthorized(response)) return;
    const admin = await response.json();
    if (response.ok && admin.nome) {
      document.getElementById("adminWelcomeName").textContent = admin.nome.split(" ")[0];
    }
  } catch {
    // mantém "Admin" como padrão
  }
}

if (!token) {
  window.location.href = "/admin/login";
} else {
  loadAdmin();
  loadCount("/categories", "countCategorias", (n) => `${n} cadastrada${n === 1 ? "" : "s"}`);
  loadCount("/admin/services", "countAnuncios", (n) => `${n} cadastrado${n === 1 ? "" : "s"}`);
  loadCount("/admin/accounts", "countContas", (n) => `${n} cadastrada${n === 1 ? "" : "s"}`);
  loadCount("/admin/avaliacoes-denunciadas", "countAvaliacoes", (n) => `${n} pendente${n === 1 ? "" : "s"}`);

  document.getElementById("adminLogoutBtn").addEventListener("click", () => {
    localStorage.removeItem("nearhand_admin_token");
    window.location.href = "/admin/login";
  });
}
