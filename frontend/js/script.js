const favorites = new Set();
let favoriteServices = [];
let services = [];
let visibleServices = [];
let servicesRequest = null;
let servicesRequestTimer = null;

const cardsView = document.getElementById("cardsView");
const favoritesGrid = document.getElementById("favoritesGrid");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const ratingFilter = document.getElementById("ratingFilter");
const sortFilter = document.getElementById("sortFilter");
const radiusFilter = document.getElementById("radiusFilter");
const radiusLabel = document.getElementById("radiusLabel");
const toast = document.getElementById("toast");

const SERVICE_VISUALS = [
  ["⚡", "electric"],
  ["🧼", "clean"],
  ["💅", "beauty"],
  ["🔧", "plumber"],
  ["🪛", "assembly"],
];

function serviceVisual(service) {
  const index = Math.max(0, Number(service.categoria_id || service.id || 1) - 1) % SERVICE_VISUALS.length;
  const [icon, style] = SERVICE_VISUALS[index];
  return { icon, style };
}

function serviceQueryParams() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  if (search) params.set("busca", search);
  if (categoryFilter.value !== "all") params.set("categoria", categoryFilter.value);
  if (ratingFilter.value !== "0") params.set("avaliacao_min", ratingFilter.value);
  if (radiusFilter.value) params.set("raio_km", radiusFilter.value);
  if (mapCenter?.lat != null && mapCenter?.lng != null) {
    params.set("lat", mapCenter.lat);
    params.set("lng", mapCenter.lng);
  }
  params.set("ordenacao", sortFilter.value === "rating" ? "avaliacao" : sortFilter.value === "price" ? "preco" : "distancia");
  return params;
}

async function loadServices() {
  if (servicesRequest) servicesRequest.abort();
  servicesRequest = new AbortController();
  try {
    const response = await fetch(`/services?${serviceQueryParams()}`, { signal: servicesRequest.signal });
    if (!response.ok) throw new Error("Não foi possível carregar os serviços.");
    visibleServices = await response.json();
    services = [...visibleServices];
    renderCards();
    updateProximityMap();
  } catch (error) {
    if (error.name !== "AbortError") showToast(error.message);
  } finally {
    servicesRequest = null;
  }
}

function queueServicesLoad() {
  window.clearTimeout(servicesRequestTimer);
  servicesRequestTimer = window.setTimeout(loadServices, 300);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function formatPrice(value) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

// ============================================
// Categorias reais (vindas do backend, com contagem de serviços)
// ============================================
const CATEGORY_ICONS = {
  "Eletricista": "⚡",
  "Cabeleireiro": "💇",
  "Manicure": "💅",
  "Pedicure": "🦶",
  "Marido de Aluguel": "🛠️",
};
function categoryIcon(name) {
  return CATEGORY_ICONS[name] || "🔧";
}

let categoriesData = [];

function renderCategorySidebar() {
  const container = document.getElementById("categoryItemsList");
  container.replaceChildren();
  categoriesData.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-item";
    button.dataset.category = category.nome;
    const count = category.servico_count;
    button.innerHTML = `
      <span>${categoryIcon(category.nome)}</span>
      <div><strong>${category.nome}</strong><small>${count} serviço${count === 1 ? "" : "s"}</small></div>
    `;
    container.appendChild(button);
  });
}

function renderCategoryFilterOptions() {
  categoryFilter.querySelectorAll("option:not([value='all'])").forEach((option) => option.remove());
  categoriesData.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.nome;
    option.textContent = category.nome;
    categoryFilter.appendChild(option);
  });
}

function renderAdCategoryOptions() {
  const adCategory = document.getElementById("adCategory");
  adCategory.replaceChildren();
  categoriesData.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.nome;
    adCategory.appendChild(option);
  });
}

async function loadCategories() {
  try {
    const response = await fetch("/categories/public");
    categoriesData = await response.json();
  } catch {
    categoriesData = [];
  }
  renderCategorySidebar();
  renderCategoryFilterOptions();
  renderAdCategoryOptions();
}

function serviceCard(service) {
  const isFavorite = favorites.has(service.prestador_id);
  const visual = serviceVisual(service);
  const distance = service.distance == null ? "Distância indisponível" : `📍 ${service.distance.toFixed(1).replace(".", ",")} km`;
  const card = document.createElement("article");
  card.className = "service-card";
  card.dataset.id = service.id;
  card.innerHTML = `
    <div class="service-image ${visual.style}">
      <span aria-hidden="true">${visual.icon}</span>
      <button class="favorite-btn ${isFavorite ? "active" : ""}" data-action="favorite" aria-label="${isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        ${isFavorite ? "♥" : "♡"}
      </button>
    </div>
    <div class="service-body">
      <div class="service-topline">
        <span class="service-pill">${service.category}</span>
        <span class="distance">${distance}</span>
      </div>
      <h3>${service.title}</h3>
      <p class="provider-name">${service.provider}</p>
      <div class="rating-row">
        <span class="rating">⭐ <strong>${service.rating.toFixed(1).replace(".", ",")}</strong> (${service.reviews})</span>
        <span class="price">a partir de <strong>R$ ${formatPrice(service.price)}</strong>${service.unit}</span>
      </div>
      <button class="primary-btn service-action" data-action="details">Ver serviço</button>
    </div>
  `;
  return card;
}

