const token = localStorage.getItem("nearhand_admin_token");
const list = document.getElementById("adminAccountList");
const message = document.getElementById("adminMessage");
const searchInput = document.getElementById("adminAccountSearch");
const typeFilter = document.getElementById("adminAccountTypeFilter");
const toast = document.getElementById("toast");
let allAccounts = [];

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

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function renderAccountList() {
  const term = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;
  const accounts = allAccounts.filter((account) => {
    const matchesType = type === "all" || account.tipo === type;
    const matchesTerm = !term || account.nome.toLowerCase().includes(term) || account.email.toLowerCase().includes(term);
    return matchesType && matchesTerm;
  });
  list.replaceChildren();
  if (!allAccounts.length) {
    list.innerHTML = '<p class="field-help">Nenhuma conta cadastrada ainda.</p>';
    return;
  }
  if (!accounts.length) {
    list.innerHTML = '<p class="field-help">Nenhuma conta encontrada.</p>';
    return;
  }
  accounts.forEach((account) => {
    const row = document.createElement("article");
    row.className = "admin-account-row";
    row.dataset.id = account.id;
    row.dataset.tipo = account.tipo;
    const isVerified = account.email_verificado;
    const statusBadge = isVerified
      ? '<span class="verification-badge verified">✓ Verificado</span>'
      : '<span class="verification-badge pending">⏳ Pendente</span>';

    row.innerHTML = `
      <input type="checkbox" class="admin-select" data-select title="Selecionar" />
      <span class="account-type-badge ${account.tipo}">${account.tipo === "cliente" ? "Cliente" : "Prestador"}</span>
      <div>
        <strong>${account.nome}</strong>
        <div class="field-help">${account.email}${account.telefone ? " • " + account.telefone : ""}${account.cpf_cnpj ? " • " + account.cpf_cnpj : ""}</div>
      </div>
      <span class="field-help">${account.cidade || ""}${account.estado ? "/" + account.estado : ""}</span>
      ${statusBadge}
      <button class="small-btn" data-action="toggle-verify" title="${isVerified ? 'Marcar como não verificado' : 'Marcar como verificado'}">
        ${isVerified ? '✓ Verificar' : 'Verificar'}
      </button>
      <button class="small-btn" data-action="edit">Editar</button>
      <button class="small-btn reject" data-action="delete">Apagar</button>
    `;
    list.appendChild(row);
  });
  updateBulkRemoveButton();
}

const removeSelectedAccountsBtn = document.getElementById("removeSelectedAccountsBtn");

function getSelectedAccounts() {
  return [...list.querySelectorAll(".admin-account-row")]
    .filter((row) => row.querySelector("[data-select]").checked)
    .map((row) => ({ id: row.dataset.id, tipo: row.dataset.tipo }));
}

function updateBulkRemoveButton() {
  const count = getSelectedAccounts().length;
  removeSelectedAccountsBtn.hidden = count === 0;
  removeSelectedAccountsBtn.innerHTML = `<img class="icon" src="img/icons/icon-trash.png" alt="" /> Remover selecionadas (${count})`;
}

list.addEventListener("change", (event) => {
  if (event.target.matches("[data-select]")) updateBulkRemoveButton();
});

removeSelectedAccountsBtn.addEventListener("click", async () => {
  const selected = getSelectedAccounts();
  if (!selected.length) return;
  if (!confirm(`Remover ${selected.length} conta(s) selecionada(s)?`)) return;
  const results = await Promise.all(
    selected.map(({ id, tipo }) => fetch(`/admin/accounts/${tipo}/${id}`, { method: "DELETE", headers: headers() }))
  );
  if (results.some((r) => r.status === 401)) { handleUnauthorized(results.find((r) => r.status === 401)); return; }
  const failed = results.filter((r) => !r.ok).length;
  showToast(failed ? `${selected.length - failed} removida(s), ${failed} falharam (conta com dados vinculados).` : "Contas removidas.");
  await loadAccounts();
});

async function loadAccounts() {
  const response = await fetch("/admin/accounts", { headers: headers() });
  if (handleUnauthorized(response)) return;
  allAccounts = await response.json();
  renderAccountList();
}

searchInput.addEventListener("input", renderAccountList);
typeFilter.addEventListener("change", renderAccountList);

// ============================================
// Modal: criar / editar conta
// ============================================
const accountModal = document.getElementById("accountModal");
const accountForm = document.getElementById("accountForm");
const accountTypeSelect = document.getElementById("accountType");
const accountDocumentField = document.getElementById("accountDocumentField");
const accountPasswordField = document.getElementById("accountPasswordField");
let editingAccount = null;

function updateDocumentVisibility() {
  const isProvider = accountTypeSelect.value === "prestador";
  accountDocumentField.hidden = !isProvider;
  document.getElementById("accountDocument").required = isProvider;
}
accountTypeSelect.addEventListener("change", updateDocumentVisibility);

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.close).hidden = true;
  });
});
document.querySelectorAll(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.hidden = true;
  });
});

