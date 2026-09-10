const token = localStorage.getItem("nearhand_admin_token");
const list = document.getElementById("adminServiceList");
const message = document.getElementById("adminMessage");
const searchInput = document.getElementById("adminServiceSearch");
const toast = document.getElementById("toast");
let allServices = [];
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

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function formatPrice(value) {
  return Number(value).toFixed(2).replace(".", ",");
}

function renderServiceList() {
  const term = searchInput.value.trim().toLowerCase();
  const services = term
    ? allServices.filter((s) => s.title.toLowerCase().includes(term) || s.provider.toLowerCase().includes(term))
    : allServices;
  list.replaceChildren();
  if (!allServices.length) {
    list.innerHTML = '<p class="field-help">Nenhum anúncio cadastrado ainda.</p>';
    return;
  }
  if (!services.length) {
    list.innerHTML = '<p class="field-help">Nenhum anúncio encontrado para essa busca.</p>';
    return;
  }
  const statusLabel = { ativo: "Ativo", pausado: "Pausado", removido: "Removido" };
  services.forEach((service) => {
    const row = document.createElement("article");
    row.className = "admin-service-row";
    row.dataset.id = service.id;
    const photoUrl = service.photos?.[0]?.url || "";
    row.innerHTML = `
      <input type="checkbox" class="admin-select" data-select title="Selecionar" />
      <div class="admin-service-thumb" style="background-image:url('${photoUrl}')"></div>
      <div>
        <strong>${service.title}</strong>
        <div class="field-help">${service.provider} • ${service.category} • R$ ${formatPrice(service.price)}${service.price_type === "por_hora" ? "/h" : ""}${service.negociavel ? " · Negociável" : ""}</div>
      </div>
      <span class="status ${service.status === "ativo" ? "done" : service.status === "pausado" ? "pending" : "cancelled"}">${statusLabel[service.status] || service.status}</span>
      <button class="small-btn" data-action="edit">Editar</button>
      <button class="small-btn reject" data-action="delete">Apagar</button>
    `;
    list.appendChild(row);
  });
  updateBulkRemoveButton();
}

const removeSelectedServicesBtn = document.getElementById("removeSelectedServicesBtn");

function getSelectedServiceIds() {
  return [...list.querySelectorAll(".admin-service-row")]
    .filter((row) => row.querySelector("[data-select]").checked)
    .map((row) => row.dataset.id);
}

function updateBulkRemoveButton() {
  const count = getSelectedServiceIds().length;
  removeSelectedServicesBtn.hidden = count === 0;
  removeSelectedServicesBtn.innerHTML = `<img class="icon" src="img/icons/icon-settings.png" alt="" /> Remover selecionados (${count})`;
}

list.addEventListener("change", (event) => {
  if (event.target.matches("[data-select]")) updateBulkRemoveButton();
});

removeSelectedServicesBtn.addEventListener("click", async () => {
  const ids = getSelectedServiceIds();
  if (!ids.length) return;
  if (!confirm(`Remover ${ids.length} anúncio(s) selecionado(s)? Isso também remove pedidos, mensagens e avaliações vinculados.`)) return;
  const results = await Promise.all(ids.map((id) => fetch(`/admin/services/${id}`, { method: "DELETE", headers: headers() })));
  if (results.some((r) => r.status === 401)) { handleUnauthorized(results.find((r) => r.status === 401)); return; }
  const failed = results.filter((r) => !r.ok).length;
  showToast(failed ? `${ids.length - failed} removido(s), ${failed} falharam.` : "Anúncios removidos.");
  await loadServices();
});

async function loadCategories() {
  const response = await fetch("/categories", { headers: headers() });
  if (handleUnauthorized(response)) return;
  allCategories = await response.json();
  const select = document.getElementById("editServiceCategory");
  select.replaceChildren();
  allCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.nome;
    select.appendChild(option);
  });
}

async function loadServices() {
  const response = await fetch("/admin/services", { headers: headers() });
  if (handleUnauthorized(response)) return;
  allServices = await response.json();
  renderServiceList();
}

searchInput.addEventListener("input", renderServiceList);

// ============================================
// Editar anúncio
// ============================================
const editServiceModal = document.getElementById("editServiceModal");
const editServiceForm = document.getElementById("editServiceForm");
const editServiceRadius = document.getElementById("editServiceRadius");
const editServiceRadiusLabel = document.getElementById("editServiceRadiusLabel");
let editingServiceId = null;

editServiceRadius.addEventListener("input", () => {
  editServiceRadiusLabel.textContent = `${editServiceRadius.value} km`;
});

function openEditModal(service) {
  editingServiceId = service.id;
  document.getElementById("editServiceTitle").value = service.title;
  document.getElementById("editServiceCategory").value = String(service.categoria_id);
  document.getElementById("editServiceDescription").value = service.description || "";
  document.getElementById("editServicePrice").value = service.price;
  document.getElementById("editServicePriceType").value = service.price_type;
  document.getElementById("editServiceNegotiable").checked = Boolean(service.negociavel);
  editServiceRadius.value = service.raio_atendimento_km;
  editServiceRadiusLabel.textContent = `${service.raio_atendimento_km} km`;
  document.getElementById("editServiceStatus").value = service.status;
  editServiceModal.hidden = false;
}

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

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = button.closest(".admin-service-row");
  const service = allServices.find((s) => s.id === Number(row.dataset.id));
  if (!service) return;

  if (button.dataset.action === "edit") {
    openEditModal(service);
  } else if (button.dataset.action === "delete") {
    if (!confirm(`Apagar o anúncio "${service.title}"?`)) return;
    const response = await fetch(`/admin/services/${service.id}`, { method: "DELETE", headers: headers() });
    if (handleUnauthorized(response)) return;
    const result = await response.json();
    if (!response.ok) {
      showToast(result.detail || "Não foi possível apagar o anúncio.");
      return;
    }
    showToast("Anúncio removido.");
    await loadServices();
  }
});

editServiceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingServiceId) return;
  const original = allServices.find((s) => s.id === editingServiceId);
  const payload = {
    titulo: document.getElementById("editServiceTitle").value.trim(),
    descricao: document.getElementById("editServiceDescription").value,
    categoria_id: Number(document.getElementById("editServiceCategory").value),
    valor: Number(document.getElementById("editServicePrice").value),
    tipo_valor: document.getElementById("editServicePriceType").value,
    negociavel: document.getElementById("editServiceNegotiable").checked,
    raio_atendimento_km: Number(editServiceRadius.value),
  };
  const response = await fetch(`/admin/services/${editingServiceId}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (handleUnauthorized(response)) return;
  const result = await response.json();
  if (!response.ok) {
    showToast(result.detail || "Não foi possível salvar o anúncio.");
    return;
  }

  const newStatus = document.getElementById("editServiceStatus").value;
  if (original && newStatus !== original.status) {
    const statusResponse = await fetch(`/admin/services/${editingServiceId}/status`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (handleUnauthorized(statusResponse)) return;
  }

  editServiceModal.hidden = true;
  showToast("Anúncio salvo.");
  await loadServices();
});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  localStorage.removeItem("nearhand_admin_token");
  window.location.href = "/admin/login";
});

if (!token) {
  window.location.href = "/admin/login";
} else {
  loadCategories();
  loadServices();
}