function renderCards() {
  cardsView.replaceChildren();
  visibleServices.forEach((service) => cardsView.appendChild(serviceCard(service)));
  resultCount.textContent = `${visibleServices.length} serviço${visibleServices.length === 1 ? "" : "s"} encontrado${visibleServices.length === 1 ? "" : "s"}`;
}

function renderFavorites() {
  favoritesGrid.replaceChildren();
  favoriteServices.forEach((service) => {
    favoritesGrid.appendChild(serviceCard(service));
  });
  if (!favoriteServices.length) {
    favoritesGrid.innerHTML = "<p class=\"empty-state\">Você ainda não adicionou prestadores aos favoritos.</p>";
  }
}

async function loadFavorites() {
  if (currentSessionRole !== "cliente") return;
  try {
    const response = await authFetch("/clientes/me/favoritos");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar os favoritos.");
    favoriteServices = data;
    favorites.clear();
    favoriteServices.forEach((service) => favorites.add(service.prestador_id));
    renderCards();
    renderFavorites();
  } catch (error) {
    showToast(error.message);
  }
}

function applyFilters() {
  queueServicesLoad();
}

function showServiceDetails(service) {
  document.getElementById("modalCategory").textContent = service.category;
  document.getElementById("serviceTitle").textContent = service.title;
  document.getElementById("modalProvider").textContent = service.provider;
  document.getElementById("modalRating").textContent = `⭐ ${service.rating.toFixed(1).replace(".", ",")} (${service.reviews} avaliações)`;
  document.getElementById("modalDistance").textContent = `📍 ${service.distance.toFixed(1).replace(".", ",")} km`;
  document.getElementById("modalPrice").textContent = `💳 R$ ${formatPrice(service.price)}${service.unit}`;
  const firstPhoto = service.photos?.[0]?.url;
  const galleryMain = document.getElementById("galleryMain");
  galleryMain.textContent = firstPhoto ? "" : serviceVisual(service).icon;
  galleryMain.style.backgroundImage = firstPhoto ? `url("${firstPhoto}")` : "";
  galleryMain.style.backgroundSize = firstPhoto ? "cover" : "";
  document.getElementById("serviceModal").hidden = false;
}

function handleCardAction(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const card = event.target.closest(".service-card");
  if (!action || !card) return;
  const service = [...services, ...favoriteServices]
    .find((item) => item.id === Number(card.dataset.id));
  if (!service) return;

  if (action === "favorite") {
    updateFavorite(service);
    return;
  }
  showServiceDetails(service);
}

async function updateFavorite(service) {
  const isFavorite = favorites.has(service.prestador_id);
  try {
    const response = isFavorite
      ? await authFetch(`/favoritos/${service.prestador_id}`, { method: "DELETE" })
      : await authFetch("/favoritos", {
        method: "POST",
        body: JSON.stringify({ prestador_id: service.prestador_id }),
      });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível atualizar o favorito.");
    if (isFavorite) {
      favorites.delete(service.prestador_id);
      favoriteServices = favoriteServices.filter((item) => item.prestador_id !== service.prestador_id);
    } else {
      favorites.add(service.prestador_id);
      favoriteServices.push(service);
    }
    renderCards();
    renderFavorites();
  } catch (error) {
    showToast(error.message);
  }
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop").forEach((modal) => { modal.hidden = true; });
}

cardsView.addEventListener("click", handleCardAction);
favoritesGrid.addEventListener("click", handleCardAction);
[searchInput, categoryFilter, ratingFilter, sortFilter, radiusFilter].forEach((control) => {
  control.addEventListener("input", applyFilters);
  control.addEventListener("change", applyFilters);
});
radiusFilter.addEventListener("input", () => {
  radiusLabel.textContent = `${radiusFilter.value} km`;
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => { document.getElementById(button.dataset.close).hidden = true; });
});
document.querySelectorAll(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.hidden = true;
  });
});
document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  ratingFilter.value = "0";
  sortFilter.value = "distance";
  radiusFilter.value = "10";
  radiusLabel.textContent = "10 km";
  applyFilters();
});
document.querySelector(".categories-card").addEventListener("click", (event) => {
  const button = event.target.closest(".category-item");
  if (!button) return;
  document.querySelectorAll(".category-item").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  categoryFilter.value = button.dataset.category;
  applyFilters();
});

const categorySearchInput = document.getElementById("categorySearchInput");
categorySearchInput.addEventListener("input", () => {
  const term = categorySearchInput.value.trim().toLowerCase();
  document.querySelectorAll(".category-item").forEach((item) => {
    const name = item.querySelector("strong")?.textContent.toLowerCase() ?? "";
    item.hidden = term.length > 0 && !name.includes(term);
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});

// ============================================
// Alternância Cards / Mapa
// ============================================
const mapViewSection = document.getElementById("mapView");
const viewToggleButtons = document.querySelectorAll("#exploreViewToggle .toggle-btn");

viewToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    viewToggleButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    const mode = button.dataset.mode;
    cardsView.hidden = mode !== "cards";
    mapViewSection.hidden = mode !== "map";
    if (mode === "map") openProximityMap();
  });
});

// ============================================
// Mapa de proximidade (Leaflet + OpenStreetMap)
// ============================================
const DEFAULT_MAP_CENTER = { lat: -22.9099, lng: -47.0626 }; // Campinas, SP (fallback)

