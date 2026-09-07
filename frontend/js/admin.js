// ============================================
// Tema claro/escuro (compartilhado com o resto do site)
// ============================================
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleIcon = document.getElementById("themeToggleIcon");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggleIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("nearhand_theme", next);
  applyTheme(next);
});

applyTheme(
  document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
);

// ============================================
// Login do admin
// ============================================
const adminLoginForm = document.getElementById("adminLoginForm");

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("message");
    const submitButton = adminLoginForm.querySelector("button[type=submit]");
    submitButton.disabled = true;
    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("adminEmail").value,
          senha: document.getElementById("adminPassword").value,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        message.textContent = result.detail || "Não foi possível entrar.";
        return;
      }
      localStorage.setItem("nearhand_admin_token", result.access_token);
      window.location.href = "/admin/categories";
    } finally {
      submitButton.disabled = false;
    }
  });
}

// ============================================
// Gestão de categorias
// ============================================
const categoryForm = document.getElementById("categoryForm");

if (categoryForm) {
  const nameInput = document.getElementById("categoryNameInput");
  const message = document.getElementById("adminMessage");
  const list = document.getElementById("categoryList");
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

  async function loadCategories() {
    const response = await fetch("/categories", { headers: headers() });
    if (handleUnauthorized(response)) return;
    const categories = await response.json();
    list.replaceChildren();
    if (!categories.length) {
      list.innerHTML = '<p class="field-help">Nenhuma categoria cadastrada ainda.</p>';
      return;
    }
    categories.forEach((category) => {
      const row = document.createElement("div");
      row.className = "category-row";

      const input = document.createElement("input");
      input.value = category.nome;
      input.setAttribute("aria-label", `Categoria ${category.id}`);

      const saveButton = document.createElement("button");
      saveButton.className = "small-btn accept";
      saveButton.textContent = "Salvar";
      saveButton.addEventListener("click", () => updateCategory(category.id, input.value));

      const deleteButton = document.createElement("button");
      deleteButton.className = "small-btn reject";
      deleteButton.textContent = "Excluir";
      deleteButton.addEventListener("click", () => deleteCategory(category.id));

      row.append(input, saveButton, deleteButton);
      list.appendChild(row);
    });
  }

  async function updateCategory(id, nome) {
    const response = await fetch(`/categories/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ nome }),
    });
    if (handleUnauthorized(response)) return;
    const result = await response.json();
    message.textContent = response.ok ? `Categoria salva: ${result.nome}` : result.detail;
    if (response.ok) await loadCategories();
  }

  async function deleteCategory(id) {
    if (!confirm("Excluir esta categoria?")) return;
    const response = await fetch(`/categories/${id}`, { method: "DELETE", headers: headers() });
    if (handleUnauthorized(response)) return;
    const result = await response.json();
    message.textContent = response.ok ? "Categoria excluída." : result.detail;
    if (response.ok) await loadCategories();
  }

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/categories", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ nome: nameInput.value }),
    });
    if (handleUnauthorized(response)) return;
    const category = await response.json();
    message.textContent = response.ok ? `Categoria criada: ${category.nome}` : category.detail;
    if (response.ok) {
      nameInput.value = "";
      await loadCategories();
    }
  });

  document.getElementById("adminLogoutBtn").addEventListener("click", () => {
    localStorage.removeItem("nearhand_admin_token");
    window.location.href = "/admin/login";
  });

  if (!token) {
    window.location.href = "/admin/login";
  } else {
    loadCategories();
  }
}
