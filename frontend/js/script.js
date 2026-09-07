// Coordenadas de exemplo espalhadas perto de Campinas/SP (mock).
// Quando existir GET /services de verdade, isso vem do banco (endereco.latitude/longitude).
const services = [
  {
    id: 1,
    title: "Eletricista residencial",
    category: "Eletricista",
    provider: "Marcos Elétrica",
    rating: 4.9,
    reviews: 126,
    distance: 2.3,
    price: 120,
    unit: "/h",
    icon: "⚡",
    style: "electric",
    lat: -22.8965,
    lng: -47.0480,
  },
  {
    id: 2,
    title: "Corte e escova",
    category: "Cabeleireiro",
    provider: "Studio Bela Vista",
    rating: 4.8,
    reviews: 89,
    distance: 3.1,
    price: 160,
    unit: "",
    icon: "💇",
    style: "clean",
    lat: -22.9260,
    lng: -47.0810,
  },
  {
    id: 3,
    title: "Manicure completa",
    category: "Manicure",
    provider: "Studio Ana",
    rating: 4.7,
    reviews: 74,
    distance: 4.6,
    price: 75,
    unit: "",
    icon: "💅",
    style: "beauty",
    lat: -22.8790,
    lng: -47.0310,
  },
  {
    id: 4,
    title: "Reparo hidráulico",
    category: "Marido de Aluguel",
    provider: "Água Certa",
    rating: 4.9,
    reviews: 61,
    distance: 1.7,
    price: 95,
    unit: "/h",
    icon: "🔧",
    style: "plumber",
    lat: -22.9020,
    lng: -47.0530,
  },
  {
    id: 5,
    title: "Montagem de móveis",
    category: "Marido de Aluguel",
    provider: "Resolve Móveis",
    rating: 4.6,
    reviews: 52,
    distance: 5.2,
    price: 90,
    unit: "",
    icon: "🪛",
    style: "assembly",
    lat: -22.9420,
    lng: -47.1010,
  },
  {
    id: 9,
    title: "Pedicure spa",
    category: "Pedicure",
    provider: "Studio Ana",
    rating: 4.7,
    reviews: 40,
    distance: 3.8,
    price: 60,
    unit: "",
    icon: "🦶",
    style: "beauty",
    lat: -22.9140,
    lng: -47.0700,
  },
  {
    id: 6,
    title: "Instalação de luminárias",
    category: "Eletricista",
    provider: "Luz & Casa",
    rating: 4.5,
    reviews: 38,
    distance: 6.8,
    price: 90,
    unit: "",
    icon: "💡",
    style: "electric",
    lat: -22.8610,
    lng: -47.1120,
  },
  {
    id: 7,
    title: "Limpeza pós-obra",
    category: "Marido de Aluguel",
    provider: "Jaguar Limpeza",
    rating: 4.6,
    reviews: 22,
    distance: 24.5,
    price: 220,
    unit: "",
    icon: "🧼",
    style: "clean",
    lat: -22.7011,
    lng: -46.9878,
  },
  {
    id: 8,
    title: "Instalação elétrica rural",
    category: "Eletricista",
    provider: "Elétrica Jaguari",
    rating: 4.8,
    reviews: 15,
    distance: 26.2,
    price: 140,
    unit: "/h",
    icon: "⚡",
    style: "electric",
    lat: -22.6960,
    lng: -46.9805,
  },
];