let proximityMap = null;
let youMarker = null;
let radarCircles = [];
let mapCenter = null;
const serviceMarkers = new Map();

// Corrige os ícones padrão do Leaflet ao carregar via CDN.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function drawRadar(center, radiusKm) {
  radarCircles.forEach((circle) => circle.remove());
  radarCircles = [0.34, 0.67, 1].map((fraction, index) => {
    const isOuter = index === 2;
    return L.circle([center.lat, center.lng], {
      radius: radiusKm * 1000 * fraction,
      color: "#4D3E6B",
      weight: isOuter ? 2 : 1,
      dashArray: isOuter ? null : "4 6",
      fillColor: "#8174C9",
      fillOpacity: isOuter ? 0.06 : 0.03,
    }).addTo(proximityMap);
  });
}

function renderMapSidebar() {
  const mapSidebar = document.getElementById("mapSidebar");
  mapSidebar.replaceChildren();
  if (!visibleServices.length) {
    mapSidebar.innerHTML = "<p class=\"empty-state\">Nenhum serviço dentro do raio selecionado.</p>";
    return;
  }
  visibleServices.forEach((service) => {
    const card = document.createElement("div");
    card.className = "map-mini";
    const distance = service.distance == null
      ? "distância indisponível"
      : `${service.distance.toFixed(1).replace(".", ",")} km`;
    card.innerHTML = `
      <strong>${service.title}</strong>
      <small>${service.provider} • 📍 ${distance}</small>
      <button class="ghost-btn" data-focus="${service.id}">Ver no mapa</button>
    `;
    mapSidebar.appendChild(card);
  });
}

function renderServiceMarkers() {
  serviceMarkers.forEach((marker) => marker.remove());
  serviceMarkers.clear();
  visibleServices.forEach((service) => {
    if (service.lat == null || service.lng == null) return;
    const marker = L.marker([service.lat, service.lng]).addTo(proximityMap);
    marker.bindPopup(
      `<strong>${service.title}</strong><br>${service.provider}<br>⭐ ${service.rating.toFixed(1).replace(".", ",")} · R$ ${formatPrice(service.price)}${service.unit}`
    );
    marker.on("click", () => showServiceDetails(service));
    serviceMarkers.set(service.id, marker);
  });
  renderMapSidebar();
}

function updateProximityMap() {
  if (!proximityMap || !mapCenter) return;
  drawRadar(mapCenter, Number(radiusFilter.value));
  renderServiceMarkers();
}

function initProximityMap(center) {
  mapCenter = center;
  proximityMap = L.map("proximityMap", { zoomControl: true }).setView([center.lat, center.lng], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(proximityMap);

  youMarker = L.marker([center.lat, center.lng], {
    icon: L.divIcon({ className: "you-marker", iconSize: [16, 16] }),
  })
    .addTo(proximityMap)
    .bindPopup("Você está aqui");

  updateProximityMap();
  loadServices();
}

function openProximityMap() {
  if (proximityMap) {
    proximityMap.invalidateSize();
    return;
  }
  if (!navigator.geolocation) {
    showToast("Geolocalização não suportada neste navegador. Mostrando Campinas, SP.");
    initProximityMap(DEFAULT_MAP_CENTER);
    return;
  }
  showToast("Buscando sua localização...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      initProximityMap({ lat: position.coords.latitude, lng: position.coords.longitude });
    },
    () => {
      showToast("Não foi possível acessar sua localização. Mostrando Campinas, SP.");
      initProximityMap(DEFAULT_MAP_CENTER);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

document.getElementById("mapSidebar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-focus]");
  if (!button || !proximityMap) return;
  const service = services.find((item) => item.id === Number(button.dataset.focus));
  if (!service) return;
  proximityMap.setView([service.lat, service.lng], 15);
  serviceMarkers.get(service.id)?.openPopup();
});

// ============================================
// Sessão: protege a página e preenche o perfil
// ============================================
const profileBtn = document.getElementById("profileBtn");
let currentSessionRole = null;

function updateStoredUser(partial) {
  const current = JSON.parse(localStorage.getItem("nearhand_user") || "{}");
  const updated = { ...current, ...partial };
  localStorage.setItem("nearhand_user", JSON.stringify(updated));

  const initials = (updated.nome || "NH")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  document.querySelector("#profileBtn .avatar").textContent = initials || "NH";
  document.querySelector("#profileBtn .profile-copy strong").textContent = updated.nome || "Minha conta";
  document.querySelector("#profileBtn .profile-copy small").textContent = updated.email || "";
}

function initSession() {
  const token = localStorage.getItem("nearhand_access_token");
  const userRaw = localStorage.getItem("nearhand_user");
  if (!token || !userRaw) {
    window.location.href = "/auth";
    return null;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    window.location.href = "/auth";
    return null;
  }

  updateStoredUser(user);
  currentSessionRole = localStorage.getItem("nearhand_user_type") || "cliente";
  return currentSessionRole;
}

function logout() {
  localStorage.removeItem("nearhand_access_token");
  localStorage.removeItem("nearhand_user");
  localStorage.removeItem("nearhand_user_type");
  window.location.href = "/auth";
}

async function authFetch(path, options = {}) {
  const token = localStorage.getItem("nearhand_access_token");
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return response;
}

async function switchAccountRole(targetRole) {
  let email = "";
  try {
    email = JSON.parse(localStorage.getItem("nearhand_user") || "{}").email || "";
  } catch {
    email = "";
  }

  let mode = "cadastro";
  if (email) {
    try {
      const response = await fetch(`/auth/account-exists?tipo=${encodeURIComponent(targetRole)}&email=${encodeURIComponent(email)}`);
      const data = await response.json();
      mode = data.exists ? "login" : "cadastro";
    } catch {
      mode = "login";
    }
  }
  window.location.href = `/auth?tipo=${targetRole}&modo=${mode}`;
}

// ============================================
// Alternância entre Cliente / Prestador / Configurações
// ============================================
const clienteView = document.getElementById("clienteView");
const providerView = document.getElementById("providerView");
const settingsView = document.getElementById("settingsView");
const topRoleButtons = document.querySelectorAll(".top-actions .role-switch .role-btn");

const mainNav = document.querySelector(".main-nav:not(.provider-nav)");
const providerNav = document.querySelector(".provider-nav");

function showAppView(view) {
  clienteView.hidden = view !== "cliente";
  providerView.hidden = view !== "prestador";
  settingsView.hidden = view !== "settings";
  mainNav.hidden = view !== "cliente";
  providerNav.hidden = view !== "prestador";
}

function setActiveRole(role) {
  showAppView(role);
  topRoleButtons.forEach((button) => button.classList.toggle("active", button.dataset.role === role));
}

topRoleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.role === currentSessionRole) return;
    switchAccountRole(button.dataset.role);
  });
});

