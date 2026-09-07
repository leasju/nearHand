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
    title: "Limpeza completa",
    category: "Limpeza",
    provider: "Brilho Certo",
    rating: 4.8,
    reviews: 89,
    distance: 3.1,
    price: 160,
    unit: "",
    icon: "🧼",
    style: "clean",
    lat: -22.9260,
    lng: -47.0810,
  },
  {
    id: 3,
    title: "Manicure e pedicure",
    category: "Beleza",
    provider: "Studio Ana",
    rating: 4.7,
    reviews: 74,
    distance: 4.6,
    price: 75,
    unit: "",
    icon: "✂️",
    style: "beauty",
    lat: -22.8790,
    lng: -47.0310,
  },
  {
    id: 4,
    title: "Reparo hidráulico",
    category: "Encanador",
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
    category: "Montagem",
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
document.querySelectorAll(".category-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    categoryFilter.value = button.dataset.category;
    applyFilters();
  });
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

  const initials = (user.nome || "NH")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  document.querySelector("#profileBtn .avatar").textContent = initials || "NH";
  document.querySelector("#profileBtn .profile-copy strong").textContent = user.nome || "Minha conta";
  document.querySelector("#profileBtn .profile-copy small").textContent = user.email || "";

  return localStorage.getItem("nearhand_user_type") || "cliente";
}

function logout() {
  localStorage.removeItem("nearhand_access_token");
  localStorage.removeItem("nearhand_user");
  localStorage.removeItem("nearhand_user_type");
  window.location.href = "/auth";
}

profileBtn.addEventListener("click", () => {
  if (confirm("Sair da sua conta?")) logout();
});

// ============================================
// Alternância Cliente / Prestador
// ============================================
const clienteView = document.getElementById("clienteView");
const providerView = document.getElementById("providerView");
const topRoleButtons = document.querySelectorAll(".top-actions .role-switch .role-btn");

function setActiveRole(role) {
  const isProvider = role === "prestador";
  clienteView.hidden = isProvider;
  providerView.hidden = !isProvider;
  topRoleButtons.forEach((button) => button.classList.toggle("active", button.dataset.role === role));
}

topRoleButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveRole(button.dataset.role));
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

document.getElementById("newAdBtn").addEventListener("click", () => { newAdModal.hidden = false; });
document.getElementById("manageAdsBtn").addEventListener("click", () => {
  adList.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const item = document.createElement("article");
  item.className = "ad-item";
  item.innerHTML = `
    <div class="ad-thumb electric">🛠️</div>
    <div><strong>${title}</strong><small>R$ ${price} ${priceType} • Raio de ${radius} km</small></div>
    <span class="status done">Ativo</span>
    <button class="icon-btn ad-pause" title="Pausar">⏸</button>
    <button class="icon-btn ad-remove" title="Remover">🗑</button>
  `;
  adList.prepend(item);
  newAdModal.hidden = true;
  newAdForm.reset();
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
// Botões ainda sem tela dedicada
// ============================================
document.querySelectorAll(".panel-head .text-btn").forEach((button) => {
  const label = button.textContent.trim();
  if (label === "Ver todos" || label === "Abrir calendário") {
    button.addEventListener("click", () => showToast("Isso chega em uma próxima etapa."));
  }
});
document.querySelector(".results-head .ghost-btn")?.addEventListener("click", () => {
  showToast("Preferências de busca chegam em uma próxima etapa.");
});

// ============================================
// Inicialização
// ============================================
const initialRole = initSession();
if (initialRole) {
  setActiveRole(initialRole);
  setActiveSection("explorar");
  renderCards();
  renderFavorites();
}