const favorites = new Set();
let visibleServices = [...services];

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
    option.value = category.nome;
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
  const isFavorite = favorites.has(service.id);
  const card = document.createElement("article");
  card.className = "service-card";
  card.dataset.id = service.id;
  card.innerHTML = `
    <div class="service-image ${service.style}">
      <span aria-hidden="true">${service.icon}</span>
      <button class="favorite-btn ${isFavorite ? "active" : ""}" data-action="favorite" aria-label="${isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        ${isFavorite ? "♥" : "♡"}
      </button>
    </div>
    <div class="service-body">
      <div class="service-topline">
        <span class="service-pill">${service.category}</span>
        <span class="distance">📍 ${service.distance.toFixed(1).replace(".", ",")} km</span>
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
  services.filter((service) => favorites.has(service.id)).forEach((service) => {
    favoritesGrid.appendChild(serviceCard(service));
  });
  if (!favorites.size) {
    favoritesGrid.innerHTML = "<p class=\"empty-state\">Você ainda não adicionou prestadores aos favoritos.</p>";
  }
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const minimumRating = Number(ratingFilter.value);
  const maxDistance = Number(radiusFilter.value);

  visibleServices = services.filter((service) => {
    const matchesSearch = [service.title, service.provider, service.category]
      .some((value) => value.toLowerCase().includes(search));
    const matchesCategory = category === "all" || service.category === category;
    return matchesSearch && matchesCategory && service.rating >= minimumRating && service.distance <= maxDistance;
  });

  visibleServices.sort((first, second) => {
    if (sortFilter.value === "rating") return second.rating - first.rating;
    if (sortFilter.value === "price") return first.price - second.price;
    return first.distance - second.distance;
  });
  renderCards();
  updateProximityMap();
}

function showServiceDetails(service) {
  document.getElementById("modalCategory").textContent = service.category;
  document.getElementById("serviceTitle").textContent = service.title;
  document.getElementById("modalProvider").textContent = service.provider;
  document.getElementById("modalRating").textContent = `⭐ ${service.rating.toFixed(1).replace(".", ",")} (${service.reviews} avaliações)`;
  document.getElementById("modalDistance").textContent = `📍 ${service.distance.toFixed(1).replace(".", ",")} km`;
  document.getElementById("modalPrice").textContent = `💳 R$ ${formatPrice(service.price)}${service.unit}`;
  document.getElementById("galleryMain").textContent = service.icon;
  document.getElementById("serviceModal").hidden = false;
}

function handleCardAction(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const card = event.target.closest(".service-card");
  if (!action || !card) return;
  const service = services.find((item) => item.id === Number(card.dataset.id));
  if (!service) return;

  if (action === "favorite") {
    favorites.has(service.id) ? favorites.delete(service.id) : favorites.add(service.id);
    renderCards();
    renderFavorites();
    return;
  }
  showServiceDetails(service);
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
// Tema claro/escuro
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
// Alternância Cards / Mapa
// ============================================
const mapViewSection = document.getElementById("mapView");
const viewToggleButtons = document.querySelectorAll(".view-toggle .toggle-btn");

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
    card.innerHTML = `
      <strong>${service.title}</strong>
      <small>${service.provider} • 📍 ${service.distance.toFixed(1).replace(".", ",")} km</small>
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

const mainNav = document.querySelector(".main-nav");

function showAppView(view) {
  clienteView.hidden = view !== "cliente";
  providerView.hidden = view !== "prestador";
  settingsView.hidden = view !== "settings";
  mainNav.hidden = view !== "cliente";
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
const navLinks = document.querySelectorAll(".main-nav .nav-link");
const sectionViews = document.querySelectorAll(".section-view");

function setActiveSection(section) {
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.section === section));
  sectionViews.forEach((view) => { view.hidden = view.dataset.view !== section; });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveSection(link.dataset.section));
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
document.getElementById("manageAdsBtn").addEventListener("click", () => {
  adList.scrollIntoView({ behavior: "smooth", block: "center" });
});

// ============================================
// Fotos do anúncio: enviar arquivo(s) ou adicionar por link
// ============================================
const adPhotosGrid = document.getElementById("adPhotosGrid");
let adPhotos = [];

function renderAdPhotosGrid() {
  adPhotosGrid.replaceChildren();
  adPhotos.forEach((url, index) => {
    const thumb = document.createElement("div");
    thumb.className = "ad-photo-thumb";
    thumb.innerHTML = `<img src="${url}" alt="Foto ${index + 1}" /><button type="button" class="ad-photo-remove" data-index="${index}" aria-label="Remover foto">×</button>`;
    adPhotosGrid.appendChild(thumb);
  });
}

adPhotosGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".ad-photo-remove");
  if (!button) return;
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

document.getElementById("adPhotoFile").addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    adPhotos.push(await resizeImageFile(file));
  }
  renderAdPhotosGrid();
  event.target.value = "";
});

document.getElementById("adPhotoLinkBtn").addEventListener("click", () => {
  const url = prompt("Cole o link da foto:");
  if (url && url.trim()) {
    adPhotos.push(url.trim());
    renderAdPhotosGrid();
  }
});

adRadius?.addEventListener("input", () => {
  adRadiusLabel.textContent = `${adRadius.value} km`;
});