profileBtn.addEventListener("click", () => {
  showAppView("settings");
  loadSettingsProfile();
});

// ============================================
// Navegação entre seções (Explorar / Agenda / Pedidos / Favoritos)
// ============================================
const navLinks = document.querySelectorAll(".main-nav:not(.provider-nav) .nav-link");
const sectionViews = document.querySelectorAll(".section-view");

function setActiveSection(section) {
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.section === section));
  sectionViews.forEach((view) => { view.hidden = view.dataset.view !== section; });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveSection(link.dataset.section));
});

// ============================================
// Navegação do prestador (Painel / Agenda / Anúncios / Avaliações)
// ============================================
const providerNavLinks = document.querySelectorAll(".provider-nav .nav-link");
const providerSectionViews = document.querySelectorAll(".provider-section");

function setActiveProviderSection(section) {
  providerNavLinks.forEach((link) => link.classList.toggle("active", link.dataset.providerSection === section));
  providerSectionViews.forEach((view) => { view.hidden = view.dataset.providerView !== section; });
}

providerNavLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveProviderSection(link.dataset.providerSection));
});

// ============================================
// Notificações
// ============================================
const notificationBtn = document.getElementById("notificationBtn");
const notificationsPopover = document.getElementById("notificationsPopover");

notificationBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  notificationsPopover.hidden = !notificationsPopover.hidden;
});
document.addEventListener("click", (event) => {
  if (!notificationsPopover.hidden && !notificationsPopover.contains(event.target) && event.target !== notificationBtn) {
    notificationsPopover.hidden = true;
  }
});
document.querySelector(".popover-head .text-btn").addEventListener("click", () => {
  document.querySelector("#notificationBtn .badge")?.remove();
  notificationsPopover.hidden = true;
  showToast("Notificações marcadas como lidas.");
});

// ============================================
// Modal de serviço: solicitar e abrir chat
// ============================================
document.getElementById("hireBtn").addEventListener("click", () => {
  document.getElementById("serviceModal").hidden = true;
  showToast("Solicitação enviada! Acompanhe em Pedidos.");
});
document.getElementById("openChatBtn").addEventListener("click", () => {
  document.getElementById("serviceModal").hidden = true;
  document.getElementById("chatModal").hidden = false;
});

// ============================================
// Chat (mensagens locais, sem backend ainda)
// ============================================
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  const bubble = document.createElement("div");
  bubble.className = "message me";
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatInput.value = "";
});

// ============================================
// Pedidos (histórico do cliente)
// ============================================
document.querySelectorAll(".table-card .text-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const label = button.textContent.trim();
    if (label === "Abrir chat") {
      document.getElementById("chatModal").hidden = false;
    } else if (label === "Avaliar") {
      const rating = prompt("Dê uma nota de 1 a 5 para este serviço:");
      if (rating) showToast("Obrigado pela avaliação!");
    } else {
      showToast("Detalhes completos chegam em uma próxima etapa.");
    }
  });
});

// ============================================
// Painel do prestador: solicitações recebidas
// ============================================
const requestList = document.getElementById("requestList");

requestList.addEventListener("click", (event) => {
  const button = event.target.closest(".small-btn");
  if (!button) return;
  const item = button.closest(".request-item");
  if (!item) return;
  const clientName = item.querySelector("strong")?.textContent ?? "Solicitação";

  if (button.classList.contains("accept")) {
    showToast(`Solicitação de ${clientName} aceita.`);
    item.remove();
  } else if (button.classList.contains("reject")) {
    showToast(`Solicitação de ${clientName} recusada.`);
    item.remove();
  } else {
    showToast("Envie sua proposta de valor/horário pelo chat.");
  }
});

// ============================================
// Painel do prestador: meus anúncios
// ============================================
const adList = document.getElementById("adList");
const newAdModal = document.getElementById("newAdModal");
const newAdForm = document.getElementById("newAdForm");
const adRadius = document.getElementById("adRadius");
const adRadiusLabel = document.getElementById("adRadiusLabel");