function openCreateModal() {
  editingAccount = null;
  document.getElementById("accountModalEyebrow").textContent = "ADMIN";
  document.getElementById("accountModalTitle").textContent = "Nova conta";
  document.getElementById("accountSubmitBtn").textContent = "Criar conta";
  accountForm.reset();
  accountTypeSelect.disabled = false;
  accountPasswordField.hidden = false;
  document.getElementById("accountPassword").required = true;
  updateDocumentVisibility();
  accountModal.hidden = false;
}

function openEditModal(account) {
  editingAccount = account;
  document.getElementById("accountModalEyebrow").textContent = "ADMIN";
  document.getElementById("accountModalTitle").textContent = "Editar conta";
  document.getElementById("accountSubmitBtn").textContent = "Salvar alterações";
  accountTypeSelect.value = account.tipo;
  accountTypeSelect.disabled = true;
  accountPasswordField.hidden = true;
  document.getElementById("accountPassword").required = false;
  document.getElementById("accountName").value = account.nome;
  document.getElementById("accountEmail").value = account.email;
  document.getElementById("accountPhone").value = account.telefone || "";
  document.getElementById("accountDocument").value = account.cpf_cnpj || "";
  document.getElementById("accountRua").value = account.rua || "";
  document.getElementById("accountCep").value = account.cep || "";
  document.getElementById("accountNumero").value = account.numero || "";
  document.getElementById("accountComplemento").value = account.complemento || "";
  document.getElementById("accountBairro").value = account.bairro || "";
  document.getElementById("accountCidade").value = account.cidade || "";
  document.getElementById("accountEstado").value = account.estado || "";
  updateDocumentVisibility();
  accountModal.hidden = false;
}

document.getElementById("newAccountBtn").addEventListener("click", openCreateModal);

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = button.closest(".admin-account-row");
  const account = allAccounts.find((a) => a.id === Number(row.dataset.id) && a.tipo === row.dataset.tipo);
  if (!account) return;

  if (button.dataset.action === "edit") {
    openEditModal(account);
  } else if (button.dataset.action === "toggle-verify") {
    const newStatus = !account.email_verificado;
    const response = await fetch(`/admin/accounts/${account.tipo}/${account.id}/verify`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ email_verificado: newStatus })
    });
    if (handleUnauthorized(response)) return;
    if (!response.ok) {
      const result = await response.json();
      showToast(result.detail || "Erro ao atualizar status.");
      return;
    }
    showToast(newStatus ? "Conta marcada como verificada." : "Conta marcada como não verificada.");
    await loadAccounts();
  } else if (button.dataset.action === "delete") {
    if (!confirm(`Apagar a conta de "${account.nome}"?`)) return;
    const response = await fetch(`/admin/accounts/${account.tipo}/${account.id}`, { method: "DELETE", headers: headers() });
    if (handleUnauthorized(response)) return;
    const result = await response.json();
    if (!response.ok) {
      showToast(result.detail || "Não foi possível apagar essa conta.");
      return;
    }
    showToast("Conta removida.");
    await loadAccounts();
  }
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const addressFields = {
    rua: document.getElementById("accountRua").value,
    cep: document.getElementById("accountCep").value,
    numero: document.getElementById("accountNumero").value,
    complemento: document.getElementById("accountComplemento").value,
    bairro: document.getElementById("accountBairro").value,
    cidade: document.getElementById("accountCidade").value,
    estado: document.getElementById("accountEstado").value,
  };

  if (editingAccount) {
    const payload = {
      ...addressFields,
      nome: document.getElementById("accountName").value,
      email: document.getElementById("accountEmail").value,
      telefone: document.getElementById("accountPhone").value,
      cpf_cnpj: document.getElementById("accountDocument").value,
    };
    const response = await fetch(`/admin/accounts/${editingAccount.tipo}/${editingAccount.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(response)) return;
    const result = await response.json();
    if (!response.ok) {
      showToast(result.detail || "Não foi possível salvar a conta.");
      return;
    }
    showToast("Conta atualizada.");
  } else {
    const payload = {
      ...addressFields,
      tipo: accountTypeSelect.value,
      nome: document.getElementById("accountName").value,
      email: document.getElementById("accountEmail").value,
      telefone: document.getElementById("accountPhone").value,
      cpf_cnpj: document.getElementById("accountDocument").value,
      senha: document.getElementById("accountPassword").value,
      foto: "",
    };
    const response = await fetch("/admin/accounts", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(response)) return;
    const result = await response.json();
    if (!response.ok) {
      showToast(result.detail || "Não foi possível criar a conta.");
      return;
    }
    showToast("Conta criada.");
  }

  accountModal.hidden = true;
  await loadAccounts();
});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  localStorage.removeItem("nearhand_admin_token");
  window.location.href = "/admin/login";
});

if (!token) {
  window.location.href = "/admin/login";
} else {
  loadAccounts();
}