adList.addEventListener("click", (event) => {
  const button = event.target.closest(".icon-btn");
  if (!button) return;
  const item = button.closest(".ad-item");
  if (!item) return;
  const status = item.querySelector(".status");

  if (button.classList.contains("ad-pause")) {
    const isPaused = status.textContent.trim() === "Pausado";
    status.textContent = isPaused ? "Ativo" : "Pausado";
    status.classList.toggle("done", isPaused);
    status.classList.toggle("pending", !isPaused);
    showToast(isPaused ? "Anúncio reativado." : "Anúncio pausado.");
  } else if (button.classList.contains("ad-remove")) {
    if (confirm("Remover este anúncio?")) {
      item.remove();
      showToast("Anúncio removido.");
    }
  }
});

newAdForm.addEventListener("submit", (event) => {
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

  const item = document.createElement("article");
  item.className = "ad-item";
  item.innerHTML = `
    <div class="ad-thumb electric" style="background-image:url('${adPhotos[0]}');background-size:cover;background-position:center"></div>
    <div><strong>${title}</strong><small>R$ ${price} ${priceType} • Raio de ${radius} km</small></div>
    <span class="status done">Ativo</span>
    <button class="icon-btn ad-pause" title="Pausar">⏸</button>
    <button class="icon-btn ad-remove" title="Remover">🗑</button>
  `;
  adList.prepend(item);
  newAdModal.hidden = true;
  newAdForm.reset();
  adPhotos = [];
  renderAdPhotosGrid();
  showToast("Anúncio publicado. Em breve isso fica salvo no banco de dados.");
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

function setupPhotoPicker({ modeId, urlId, fileId, fileLabelId, previewId, emptyId }) {
  const modeSelect = document.getElementById(modeId);
  const urlInput = document.getElementById(urlId);
  const fileInput = document.getElementById(fileId);
  const fileLabel = document.getElementById(fileLabelId);
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

  function applyMode() {
    const isFile = modeSelect.value === "file";
    urlInput.hidden = isFile;
    fileLabel.hidden = !isFile;
  }

  modeSelect.addEventListener("change", applyMode);
  urlInput.addEventListener("input", () => {
    value = urlInput.value.trim();
    updatePreview();
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
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
  });

  applyMode();
  updatePreview();

  return {
    getValue: () => value,
    setValue: (newValue) => { value = newValue || ""; urlInput.value = value; updatePreview(); },
  };
}

const cpPhotoPicker = setupPhotoPicker({
  modeId: "cpPhotoMode",
  urlId: "cpPhotoUrl",
  fileId: "cpPhotoFile",
  fileLabelId: "cpPhotoFileLabel",
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
  document.getElementById("adList").scrollIntoView({ behavior: "smooth", block: "center" });
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

const PROVIDER_EVENTS = [
  { day: today.getDate(), label: "3 serviços hoje: Troca de disjuntor, Visita técnica, Instalação de luminária" },
  { day: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getDate(), label: "Instalação de luminária — 09:00 • Rafael Braga" },
];
let providerCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);

function renderProviderCalendar() {
  const isCurrentMonth = providerCalendarDate.getMonth() === today.getMonth()
    && providerCalendarDate.getFullYear() === today.getFullYear();
  renderCalendar({
    gridEl: document.getElementById("providerCalendar"),
    labelEl: document.getElementById("providerCalendarLabel"),
    date: providerCalendarDate,
    events: isCurrentMonth ? PROVIDER_EVENTS : [],
  });
}

document.getElementById("providerCalendarPrev").addEventListener("click", () => {
  providerCalendarDate = new Date(providerCalendarDate.getFullYear(), providerCalendarDate.getMonth() - 1, 1);
  renderProviderCalendar();
});
document.getElementById("providerCalendarNext").addEventListener("click", () => {
  providerCalendarDate = new Date(providerCalendarDate.getFullYear(), providerCalendarDate.getMonth() + 1, 1);
  renderProviderCalendar();
});

// ============================================
// Inicialização
// ============================================
const initialRole = initSession();
if (initialRole) {
  setActiveRole(initialRole);
  setActiveSection("explorar");
  loadCategories().then(applyFilters);
  renderFavorites();
  renderClientCalendar();
  renderProviderCalendar();
}