document.getElementById("newAdBtn").addEventListener("click", () => {
  adPhotos = [];
  renderAdPhotosGrid();
  newAdModal.hidden = false;
});

// ============================================
// Fotos do anúncio: arrastar ou clicar para enviar arquivos
// ============================================
const adPhotosDropzone = document.getElementById("adPhotosDropzone");
const adPhotosGrid = document.getElementById("adPhotosGrid");
const adPhotosEmpty = document.getElementById("adPhotosEmpty");
const adPhotoFile = document.getElementById("adPhotoFile");
let adPhotos = [];

function renderAdPhotosGrid() {
  adPhotosGrid.replaceChildren();
  adPhotos.forEach((url, index) => {
    const thumb = document.createElement("div");
    thumb.className = "ad-photo-thumb";
    thumb.innerHTML = `<img src="${url}" alt="Foto ${index + 1}" /><button type="button" class="ad-photo-remove" data-index="${index}" aria-label="Remover foto">×</button>`;
    adPhotosGrid.appendChild(thumb);
  });
  adPhotosEmpty.hidden = adPhotos.length > 0;
}

adPhotosGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".ad-photo-remove");
  if (!button) return;
  event.stopPropagation();
  adPhotos.splice(Number(button.dataset.index), 1);
  renderAdPhotosGrid();
});

function resizeImageFile(file, size = 480) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addAdPhotos(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
  for (const file of files) {
    adPhotos.push(await resizeImageFile(file));
  }
  renderAdPhotosGrid();
}

adPhotosDropzone.addEventListener("click", () => adPhotoFile.click());
adPhotoFile.addEventListener("change", async (event) => {
  await addAdPhotos(event.target.files);
  event.target.value = "";
});
adPhotosDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  adPhotosDropzone.classList.add("dragover");
});
adPhotosDropzone.addEventListener("dragleave", () => adPhotosDropzone.classList.remove("dragover"));
adPhotosDropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  adPhotosDropzone.classList.remove("dragover");
  await addAdPhotos(event.dataTransfer.files);
});

adRadius?.addEventListener("input", () => {
  adRadiusLabel.textContent = `${adRadius.value} km`;
});

