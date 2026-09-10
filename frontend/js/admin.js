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
  const searchInput = document.getElementById("categorySearchInput");
  const token = localStorage.getItem("nearhand_admin_token");
  let allCategories = [];

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

  function renderCategoryList() {
    const term = searchInput.value.trim().toLowerCase();
    const categories = term
      ? allCategories.filter((category) => category.nome.toLowerCase().includes(term))
      : allCategories;
    list.replaceChildren();
    if (!allCategories.length) {
      list.innerHTML = '<p class="field-help">Nenhuma categoria cadastrada ainda.</p>';
      return;
    }
    if (!categories.length) {
      list.innerHTML = '<p class="field-help">Nenhuma categoria encontrada para essa busca.</p>';
      return;
    }
    categories.forEach((category) => {
      const row = document.createElement("div");
      row.className = "category-row";
      row.dataset.id = category.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "admin-select";
      checkbox.dataset.select = "";
      checkbox.style.flex = "0 0 auto";
      checkbox.addEventListener("change", updateBulkRemoveButton);

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

      row.append(checkbox, input, saveButton, deleteButton);
      list.appendChild(row);
    });
    updateBulkRemoveButton();
  }

  const removeSelectedCategoriesBtn = document.getElementById("removeSelectedCategoriesBtn");

  function getSelectedCategoryIds() {
    return [...list.querySelectorAll(".category-row")]
      .filter((row) => row.querySelector("[data-select]").checked)
      .map((row) => row.dataset.id);
  }

  function updateBulkRemoveButton() {
    const count = getSelectedCategoryIds().length;
    removeSelectedCategoriesBtn.hidden = count === 0;
    removeSelectedCategoriesBtn.textContent = `🗑 Remover selecionadas (${count})`;
  }

  removeSelectedCategoriesBtn.addEventListener("click", async () => {
    const ids = getSelectedCategoryIds();
    if (!ids.length) return;
    if (!confirm(`Remover ${ids.length} categoria(s) selecionada(s)?`)) return;
    const results = await Promise.all(ids.map((id) => fetch(`/categories/${id}`, { method: "DELETE", headers: headers() })));
    if (results.some((r) => r.status === 401)) { handleUnauthorized(results.find((r) => r.status === 401)); return; }
    const failed = results.filter((r) => !r.ok).length;
    message.textContent = failed ? `${ids.length - failed} removida(s), ${failed} falharam (categoria em uso por algum anúncio).` : "Categorias removidas.";
    await loadCategories();
  });

  async function loadCategories() {
    const response = await fetch("/categories", { headers: headers() });
    if (handleUnauthorized(response)) return;
    allCategories = await response.json();
    renderCategoryList();
  }

  searchInput.addEventListener("input", renderCategoryList);

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