adList.addEventListener("click", (event) => {
  const button = event.target.closest(".icon-btn");
  if (!button) return;
  const item = button.closest(".ad-item");
  if (!item) return;
  const serviceId = item.dataset.serviceId;
  const status = item.querySelector(".status");

  if (button.classList.contains("ad-pause")) {
    const isPaused = status.textContent.trim() === "Pausado";
    authFetch(`/services/${serviceId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: isPaused ? "ativo" : "pausado" }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível atualizar o anúncio.");
      await loadProviderServices();
      showToast(isPaused ? "Anúncio reativado." : "Anúncio pausado.");
    }).catch((error) => showToast(error.message));
  } else if (button.classList.contains("ad-remove")) {
    if (confirm("Remover este anúncio?")) {
      authFetch(`/services/${serviceId}`, { method: "DELETE" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Não foi possível remover o anúncio.");
        await loadProviderServices();
        showToast("Anúncio removido.");
      }).catch((error) => showToast(error.message));
    }
  }
});

async function loadProviderServices() {
  if (currentSessionRole !== "prestador") return;
  try {
    const response = await authFetch("/services/mine");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar seus anúncios.");
    adList.replaceChildren();
    data.forEach((service) => {
      const item = document.createElement("article");
      item.className = "ad-item";
      item.dataset.serviceId = service.id;
      item.innerHTML = `
        <div class="ad-thumb electric" style="background-image:url('${service.photos?.[0]?.url || ""}');background-size:cover;background-position:center">${service.photos?.[0]?.url ? "" : serviceVisual(service).icon}</div>
        <div><strong>${service.title}</strong><small>R$ ${formatPrice(service.price)} ${service.price_type === "por_hora" ? "por hora" : "fixo"} • Raio de ${service.raio_atendimento_km} km</small></div>
        <span class="status ${service.status === "ativo" ? "done" : "pending"}">${service.status === "ativo" ? "Ativo" : service.status === "pausado" ? "Pausado" : "Removido"}</span>
        <button class="icon-btn ad-pause" title="Pausar ou reativar" ${service.status === "removido" ? "disabled" : ""}>⏸</button>
        <button class="icon-btn ad-remove" title="Remover" ${service.status === "removido" ? "disabled" : ""}>🗑</button>
      `;
      adList.appendChild(item);
    });
  } catch (error) {
    showToast(error.message);
  }
}

newAdForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.getElementById("adTitle").value.trim();
  const price = document.getElementById("adPrice").value;
  const priceType = document.getElementById("adPriceType").value;
  const radius = document.getElementById("adRadius").value;
  if (!title || !price) return;
  if (adPhotos.length < 2) {
    showToast("Adicione pelo menos 2 fotos para publicar o anúncio.");
    return;
  }

  try {
    const response = await authFetch("/services", {
      method: "POST",
      body: JSON.stringify({
        titulo: title,
        descricao: document.getElementById("adDescription").value,
        categoria_id: Number(document.getElementById("adCategory").value),
        valor: Number(price),
        tipo_valor: priceType,
        raio_atendimento_km: Number(radius),
        fotos: adPhotos,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível publicar o anúncio.");
    newAdModal.hidden = true;
    newAdForm.reset();
    adPhotos = [];
    renderAdPhotosGrid();
    await loadProviderServices();
    showToast("Anúncio publicado.");
  } catch (error) {
    showToast(error.message);
  }
});

// ============================================
// Painel do prestador: avaliações
// ============================================
document.querySelectorAll(".review .text-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const reply = prompt("Escreva sua resposta pública para esta avaliação:");
    if (reply) showToast("Resposta publicada.");
  });
});

// ============================================
// Configurações
// ============================================
const clientProfileForm = document.getElementById("clientProfileForm");
const providerProfileForm = document.getElementById("providerProfileForm");
const settingsPreferences = document.getElementById("settingsPreferences");
let settingsProfile = null;

document.getElementById("settingsBackBtn").addEventListener("click", () => {
  setActiveRole(currentSessionRole);
});
document.getElementById("settingsLogoutBtn").addEventListener("click", () => {
  if (confirm("Sair da sua conta?")) logout();
});

function setSettingsRoleVisibility(role) {
  const isProvider = role === "prestador";
  clientProfileForm.hidden = isProvider;
  providerProfileForm.hidden = !isProvider;
  document.getElementById("clientPreferencesCard").hidden = isProvider;
  document.getElementById("clientPaymentCard").hidden = isProvider;
  document.getElementById("providerPaymentCard").hidden = !isProvider;

  document.getElementById("accountRoleSummary").textContent =
    `Você está logado como ${isProvider ? "Prestador" : "Cliente"}.`;
  document.getElementById("switchAccountBtn").textContent =
    `Entrar como ${isProvider ? "Cliente" : "Prestador"}`;
}

function fillAddressFields(prefix, address) {
  document.getElementById(`${prefix}Rua`).value = address.rua || "";
  document.getElementById(`${prefix}Cep`).value = address.cep || "";
  document.getElementById(`${prefix}Numero`).value = address.numero || "";
  document.getElementById(`${prefix}Complemento`).value = address.complemento || "";
  document.getElementById(`${prefix}Bairro`).value = address.bairro || "";
  document.getElementById(`${prefix}Cidade`).value = address.cidade || "";
  document.getElementById(`${prefix}Estado`).value = address.estado || "";
}

function readAddressFields(prefix) {
  return {
    rua: document.getElementById(`${prefix}Rua`).value,
    cep: document.getElementById(`${prefix}Cep`).value,
    numero: document.getElementById(`${prefix}Numero`).value,
    complemento: document.getElementById(`${prefix}Complemento`).value,
    bairro: document.getElementById(`${prefix}Bairro`).value,
    cidade: document.getElementById(`${prefix}Cidade`).value,
    estado: document.getElementById(`${prefix}Estado`).value,
  };
}

function setupPhotoDropzone({ dropzoneId, fileId, previewId, emptyId }) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(fileId);
  const preview = document.getElementById(previewId);
  const empty = document.getElementById(emptyId);
  let value = "";

  function updatePreview() {
    if (value) {
      preview.src = value;
      preview.hidden = false;
      empty.hidden = true;
    } else {
      preview.hidden = true;
      empty.hidden = false;
    }
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        value = canvas.toDataURL("image/jpeg", 0.82);
        updatePreview();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    handleFile(event.dataTransfer.files[0]);
  });

  updatePreview();

  return {
    getValue: () => value,
    setValue: (newValue) => { value = newValue || ""; updatePreview(); },
  };
}

const cpPhotoPicker = setupPhotoDropzone({
  dropzoneId: "cpPhotoDropzone",
  fileId: "cpPhotoFile",
  previewId: "cpPhotoPreview",
  emptyId: "cpPhotoEmpty",
});

let settingsCategories = [];

async function loadSettingsCategories() {
  if (settingsCategories.length) return settingsCategories;
  try {
    const response = await fetch("/categories/public");
    settingsCategories = await response.json();
  } catch {
    settingsCategories = [];
  }
  return settingsCategories;
}

function renderSettingsPreferenceChips(selected) {
  settingsPreferences.replaceChildren();
  settingsCategories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preference-chip";
    chip.dataset.value = category.nome;
    chip.classList.toggle("active", selected.includes(category.nome));
    chip.innerHTML = category.servico_count > 0
      ? `${category.nome} <span class="trending-badge">🔥</span>`
      : category.nome;
    settingsPreferences.appendChild(chip);
  });
}

async function loadSettingsProfile() {
  setSettingsRoleVisibility(currentSessionRole);
  try {
    const path = currentSessionRole === "prestador" ? "/prestadores/me" : "/clientes/me";
    const response = await authFetch(path);
    settingsProfile = await response.json();

    if (currentSessionRole === "prestador") {
      document.getElementById("ppName").value = settingsProfile.nome || "";
      fillAddressFields("pp", settingsProfile);
      document.getElementById("ppPhone").value = settingsProfile.telefone || "";
      document.getElementById("ppEmail").value = settingsProfile.email || "";
      document.getElementById("ppDocument").value = settingsProfile.cpf_cnpj || "";
    } else {
      document.getElementById("cpName").value = settingsProfile.nome || "";
      cpPhotoPicker.setValue(settingsProfile.foto || "");
      fillAddressFields("cp", settingsProfile);
      document.getElementById("cpPhone").value = settingsProfile.telefone || "";
      document.getElementById("cpEmail").value = settingsProfile.email || "";
      await loadSettingsCategories();
      renderSettingsPreferenceChips(settingsProfile.preferencias || []);
    }
  } catch (error) {
    showToast(error.message || "Não foi possível carregar seu perfil.");
  }
}

settingsPreferences.addEventListener("click", (event) => {
  const chip = event.target.closest(".preference-chip");
  if (chip) chip.classList.toggle("active");
});

clientProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const preferencias = Array.from(settingsPreferences.querySelectorAll(".preference-chip.active"))
    .map((chip) => chip.dataset.value);
  const payload = {
    nome: document.getElementById("cpName").value,
    email: document.getElementById("cpEmail").value,
    telefone: document.getElementById("cpPhone").value,
    foto: cpPhotoPicker.getValue(),
    ...readAddressFields("cp"),
    preferencias,
  };
  try {
    const response = await authFetch("/clientes/me", { method: "PUT", body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o perfil.");
    settingsProfile = data;
    updateStoredUser({ nome: data.nome, email: data.email });
    showToast("Perfil atualizado.");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("savePreferencesBtn").addEventListener("click", () => {
  clientProfileForm.requestSubmit();
});

providerProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    nome: document.getElementById("ppName").value,
    email: document.getElementById("ppEmail").value,
    telefone: document.getElementById("ppPhone").value,
    cpf_cnpj: document.getElementById("ppDocument").value,
    ...readAddressFields("pp"),
  };
  try {
    const response = await authFetch("/prestadores/me", { method: "PUT", body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o perfil.");
    settingsProfile = data;
    updateStoredUser({ nome: data.nome, email: data.email });
    showToast("Perfil atualizado.");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("paymentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Método de pagamento salvo. Em breve isso fica salvo no banco de dados.");
});
document.getElementById("receivingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Método de recebimento salvo. Em breve isso fica salvo no banco de dados.");
});
document.getElementById("goToAdsBtn").addEventListener("click", () => {
  setActiveRole("prestador");
  setActiveProviderSection("anuncios");
});
document.getElementById("switchAccountBtn").addEventListener("click", () => {
  switchAccountRole(currentSessionRole === "prestador" ? "cliente" : "prestador");
});

// ============================================
// Botões ainda sem tela dedicada
// ============================================
document.querySelectorAll(".panel-head .text-btn").forEach((button) => {
  if (button.textContent.trim() === "Ver todos") {
    button.addEventListener("click", () => showToast("Isso chega em uma próxima etapa."));
  }
});
document.querySelector(".results-head .ghost-btn")?.addEventListener("click", () => {
  showToast("Preferências de busca chegam em uma próxima etapa.");
});

// ============================================
// Calendários (cliente e prestador)
// ============================================
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const today = new Date();

function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: daysInPrevMonth - firstWeekday + 1 + i, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, outside: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, outside: true });
  }
  return cells;
}

function renderCalendar({ gridEl, labelEl, date, events }) {
  labelEl.textContent = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  gridEl.replaceChildren();
  buildMonthCells(date.getFullYear(), date.getMonth()).forEach((cell) => {
    const cellEl = document.createElement("div");
    cellEl.className = "calendar-day";
    cellEl.textContent = cell.day;
    if (cell.outside) {
      cellEl.classList.add("outside");
    } else {
      const isToday = today.getFullYear() === date.getFullYear()
        && today.getMonth() === date.getMonth()
        && today.getDate() === cell.day;
      if (isToday) cellEl.classList.add("today");

      const dayEvent = events.find((event) => event.day === cell.day);
      if (dayEvent) {
        cellEl.classList.add("has-event");
        cellEl.title = dayEvent.label;
        cellEl.addEventListener("click", () => showToast(dayEvent.label));
      }
    }
    gridEl.appendChild(cellEl);
  });
}

const CLIENT_EVENTS = [
  { day: 8, label: "Eletricista residencial — 09:00 • Marcos Elétrica" },
  { day: 11, label: "Limpeza completa — 14:30 • Brilho Certo" },
];
let clientCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);

function renderClientCalendar() {
  const isCurrentMonth = clientCalendarDate.getMonth() === today.getMonth()
    && clientCalendarDate.getFullYear() === today.getFullYear();
  renderCalendar({
    gridEl: document.getElementById("clientCalendar"),
    labelEl: document.getElementById("clientCalendarLabel"),
    date: clientCalendarDate,
    events: isCurrentMonth ? CLIENT_EVENTS : [],
  });
}

document.getElementById("clientCalendarPrev").addEventListener("click", () => {
  clientCalendarDate = new Date(clientCalendarDate.getFullYear(), clientCalendarDate.getMonth() - 1, 1);
  renderClientCalendar();
});
document.getElementById("clientCalendarNext").addEventListener("click", () => {
  clientCalendarDate = new Date(clientCalendarDate.getFullYear(), clientCalendarDate.getMonth() + 1, 1);
  renderClientCalendar();
});

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const PROVIDER_EVENTS = [
  { date: addDays(today, 0), label: "3 serviços hoje: Troca de disjuntor, Visita técnica, Instalação de luminária" },
  { date: addDays(today, 1), label: "Instalação de luminária — 09:00 • Rafael Braga" },
  { date: addDays(today, 4), label: "Manutenção elétrica — 10:00 • Ana Costa" },
  { date: addDays(today, 9), label: "Revisão de quadro de força — 14:00 • Marina Sales" },
  { date: addDays(today, 16), label: "Instalação de tomadas — 11:00 • Fernanda Lopes" },
  { date: addDays(today, 35), label: "Instalação residencial completa — 09:00 • Novo cliente" },
];

function eventsOnDate(date) {
  return PROVIDER_EVENTS.filter((event) => isSameDate(event.date, date));
}

let providerAgendaMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
let providerAgendaWeekDate = new Date(today);

function renderProviderMonth() {
  const gridEl = document.getElementById("providerAgendaMonthGrid");
  const labelEl = document.getElementById("providerAgendaMonthLabel");
  labelEl.textContent = `${MONTH_NAMES[providerAgendaMonthDate.getMonth()]} ${providerAgendaMonthDate.getFullYear()}`;
  gridEl.replaceChildren();
  buildMonthCells(providerAgendaMonthDate.getFullYear(), providerAgendaMonthDate.getMonth()).forEach((cell) => {
    const cellEl = document.createElement("div");
    cellEl.className = "calendar-day";
    cellEl.textContent = cell.day;
    if (cell.outside) {
      cellEl.classList.add("outside");
    } else {
      const cellDate = new Date(providerAgendaMonthDate.getFullYear(), providerAgendaMonthDate.getMonth(), cell.day);
      if (isSameDate(cellDate, today)) cellEl.classList.add("today");
      const dayEvents = eventsOnDate(cellDate);
      if (dayEvents.length) {
        cellEl.classList.add("has-event");
        cellEl.title = dayEvents.map((event) => event.label).join(" | ");
        cellEl.addEventListener("click", () => dayEvents.forEach((event) => showToast(event.label)));
      }
    }
    gridEl.appendChild(cellEl);
  });
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function renderProviderWeek() {
  const gridEl = document.getElementById("providerAgendaWeekGrid");
  const labelEl = document.getElementById("providerAgendaWeekLabel");
  const start = startOfWeek(providerAgendaWeekDate);
  const end = addDays(start, 6);
  const shortDate = (date) => `${String(date.getDate()).padStart(2, "0")} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
  labelEl.textContent = `${shortDate(start)} – ${shortDate(end)} ${end.getFullYear()}`;

  gridEl.replaceChildren();
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const cell = document.createElement("div");
    cell.className = "week-day";
    if (isSameDate(day, today)) cell.classList.add("today");
    cell.innerHTML = `
      <div class="week-day-label">${dayLabels[i]}</div>
      <div class="week-day-number">${day.getDate()}</div>
    `;
    eventsOnDate(day).forEach((event) => {
      const chip = document.createElement("div");
      chip.className = "week-event";
      chip.textContent = event.label;
      chip.addEventListener("click", () => showToast(event.label));
      cell.appendChild(chip);
    });
    gridEl.appendChild(cell);
  }
}

function renderProviderUpcoming() {
  const list = document.getElementById("providerUpcomingList");
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = PROVIDER_EVENTS
    .filter((event) => event.date >= startOfToday)
    .sort((a, b) => a.date - b.date);

  list.replaceChildren();
  if (!upcoming.length) {
    list.innerHTML = '<p class="empty-state">Nenhum serviço agendado.</p>';
    return;
  }
  upcoming.forEach((event) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    const dateLabel = `${String(event.date.getDate()).padStart(2, "0")}/${String(event.date.getMonth() + 1).padStart(2, "0")}`;
    item.innerHTML = `<time>${dateLabel}</time><span></span><div><strong>${event.label}</strong></div>`;
    list.appendChild(item);
  });
}

function renderProviderAgenda() {
  renderProviderMonth();
  renderProviderWeek();
  renderProviderUpcoming();
}

document.querySelectorAll("#agendaViewToggle .toggle-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#agendaViewToggle .toggle-btn").forEach((btn) => btn.classList.toggle("active", btn === button));
    const mode = button.dataset.agendaMode;
    document.getElementById("providerMonthView").hidden = mode !== "month";
    document.getElementById("providerWeekView").hidden = mode !== "week";
  });
});

document.getElementById("providerAgendaMonthPrev").addEventListener("click", () => {
  providerAgendaMonthDate = new Date(providerAgendaMonthDate.getFullYear(), providerAgendaMonthDate.getMonth() - 1, 1);
  renderProviderMonth();
});
document.getElementById("providerAgendaMonthNext").addEventListener("click", () => {
  providerAgendaMonthDate = new Date(providerAgendaMonthDate.getFullYear(), providerAgendaMonthDate.getMonth() + 1, 1);
  renderProviderMonth();
});
document.getElementById("providerAgendaWeekPrev").addEventListener("click", () => {
  providerAgendaWeekDate = addDays(providerAgendaWeekDate, -7);
  renderProviderWeek();
});
document.getElementById("providerAgendaWeekNext").addEventListener("click", () => {
  providerAgendaWeekDate = addDays(providerAgendaWeekDate, 7);
  renderProviderWeek();
});

// ============================================
// Inicialização
// ============================================
const initialRole = initSession();
if (initialRole) {
  setActiveRole(initialRole);
  setActiveSection("explorar");
  setActiveProviderSection("painel");
  loadCategories().then(loadServices);
  loadProviderServices();
  loadFavorites();
  renderClientCalendar();
  renderProviderAgenda();
}
