const favorites = new Set();
let favoriteServices = [];
let services = [];
let visibleServices = [];
let currentService = null;
let selectedAvailability = null;
let currentChatRequestId = null;
let chatPollingTimer = null;
let servicesRequest = null;
let servicesRequestTimer = null;
let selectedProviderId = null;
let ignoreRadius = false;

const cardsView = document.getElementById("cardsView");
const favoritesGrid = document.getElementById("favoritesGrid");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const ratingFilter = document.getElementById("ratingFilter");
const sortFilter = document.getElementById("sortFilter");
const radiusFilter = document.getElementById("radiusFilter");
const radiusLabel = document.getElementById("radiusLabel");
const showAllRadiusBtn = document.getElementById("showAllRadiusBtn");
const toast = document.getElementById("toast");

const ICON_BASE = "img/icons/";
function iconImage(name, alt = "", className = "icon") {
  return `<img class="${className}" src="${ICON_BASE}icon-${name}.png" alt="${alt}" />`;
}

function openModal(modal) {
  modal.hidden = false;
  void modal.offsetWidth;
  modal.classList.add("is-open");
}

function closeModal(modal) {
  if (modal.hidden) return;
  modal.classList.remove("is-open");
  const onEnd = (event) => {
    if (event.target !== modal) return;
    modal.hidden = true;
    modal.removeEventListener("transitionend", onEnd);
  };
  modal.addEventListener("transitionend", onEnd);
}

const SERVICE_VISUALS = [
  ["cat-eletrica", "electric"],
  ["sparkles", "clean"],
  ["sparkles", "beauty"],
  ["location", "plumber"],
  ["settings", "assembly"],
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
  if (selectedProviderId) params.set("prestador_id", selectedProviderId);
  if (radiusFilter.value && !ignoreRadius) params.set("raio_km", radiusFilter.value);
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

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

async function readApiResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`O servidor retornou um erro inesperado (${response.status}). Reinicie o backend atualizado.`);
  }
}

function setupCepLookup(cepId, fields) {
  const cepInput = document.getElementById(cepId);
  if (!cepInput) return;
  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.trim();
    if (cep.replace(/\D/g, "").length !== 8) return;
    try {
      const response = await fetch(`/addresses/cep/${encodeURIComponent(cep)}`);
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.detail || "CEP não encontrado.");
      Object.entries(fields).forEach(([key, id]) => {
        const input = document.getElementById(id);
        if (input && data[key]) input.value = data[key];
      });
    } catch (error) {
      showToast(error.message);
    }
  });
}

setupCepLookup("cpCep", {
  rua: "cpRua",
  complemento: "cpComplemento",
  bairro: "cpBairro",
  cidade: "cpCidade",
  estado: "cpEstado",
});
setupCepLookup("ppCep", {
  rua: "ppRua",
  complemento: "ppComplemento",
  bairro: "ppBairro",
  cidade: "ppCidade",
  estado: "ppEstado",
});

function formatPrice(value) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

// ============================================
// Categorias reais (vindas do backend, com contagem de serviços)
// ============================================
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

function serviceCard(service, index = 0) {
  const isFavorite = favorites.has(service.id);
  const visual = serviceVisual(service);
  const distance = service.distance == null ? "Distância indisponível" : `${iconImage("location")} ${service.distance.toFixed(1).replace(".", ",")} km`;
  const photoUrl = service.photos?.[0]?.url;
  const card = document.createElement("article");
  card.className = "service-card";
  card.dataset.id = service.id;
  card.style.setProperty("--i", Math.min(index, 10));
  card.innerHTML = `
    <div class="service-image ${visual.style}"${photoUrl ? ` style="background-image:url('${photoUrl}');background-size:cover;background-position:center"` : ""}>
      <span aria-hidden="true"${photoUrl ? " hidden" : ""}>${iconImage(visual.icon, "", "service-icon")}</span>
      <button class="favorite-btn ${isFavorite ? "active" : ""}" data-action="favorite" aria-label="${isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        ${iconImage(isFavorite ? "heart-filled" : "heart-outline", isFavorite ? "Favoritado" : "Favoritar")}
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
        <span class="rating">${iconImage("star-filled", "Avaliação")} <strong>${service.rating.toFixed(1).replace(".", ",")}</strong> (${service.reviews})</span>
        <span class="price">a partir de <strong>R$ ${formatPrice(service.price)}</strong>${service.unit}${service.negociavel ? ' <span class="negotiable-badge">negociável</span>' : ""}</span>
      </div>
      <button class="primary-btn service-action" data-action="details">Ver serviço</button>
    </div>
  `;
  return card;
}

function renderCards() {
  cardsView.replaceChildren();
  visibleServices.forEach((service, index) => cardsView.appendChild(serviceCard(service, index)));
  resultCount.textContent = `${visibleServices.length} serviço${visibleServices.length === 1 ? "" : "s"} encontrado${visibleServices.length === 1 ? "" : "s"}`;
}

let favoritesActiveCategory = "all";
let favoritesSearchTerm = "";
const favoritesFilters = document.getElementById("favoritesFilters");
const favoritesCount = document.getElementById("favoritesCount");
const favoritesSearchInput = document.getElementById("favoritesSearchInput");

function renderFavoritesFilters() {
  const counts = new Map();
  favoriteServices.forEach((service) => {
    counts.set(service.category, (counts.get(service.category) || 0) + 1);
  });
  if (!counts.has(favoritesActiveCategory) && favoritesActiveCategory !== "all") favoritesActiveCategory = "all";
  favoritesFilters.replaceChildren();
  const allChip = document.createElement("button");
  allChip.className = `chip${favoritesActiveCategory === "all" ? " active" : ""}`;
  allChip.dataset.favoriteCategory = "all";
  allChip.textContent = `Todos · ${favoriteServices.length}`;
  favoritesFilters.appendChild(allChip);
  [...counts.entries()].forEach(([category, count]) => {
    const chip = document.createElement("button");
    chip.className = `chip${favoritesActiveCategory === category ? " active" : ""}`;
    chip.dataset.favoriteCategory = category;
    chip.textContent = `${category} · ${count}`;
    favoritesFilters.appendChild(chip);
  });
}

function renderFavorites() {
  renderFavoritesFilters();
  favoritesCount.textContent = `${favoriteServices.length} salvo${favoriteServices.length === 1 ? "" : "s"}`;
  const term = favoritesSearchTerm.trim().toLowerCase();
  const filtered = favoriteServices
    .filter((service) => favoritesActiveCategory === "all" || service.category === favoritesActiveCategory)
    .filter((service) => !term || `${service.title} ${service.provider}`.toLowerCase().includes(term));
  favoritesGrid.replaceChildren();
  if (!favoriteServices.length) {
    favoritesGrid.innerHTML = "<p class=\"empty-state\">Você ainda não adicionou anúncios aos favoritos.</p>";
    return;
  }
  if (!filtered.length) {
    favoritesGrid.innerHTML = `<p class="empty-state">${term ? "Nenhum resultado para essa busca." : "Nenhum favorito nessa categoria."}</p>`;
    return;
  }

  // Agrupa por prestador: favoritar um anúncio ainda dá acesso rápido aos outros
  // anúncios daquele mesmo prestador, caso o cliente queira agendar outro serviço.
  const groups = new Map();
  filtered.forEach((service) => {
    if (!groups.has(service.prestador_id)) groups.set(service.prestador_id, []);
    groups.get(service.prestador_id).push(service);
  });

  groups.forEach((services) => {
    const [first] = services;
    const group = document.createElement("div");
    group.className = "favorites-group";
    group.innerHTML = `
      <div class="favorites-group-header">
        <span class="avatar">${requestInitials(first.provider)}</span>
        <strong>${first.provider}</strong>
        <button type="button" class="text-btn" data-view-provider="${first.prestador_id}">Ver todos os anúncios →</button>
      </div>
    `;
    const grid = document.createElement("div");
    grid.className = "service-grid";
    services.forEach((service, index) => grid.appendChild(serviceCard(service, index)));
    group.appendChild(grid);
    favoritesGrid.appendChild(group);
  });
}

favoritesFilters.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  favoritesActiveCategory = chip.dataset.favoriteCategory;
  renderFavorites();
});

favoritesSearchInput?.addEventListener("input", () => {
  favoritesSearchTerm = favoritesSearchInput.value;
  renderFavorites();
});

favoritesGrid.addEventListener("click", (event) => {
  const viewProviderBtn = event.target.closest("[data-view-provider]");
  if (!viewProviderBtn) return;
  selectedProviderId = Number(viewProviderBtn.dataset.viewProvider);
  searchInput.value = "";
  showAppView("cliente");
  setActiveSection("explorar");
  loadServices();
});

async function loadFavorites() {
  if (currentSessionRole !== "cliente") return;
  try {
    const response = await authFetch("/clientes/me/favoritos");
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar os favoritos.");
    favoriteServices = data;
    favorites.clear();
    favoriteServices.forEach((service) => favorites.add(service.id));
    renderCards();
    renderFavorites();
  } catch (error) {
    showToast(error.message);
  }
}

// ============================================
// Favoritar prestador (separado de favoritar um anúncio específico) —
// acessível pelo bloco do prestador na tela do serviço e pelo cabeçalho do chat.
// ============================================
const favoriteProviderIds = new Set();
let FAVORITE_PROVIDERS = [];
const favoritesTabs = document.getElementById("favoritesTabs");
const favoritesAnunciosPanel = document.getElementById("favoritesAnunciosPanel");
const favoritesPrestadoresPanel = document.getElementById("favoritesPrestadoresPanel");
const favoritesTitle = document.getElementById("favoritesTitle");
const favoriteProvidersList = document.getElementById("favoriteProvidersList");

async function loadFavoriteProviderIds() {
  if (currentSessionRole !== "cliente") return;
  try {
    const response = await authFetch("/clientes/me/favoritos/prestadores");
    const data = await readApiResponse(response);
    if (!response.ok) return;
    FAVORITE_PROVIDERS = data;
    favoriteProviderIds.clear();
    data.forEach((provider) => favoriteProviderIds.add(provider.id));
  } catch {
    // silencioso: não é crítico pro carregamento inicial da tela
  }
}

function updateProviderFavoriteButton(button, providerId) {
  const active = favoriteProviderIds.has(providerId);
  button.classList.toggle("active", active);
  button.innerHTML = iconImage(active ? "heart-filled" : "heart-outline", active ? "Favoritado" : "Favoritar");
  button.setAttribute("aria-label", active ? "Remover prestador dos favoritos" : "Favoritar prestador");
}

async function toggleFavoriteProvider(providerId, button) {
  const isFavorite = favoriteProviderIds.has(providerId);
  try {
    const response = isFavorite
      ? await authFetch(`/favoritos/prestadores/${providerId}`, { method: "DELETE" })
      : await authFetch("/favoritos/prestadores", { method: "POST", body: JSON.stringify({ prestador_id: providerId }) });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível atualizar o favorito.");
    if (isFavorite) favoriteProviderIds.delete(providerId);
    else favoriteProviderIds.add(providerId);
    if (button) updateProviderFavoriteButton(button, providerId);
    showToast(isFavorite ? "Prestador removido dos favoritos." : "Prestador favoritado.");
  } catch (error) {
    showToast(error.message);
  }
}

function renderFavoriteProviders() {
  if (!favoriteProvidersList) return;
  favoritesCount.textContent = `${FAVORITE_PROVIDERS.length} salvo${FAVORITE_PROVIDERS.length === 1 ? "" : "s"}`;
  favoriteProvidersList.replaceChildren();
  if (!FAVORITE_PROVIDERS.length) {
    favoriteProvidersList.innerHTML = '<p class="empty-state">Você ainda não favoritou nenhum prestador.</p>';
    return;
  }
  FAVORITE_PROVIDERS.forEach((provider) => {
    const wrapper = document.createElement("div");
    wrapper.className = "favorite-provider-block";

    const item = document.createElement("article");
    item.className = "history-item";
    const thumb = provider.foto
      ? `<img src="${provider.foto}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />`
      : requestInitials(provider.nome);
    item.innerHTML = `
      <div class="history-thumb">${thumb}</div>
      <div class="history-content">
        <div class="history-title">${provider.nome}</div>
        <div class="history-provider">${iconImage("star-filled", "Avaliação")} ${provider.rating.toFixed(1).replace(".", ",")} (${provider.reviews}) • ${provider.anuncios_ativos} anúncio${provider.anuncios_ativos === 1 ? "" : "s"} ativo${provider.anuncios_ativos === 1 ? "" : "s"}</div>
      </div>
      <div class="history-item-actions">
        <button type="button" class="chat-group-toggle" data-toggle-provider-ads="${provider.id}" aria-expanded="false" title="Ver anúncios">
          <span>Ver anúncios</span><span class="chat-group-chevron"><svg viewBox="0 0 12 8" width="10" height="7" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <button type="button" class="small-btn reject" data-unfavorite-provider="${provider.id}">Remover</button>
      </div>
    `;
    wrapper.appendChild(item);

    const adsPanel = document.createElement("div");
    adsPanel.className = "favorite-provider-ads service-grid";
    adsPanel.dataset.providerAds = String(provider.id);
    adsPanel.hidden = true;
    wrapper.appendChild(adsPanel);

    favoriteProvidersList.appendChild(wrapper);
  });
}

async function loadFavoriteProviderAds(providerId, panel) {
  panel.innerHTML = '<p class="empty-state">Carregando anúncios...</p>';
  try {
    const response = await authFetch(`/services?prestador_id=${providerId}`);
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar os anúncios.");
    panel.dataset.loaded = "true";
    panel.replaceChildren();
    if (!data.length) {
      panel.innerHTML = '<p class="empty-state">Esse prestador não tem anúncios ativos no momento.</p>';
      return;
    }
    data.forEach((service, index) => panel.appendChild(serviceCard(service, index)));
  } catch (error) {
    panel.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

favoritesTabs?.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-favorites-tab]");
  if (!tab) return;
  favoritesTabs.querySelectorAll(".history-tab").forEach((el) => el.classList.remove("active"));
  tab.classList.add("active");
  const isAnuncios = tab.dataset.favoritesTab === "anuncios";
  favoritesAnunciosPanel.hidden = !isAnuncios;
  favoritesPrestadoresPanel.hidden = isAnuncios;
  favoritesTitle.textContent = isAnuncios ? "Seus anúncios favoritos" : "Seus prestadores favoritos";
  if (isAnuncios) renderFavorites();
  else loadFavoriteProviderIds().then(renderFavoriteProviders);
});

favoriteProvidersList?.addEventListener("click", async (event) => {
  const toggleBtn = event.target.closest("[data-toggle-provider-ads]");
  if (toggleBtn) {
    const providerId = toggleBtn.dataset.toggleProviderAds;
    const panel = favoriteProvidersList.querySelector(`[data-provider-ads="${providerId}"]`);
    const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
    toggleBtn.setAttribute("aria-expanded", String(!isExpanded));
    panel.hidden = isExpanded;
    if (!isExpanded && !panel.dataset.loaded) {
      await loadFavoriteProviderAds(providerId, panel);
    }
    return;
  }
  const removeBtn = event.target.closest("[data-unfavorite-provider]");
  if (removeBtn) {
    const providerId = Number(removeBtn.dataset.unfavoriteProvider);
    await toggleFavoriteProvider(providerId, null);
    FAVORITE_PROVIDERS = FAVORITE_PROVIDERS.filter((provider) => provider.id !== providerId);
    renderFavoriteProviders();
    return;
  }
  handleCardAction(event);
});

function applyFilters() {
  queueServicesLoad();
}

function showServiceDetails(service) {
  currentService = service;
  document.getElementById("modalCategory").textContent = service.category;
  document.getElementById("serviceTitle").textContent = service.title;
  document.getElementById("modalProvider").textContent = service.provider;
  document.getElementById("modalRating").innerHTML = `${iconImage("star-filled", "Avaliação")} ${service.rating.toFixed(1).replace(".", ",")} (${service.reviews} avaliações)`;
  document.getElementById("modalDistance").innerHTML = `${iconImage("location", "")} ${service.distance.toFixed(1).replace(".", ",")} km`;
  document.getElementById("modalPrice").innerHTML = `${iconImage("tag", "")} R$ ${formatPrice(service.price)}${service.unit}${service.negociavel ? " (negociável)" : ""}`;
  document.getElementById("modalDescription").textContent = service.description || "Sem descrição.";
  const photos = (service.photos || []).map((photo) => photo.url).filter(Boolean);
  const galleryMain = document.getElementById("galleryMain");
  function setMainPhoto(url) {
    galleryMain.textContent = url ? "" : serviceVisual(service).icon;
    galleryMain.style.backgroundImage = url ? `url("${url}")` : "";
    galleryMain.style.backgroundSize = url ? "cover" : "";
    galleryMain.style.backgroundPosition = "center";
  }
  setMainPhoto(photos[0]);
  const galleryStrip = document.getElementById("galleryStrip");
  galleryStrip.replaceChildren();
  photos.forEach((url, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = `gallery-thumb${index === 0 ? " active" : ""}`;
    thumb.style.backgroundImage = `url("${url}")`;
    thumb.addEventListener("click", () => {
      setMainPhoto(url);
      galleryStrip.querySelectorAll(".gallery-thumb").forEach((el) => el.classList.remove("active"));
      thumb.classList.add("active");
    });
    galleryStrip.appendChild(thumb);
  });

  const providerInitials = (service.provider || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  document.getElementById("modalProviderAvatar").textContent = providerInitials || "P";
  document.getElementById("modalProviderName").textContent = service.provider;
  document.getElementById("modalProviderMeta").textContent = `${service.reviews} ${service.reviews === 1 ? "avaliação" : "avaliações"} recebidas`;

  const providerFavBtn = document.getElementById("modalProviderFavoriteBtn");
  if (providerFavBtn) {
    if (currentSessionRole === "cliente") {
      providerFavBtn.hidden = false;
      updateProviderFavoriteButton(providerFavBtn, service.prestador_id);
      providerFavBtn.onclick = () => toggleFavoriteProvider(service.prestador_id, providerFavBtn);
    } else {
      providerFavBtn.hidden = true;
    }
  }

  loadServiceAvailability(service.id);
  loadServiceReviews(service.id);
  openModal(document.getElementById("serviceModal"));
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, index) => iconImage(index < Math.round(rating) ? "star-filled" : "star-empty", index < Math.round(rating) ? "Estrela preenchida" : "Estrela vazia")).join("");
}

async function loadServiceReviews(serviceId) {
  const list = document.getElementById("reviewsList");
  const summary = document.getElementById("reviewsSummary");
  if (!list || !summary) return;
  try {
    const response = await fetch(`/services/${serviceId}/avaliacoes`);
    const reviews = await response.json();
    if (!response.ok) throw new Error(reviews.detail || "Não foi possível carregar as avaliações.");

    list.replaceChildren();
    if (!reviews.length) {
      summary.hidden = true;
      list.innerHTML = '<p class="empty-state review-inline">Ainda não há avaliações.</p>';
      return;
    }

    const average = reviews.reduce((sum, review) => sum + review.nota, 0) / reviews.length;
    document.getElementById("reviewsBigNum").textContent = average.toFixed(1).replace(".", ",");
    document.getElementById("reviewsStars").innerHTML = renderStars(average);
    document.getElementById("reviewsTotal").textContent = `${reviews.length} ${reviews.length === 1 ? "avaliação" : "avaliações"}`;

    const bars = document.getElementById("reviewsBars");
    bars.replaceChildren();
    for (let star = 5; star >= 1; star -= 1) {
      const count = reviews.filter((review) => Math.round(review.nota) === star).length;
      const pct = Math.round((count / reviews.length) * 100);
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `<span>${star}${iconImage("star-filled", "")}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span>${pct}%</span>`;
      bars.appendChild(row);
    }
    summary.hidden = false;

    reviews.slice(0, 3).forEach((review) => {
      const item = document.createElement("div");
      item.className = "review-inline";
      item.innerHTML = `<strong>${renderStars(review.nota)}</strong><p>${review.comentario || "Sem comentário."}</p><small>${review.cliente_nome}${review.resposta_prestador ? ` · Resposta: ${review.resposta_prestador}` : ""}</small>`;
      list.appendChild(item);
    });
  } catch (error) {
    showToast(error.message);
  }
}

function renderServiceAvailability(slots) {
  const dateOptions = document.querySelector(".date-options");
  const timeOptions = document.querySelector(".time-options");
  const availableSlots = slots.filter((slot) => !slot.bloqueado);
  dateOptions.replaceChildren();
  timeOptions.replaceChildren();
  selectedAvailability = null;
  const dates = [...new Set(availableSlots.map((slot) => slot.data))];
  if (!dates.length) {
    dateOptions.innerHTML = '<small class="empty-state">Nenhum horário livre cadastrado.</small>';
    return;
  }

  function renderTimes(date) {
    timeOptions.replaceChildren();
    availableSlots.filter((slot) => slot.data === date).forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = slot.hora_inicio.slice(0, 5);
      button.classList.toggle("active", selectedAvailability?.data === slot.data && selectedAvailability?.hora_inicio === slot.hora_inicio);
      button.addEventListener("click", () => {
        selectedAvailability = slot;
        renderTimes(date);
      });
      timeOptions.appendChild(button);
    });
  }

  dates.forEach((date, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `date-option${index === 0 ? " active" : ""}`;
    const dateValue = new Date(`${date}T00:00:00`);
    button.innerHTML = `<small>${dateValue.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}</small><strong>${dateValue.getDate()}</strong>`;
    button.addEventListener("click", () => {
      document.querySelectorAll(".date-option").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderTimes(date);
    });
    dateOptions.appendChild(button);
  });
  selectedAvailability = availableSlots.find((slot) => slot.data === dates[0]);
  renderTimes(dates[0]);
}

async function loadServiceAvailability(serviceId) {
  try {
    const response = await fetch(`/services/${serviceId}/disponibilidade`);
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar os horários.");
    renderServiceAvailability(data);
  } catch (error) {
    renderServiceAvailability([]);
    showToast(error.message);
  }
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
  const isFavorite = favorites.has(service.id);
  try {
    const response = isFavorite
      ? await authFetch(`/favoritos/${service.id}`, { method: "DELETE" })
      : await authFetch("/favoritos", {
        method: "POST",
        body: JSON.stringify({ servico_id: service.id }),
      });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível atualizar o favorito.");
    if (isFavorite) {
      favorites.delete(service.id);
      favoriteServices = favoriteServices.filter((item) => item.id !== service.id);
    } else {
      favorites.add(service.id);
      favoriteServices.push(service);
    }
    renderCards();
    renderFavorites();
  } catch (error) {
    showToast(error.message);
  }
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop").forEach((modal) => closeModal(modal));
}

cardsView.addEventListener("click", handleCardAction);
favoritesGrid.addEventListener("click", handleCardAction);
// Busca por texto e o slider de raio se beneficiam de debounce (digitação/arraste contínuo);
// selects de categoria/avaliação/ordenação são escolhas únicas e devem buscar na hora, sem atraso.
[searchInput, radiusFilter].forEach((control) => {
  control.addEventListener("input", () => { selectedProviderId = null; applyFilters(); });
  control.addEventListener("change", () => { selectedProviderId = null; applyFilters(); });
});
[categoryFilter, ratingFilter, sortFilter].forEach((control) => {
  control.addEventListener("change", () => { selectedProviderId = null; loadServices(); });
});
radiusFilter.addEventListener("input", () => {
  radiusLabel.textContent = `${radiusFilter.value} km`;
  ignoreRadius = false;
  showAllRadiusBtn.classList.remove("active");
});

showAllRadiusBtn.addEventListener("click", () => {
  ignoreRadius = true;
  selectedProviderId = null;
  showAllRadiusBtn.classList.add("active");
  loadServices();
  showToast("Mostrando anúncios de qualquer distância.");
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(document.getElementById(button.dataset.close));
  });
});
document.querySelectorAll(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});
document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  ratingFilter.value = "0";
  sortFilter.value = "distance";
  radiusFilter.value = "10";
  selectedProviderId = null;
  ignoreRadius = false;
  showAllRadiusBtn.classList.remove("active");
  radiusLabel.textContent = "10 km";
  loadServices();
});
document.querySelector(".categories-card").addEventListener("click", (event) => {
  const button = event.target.closest(".category-item");
  if (!button) return;
  document.querySelectorAll(".category-item").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  categoryFilter.value = button.dataset.category;
  selectedProviderId = null;
  loadServices();
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
let mapCenter = DEFAULT_MAP_CENTER;
const serviceMarkers = new Map();

function refineMapCenter() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      mapCenter = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (proximityMap) {
        proximityMap.setView([mapCenter.lat, mapCenter.lng], 13);
        youMarker.setLatLng([mapCenter.lat, mapCenter.lng]);
        updateProximityMap();
      }
      queueServicesLoad();
    },
    () => {},
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

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
      <small>${service.provider} • ${iconImage("location")} ${distance}</small>
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
      `<strong>${service.title}</strong><br>${service.provider}<br>${iconImage("star-filled")} ${service.rating.toFixed(1).replace(".", ",")} · R$ ${formatPrice(service.price)}${service.unit}`
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
  initProximityMap(mapCenter);
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
  const profileAvatar = document.getElementById("profileAvatar");
  const profileInitials = document.getElementById("profileInitials");
  if (profileAvatar && profileInitials) {
    profileAvatar.hidden = !updated.foto;
    profileAvatar.src = updated.foto || "";
    profileInitials.textContent = initials || "NH";
    profileInitials.hidden = Boolean(updated.foto);
  }
  document.querySelector("#profileBtn .profile-copy strong").textContent = updated.nome || "Minha conta";
  document.querySelector("#profileBtn .profile-copy small").textContent = updated.email || "";

  const settingsAvatar = document.getElementById("settingsAvatar");
  const settingsAvatarInitials = document.getElementById("settingsAvatarInitials");
  if (settingsAvatar && settingsAvatarInitials) {
    settingsAvatar.hidden = !updated.foto;
    settingsAvatar.src = updated.foto || "";
    settingsAvatarInitials.textContent = initials || "NH";
    settingsAvatarInitials.hidden = Boolean(updated.foto);
  }
  const settingsSidebarName = document.getElementById("settingsSidebarName");
  const settingsSidebarEmail = document.getElementById("settingsSidebarEmail");
  if (settingsSidebarName) settingsSidebarName.textContent = updated.nome || "Minha conta";
  if (settingsSidebarEmail) settingsSidebarEmail.textContent = updated.email || "";

  const providerHeroName = document.getElementById("providerHeroName");
  if (providerHeroName) {
    providerHeroName.textContent = updated.nome ? updated.nome.split(" ")[0] : "Prestador";
  }
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
  refreshSessionProfile();
  return currentSessionRole;
}

// Busca o perfil atual no servidor pra corrigir nome/foto desatualizados que
// possam ter ficado guardados no navegador (ex.: sessão antiga em cache).
async function refreshSessionProfile() {
  try {
    const path = currentSessionRole === "prestador" ? "/prestadores/me" : "/clientes/me";
    const response = await authFetch(path);
    if (!response.ok) return;
    const profile = await response.json();
    updateStoredUser({ nome: profile.nome, email: profile.email, foto: profile.foto });
  } catch {
    // sem internet ou sessão expirada: mantém o que já está em cache
  }
}

function logout() {
  localStorage.removeItem("nearhand_access_token");
  localStorage.removeItem("nearhand_user");
  localStorage.removeItem("nearhand_user_type");
  window.location.href = "/auth";
}

document.getElementById("topbarLogoutBtn").addEventListener("click", () => {
  if (confirm("Sair da sua conta?")) logout();
});

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
function revealView(el) {
  el.hidden = false;
  el.classList.remove("view-enter");
  void el.offsetWidth;
  el.classList.add("view-enter");
}

const clienteView = document.getElementById("clienteView");
const providerView = document.getElementById("providerView");
const settingsView = document.getElementById("settingsView");
const chatView = document.getElementById("chatView");
const topRoleButtons = document.querySelectorAll(".top-actions .role-switch .role-btn");

const mainNav = document.querySelector(".main-nav:not(.provider-nav)");
const providerNav = document.querySelector(".provider-nav");

function showAppView(view) {
  [[clienteView, "cliente"], [providerView, "prestador"], [settingsView, "settings"], [chatView, "chat"]].forEach(([el, key]) => {
    if (key === view) { if (el.hidden) revealView(el); }
    else el.hidden = true;
  });
  const role = view === "chat" ? currentSessionRole : view;
  mainNav.hidden = role !== "cliente" || view === "settings";
  providerNav.hidden = role !== "prestador" || view === "settings";
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

document.getElementById("homeLogo").addEventListener("click", (event) => {
  event.preventDefault();
  if (currentSessionRole === "prestador") {
    showAppView("prestador");
    setActiveProviderSection("painel");
  } else {
    showAppView("cliente");
    setActiveSection("explorar");
  }
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
  sectionViews.forEach((view) => {
    const show = view.dataset.view === section;
    if (show) { if (view.hidden) revealView(view); }
    else view.hidden = true;
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (link.dataset.appView === "chat") {
      openChatView();
      return;
    }
    showAppView("cliente");
    setActiveSection(link.dataset.section);
  });
});

// ============================================
// Navegação do prestador (Painel / Agenda / Anúncios / Avaliações)
// ============================================
const providerNavLinks = document.querySelectorAll(".provider-nav .nav-link");
const providerSectionViews = document.querySelectorAll(".provider-section");

function setActiveProviderSection(section) {
  providerNavLinks.forEach((link) => link.classList.toggle("active", link.dataset.providerSection === section));
  providerSectionViews.forEach((view) => {
    const show = view.dataset.providerView === section;
    if (show) { if (view.hidden) revealView(view); }
    else view.hidden = true;
  });
}

providerNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (link.dataset.appView === "chat") {
      openChatView();
      return;
    }
    showAppView("prestador");
    setActiveProviderSection(link.dataset.providerSection);
  });
});

// ============================================
// Notificações
// ============================================
const notificationBtn = document.getElementById("notificationBtn");
const notificationsPopover = document.getElementById("notificationsPopover");

function notificationIcon(type) {
  const name = { nova_mensagem: "chat", status_solicitacao: "check", nova_solicitacao: "bell", nova_avaliacao: "star-filled", resposta_avaliacao: "star-filled" }[type] || "bell";
  return iconImage(name, "Notificação");
}

let NOTIFICATIONS = [];

async function loadNotifications() {
  try {
    const response = await authFetch("/notificacoes/me");
    const notifications = await response.json();
    if (!response.ok) throw new Error(notifications.detail || "Não foi possível carregar notificações.");
    NOTIFICATIONS = notifications;
    const list = document.getElementById("notificationList");
    list.replaceChildren();
    notifications.forEach((notification) => {
      const item = document.createElement("div");
      item.className = "notification-item";
      item.dataset.notificationId = notification.id;
      item.innerHTML = `<span>${notificationIcon(notification.tipo)}</span><div><strong>${notification.mensagem}</strong><small>${new Date(notification.criado_em).toLocaleString("pt-BR")}</small></div>`;
      item.addEventListener("click", async () => {
        if (!notification.lida) await authFetch(`/notificacoes/${notification.id}/lida`, { method: "PATCH" });
        item.style.opacity = "0.6";
        notification.lida = true;
        updateNotificationBadge(notifications);
      });
      list.appendChild(item);
    });
    updateNotificationBadge(notifications);
    if (!notifications.length) list.innerHTML = '<p class="empty-state">Nenhuma notificação.</p>';
  } catch (error) {
    showToast(error.message);
  }
}

function updateNotificationBadge(notifications) {
  const unread = notifications.filter((notification) => !notification.lida).length;
  const badge = document.querySelector("#notificationBtn .badge");
  if (unread) {
    if (badge) badge.textContent = unread;
    else notificationBtn.insertAdjacentHTML("beforeend", `<span class="badge">${unread}</span>`);
  } else badge?.remove();

  const chatUnread = notifications.filter((notification) => !notification.lida && notification.tipo === "nova_mensagem").length;
  document.querySelectorAll(".chat-nav-link").forEach((link) => {
    const chatBadge = link.querySelector(".badge");
    if (chatUnread) {
      if (chatBadge) chatBadge.textContent = chatUnread;
      else link.insertAdjacentHTML("beforeend", `<span class="badge">${chatUnread}</span>`);
    } else chatBadge?.remove();
  });
}

async function markChatNotificationsRead() {
  const unreadMessages = NOTIFICATIONS.filter((notification) => !notification.lida && notification.tipo === "nova_mensagem");
  if (!unreadMessages.length) return;
  await Promise.all(unreadMessages.map((notification) => {
    notification.lida = true;
    return authFetch(`/notificacoes/${notification.id}/lida`, { method: "PATCH" });
  }));
  updateNotificationBadge(NOTIFICATIONS);
}

notificationBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  notificationsPopover.hidden = !notificationsPopover.hidden;
  if (!notificationsPopover.hidden) loadNotifications();
});
document.addEventListener("click", (event) => {
  if (!notificationsPopover.hidden && !notificationsPopover.contains(event.target) && event.target !== notificationBtn) {
    notificationsPopover.hidden = true;
  }
});
document.getElementById("markAllReadBtn").addEventListener("click", async () => {
  await authFetch("/notificacoes/marcar-todas-lidas", { method: "PATCH" });
  document.querySelector("#notificationBtn .badge")?.remove();
  notificationsPopover.hidden = true;
  showToast("Notificações marcadas como lidas.");
});

document.getElementById("clearNotificationsBtn").addEventListener("click", async () => {
  await authFetch("/notificacoes/limpar", { method: "DELETE" });
  NOTIFICATIONS = [];
  document.getElementById("notificationList").innerHTML = '<p class="empty-state">Nenhuma notificação.</p>';
  document.querySelector("#notificationBtn .badge")?.remove();
  document.querySelectorAll(".chat-nav-link .badge").forEach((badge) => badge.remove());
  showToast("Caixa de notificações limpa.");
});

// ============================================
// Modal de serviço: solicitar e abrir chat
// ============================================
document.getElementById("hireBtn").addEventListener("click", async () => {
  if (!currentService) return;
  try {
    const response = await authFetch("/solicitacoes", {
      method: "POST",
      body: JSON.stringify({
        servico_id: currentService.id,
        data_hora_agendada: selectedAvailability
          ? `${selectedAvailability.data}T${selectedAvailability.hora_inicio}`
          : null,
        valor_proposto: currentService.price,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível solicitar o serviço.");
    currentChatRequestId = data.id;
    closeModal(document.getElementById("serviceModal"));
    showToast("Solicitação enviada! Acompanhe em Pedidos.");
    await loadClientRequests();
  } catch (error) {
    showToast(error.message);
  }
});
document.getElementById("openChatBtn").addEventListener("click", async () => {
  if (!currentService) return;
  try {
    const response = await authFetch("/solicitacoes", {
      method: "POST",
      body: JSON.stringify({ servico_id: currentService.id }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível abrir o chat com o prestador.");
    currentChatRequestId = data.id;
    closeModal(document.getElementById("serviceModal"));
    openChatConversation(currentChatRequestId);
  } catch (error) {
    showToast(error.message);
  }
});

// ============================================
// Chat
// ============================================
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatEmptyState = document.getElementById("chatEmptyState");
const chatConversationHeader = document.getElementById("chatConversationHeader");
const chatConversationList = document.getElementById("chatConversationList");
const chatQuickActions = document.getElementById("chatQuickActions");
const chatSearchInput = document.getElementById("chatSearchInput");
let CHAT_CONVERSATIONS = [];
const expandedChatGroups = new Set();
const chatStatusLegend = document.getElementById("chatStatusLegend");
const activeChatStatusGroups = new Set(["pending", "confirmed", "done", "cancelled"]);

chatSearchInput.addEventListener("input", renderChatConversationList);

chatStatusLegend?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-status-group]");
  if (!button) return;
  const group = button.dataset.statusGroup;
  if (activeChatStatusGroups.has(group)) {
    if (activeChatStatusGroups.size === 1) return; // mantém ao menos 1 status visível
    activeChatStatusGroups.delete(group);
    button.classList.remove("active");
  } else {
    activeChatStatusGroups.add(group);
    button.classList.add("active");
  }
  renderChatConversationList();
});

async function sendChatMessage(texto) {
  if (!texto || !currentChatRequestId) return;
  try {
    const response = await authFetch(`/solicitacoes/${currentChatRequestId}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível enviar a mensagem.");
    await loadMessages();
  } catch (error) {
    showToast(error.message);
  }
}

document.getElementById("sendAddressBtn").addEventListener("click", async () => {
  try {
    const path = currentSessionRole === "prestador" ? "/prestadores/me" : "/clientes/me";
    const response = await authFetch(path);
    const profile = await readApiResponse(response);
    if (!response.ok) throw new Error(profile.detail || "Não foi possível carregar seu endereço.");
    const parts = [
      [profile.rua, profile.numero].filter(Boolean).join(", "),
      profile.complemento,
      profile.bairro,
      [profile.cidade, profile.estado].filter(Boolean).join("/"),
      profile.cep,
    ].filter(Boolean);
    await sendChatMessage(`📍 Meu endereço: ${parts.join(" — ")}`);
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("sendPhoneBtn").addEventListener("click", async () => {
  try {
    const path = currentSessionRole === "prestador" ? "/prestadores/me" : "/clientes/me";
    const response = await authFetch(path);
    const profile = await readApiResponse(response);
    if (!response.ok) throw new Error(profile.detail || "Não foi possível carregar seu telefone.");
    if (!profile.telefone) {
      showToast("Você ainda não cadastrou um telefone em Configurações.");
      return;
    }
    await sendChatMessage(`📞 Meu telefone: ${profile.telefone}`);
  } catch (error) {
    showToast(error.message);
  }
});

function chatOtherParty(conversation) {
  return currentSessionRole === "prestador"
    ? { name: conversation.cliente_nome, meta: conversation.servico_titulo }
    : { name: conversation.prestador_nome, meta: conversation.servico_titulo };
}

function renderChatConversationList() {
  chatConversationList.replaceChildren();
  if (!CHAT_CONVERSATIONS.length) {
    chatConversationList.innerHTML = '<p class="empty-state">Nenhuma conversa ainda. Solicite um serviço para começar a conversar.</p>';
    return;
  }

  const term = chatSearchInput.value.trim().toLowerCase();
  const filtered = CHAT_CONVERSATIONS.filter((conversation) => {
    if (!activeChatStatusGroups.has(requestStatusClass(conversation.status))) return false;
    if (!term) return true;
    const other = chatOtherParty(conversation);
    return other.name.toLowerCase().includes(term) || conversation.servico_titulo.toLowerCase().includes(term);
  });

  if (!filtered.length) {
    chatConversationList.innerHTML = '<p class="empty-state">Nenhuma conversa encontrada.</p>';
    return;
  }

  // Agrupa por pessoa (prestador, do lado do cliente; cliente, do lado do prestador) pra não
  // repetir o mesmo nome várias vezes quando há mais de um anúncio/pedido com a mesma pessoa.
  const otherIdKey = currentSessionRole === "prestador" ? "cliente_id" : "prestador_id";
  const groups = new Map();
  filtered.forEach((conversation) => {
    const key = conversation[otherIdKey];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(conversation);
  });

  groups.forEach((conversations, key) => {
    const other = chatOtherParty(conversations[0]);
    const groupKey = String(key);
    const hasActive = conversations.some((conversation) => conversation.id === currentChatRequestId);
    const canCollapse = conversations.length > 1;
    if (hasActive) expandedChatGroups.add(groupKey);
    const isExpanded = !canCollapse || hasActive || expandedChatGroups.has(groupKey);

    const group = document.createElement("div");
    group.className = `chat-group${canCollapse && !isExpanded ? " collapsed" : ""}`;

    const header = document.createElement("div");
    header.className = "chat-group-header";
    header.innerHTML = `<span class="avatar">${requestInitials(other.name)}</span><strong>${other.name}</strong>`;
    if (canCollapse) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "chat-group-toggle";
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.title = isExpanded ? "Recolher conversas" : "Expandir conversas";
      toggle.innerHTML = `<span class="chat-group-count">${conversations.length}</span><span class="chat-group-chevron"><svg viewBox="0 0 12 8" width="10" height="7" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const nowExpanded = group.classList.contains("collapsed");
        group.classList.toggle("collapsed", !nowExpanded);
        toggle.setAttribute("aria-expanded", String(nowExpanded));
        toggle.title = nowExpanded ? "Recolher conversas" : "Expandir conversas";
        if (nowExpanded) expandedChatGroups.add(groupKey);
        else expandedChatGroups.delete(groupKey);
      });
      header.appendChild(toggle);
    }
    group.appendChild(header);

    conversations.forEach((conversation) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `chat-list-item mini${conversation.id === currentChatRequestId ? " active" : ""}`;
      item.dataset.requestId = conversation.id;
      item.innerHTML = `
        <i class="chat-status-dot ${requestStatusClass(conversation.status)}" title="${requestStatusLabel(conversation.status)}"></i>
        <span class="chat-preview">
          <span class="chat-preview-top"><span class="chat-preview-name">${conversation.servico_titulo}</span></span>
          <span class="chat-preview-sub">${requestStatusLabel(conversation.status)}</span>
        </span>
      `;
      item.addEventListener("click", () => openChatConversation(conversation.id));
      group.appendChild(item);
    });

    chatConversationList.appendChild(group);
  });
}

async function loadChatConversations() {
  try {
    const path = currentSessionRole === "prestador" ? "/prestadores/me/solicitacoes" : "/clientes/me/solicitacoes";
    const response = await authFetch(path);
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar as conversas.");
    CHAT_CONVERSATIONS = data;
    renderChatConversationList();
  } catch (error) {
    showToast(error.message);
  }
}

function markChatNavActive() {
  const links = currentSessionRole === "prestador" ? providerNavLinks : navLinks;
  links.forEach((item) => item.classList.toggle("active", item.dataset.appView === "chat"));
}

function openChatView() {
  showAppView("chat");
  markChatNavActive();
  loadChatConversations();
  markChatNotificationsRead();
}

async function openChatConversation(requestId) {
  currentChatRequestId = requestId;
  showAppView("chat");
  markChatNavActive();
  await loadChatConversations();
  markChatNotificationsRead();
  const conversation = CHAT_CONVERSATIONS.find((item) => item.id === requestId);
  const chatHeaderFavBtn = document.getElementById("chatHeaderFavoriteBtn");
  if (conversation) {
    const other = chatOtherParty(conversation);
    document.getElementById("chatHeaderAvatar").textContent = requestInitials(other.name);
    document.getElementById("chatHeaderName").textContent = other.name;
    document.getElementById("chatHeaderMeta").textContent = other.meta;
    if (chatHeaderFavBtn) {
      if (currentSessionRole === "cliente") {
        chatHeaderFavBtn.hidden = false;
        updateProviderFavoriteButton(chatHeaderFavBtn, conversation.prestador_id);
        chatHeaderFavBtn.onclick = () => toggleFavoriteProvider(conversation.prestador_id, chatHeaderFavBtn);
      } else {
        chatHeaderFavBtn.hidden = true;
      }
    }
  }
  chatConversationHeader.hidden = false;
  chatEmptyState.hidden = true;
  chatMessages.hidden = false;
  chatForm.hidden = false;
  chatQuickActions.hidden = false;
  loadMessages();
  window.clearInterval(chatPollingTimer);
  chatPollingTimer = window.setInterval(loadMessages, 5000);
}

async function loadMessages() {
  if (!currentChatRequestId) return;
  try {
    const response = await authFetch(`/solicitacoes/${currentChatRequestId}/mensagens`);
    const messages = await response.json();
    if (!response.ok) throw new Error(messages.detail || "Não foi possível carregar o chat.");
    chatMessages.replaceChildren();
    const currentUser = JSON.parse(localStorage.getItem("nearhand_user") || "{}");
    let lastDateLabel = null;
    messages.forEach((message) => {
      const sentAt = new Date(message.data_hora);
      const dateLabel = sentAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      if (dateLabel !== lastDateLabel) {
        lastDateLabel = dateLabel;
        const divider = document.createElement("div");
        divider.className = "chat-date";
        divider.innerHTML = `<span>${dateLabel}</span>`;
        chatMessages.appendChild(divider);
      }
      const bubble = document.createElement("div");
      const isMine = message.remetente_id === currentUser.id && message.remetente_tipo === currentSessionRole;
      bubble.className = isMine ? "message me" : "message them";
      const timeLabel = sentAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      bubble.innerHTML = `${escapeHtml(message.texto)}<span class="message-time">${timeLabel}</span>`;
      chatMessages.appendChild(bubble);
    });
    if (!messages.length) {
      chatMessages.innerHTML = '<p class="empty-state">Nenhuma mensagem ainda. Diga oi!</p>';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    showToast(error.message);
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  await sendChatMessage(text);
  chatInput.value = "";
});

// ============================================
// Pedidos (histórico do cliente)
// ============================================
function formatRequestDate(value) {
  if (!value) return "Data a combinar";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function requestStatusLabel(status) {
  return {
    solicitado: "Solicitado",
    confirmado: "Confirmado",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    cancelado: "Cancelado",
  }[status] || status;
}

function requestStatusClass(status) {
  if (status === "concluido") return "done";
  if (status === "confirmado" || status === "em_andamento") return "confirmed";
  return status === "cancelado" ? "cancelled" : "pending";
}

let CLIENT_REQUESTS = [];
let historyFilter = "todos";
const historyList = document.getElementById("historyList");

function requestInitials(name) {
  return (name || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function historyTabMatches(status, filter) {
  if (filter === "todos") return true;
  if (filter === "andamento") return ["solicitado", "confirmado", "em_andamento"].includes(status);
  return status === filter;
}

function renderHistoryList() {
  if (!historyList) return;
  document.getElementById("historyCountTodos").textContent = CLIENT_REQUESTS.length;
  document.getElementById("historyCountAndamento").textContent = CLIENT_REQUESTS.filter((r) => historyTabMatches(r.status, "andamento")).length;
  document.getElementById("historyCountConcluido").textContent = CLIENT_REQUESTS.filter((r) => r.status === "concluido").length;
  document.getElementById("historyCountCancelado").textContent = CLIENT_REQUESTS.filter((r) => r.status === "cancelado").length;

  const filtered = CLIENT_REQUESTS.filter((request) => historyTabMatches(request.status, historyFilter));
  historyList.replaceChildren();
  if (!filtered.length) {
    historyList.innerHTML = '<p class="empty-state">Nenhum pedido nesta categoria.</p>';
    return;
  }
  filtered.forEach((request) => {
    const wrapper = document.createElement("div");
    wrapper.className = "favorite-provider-block";

    const item = document.createElement("article");
    item.className = "history-item";
    item.dataset.requestId = request.id;
    let actionBtn;
    if (request.avaliacao_id) {
      actionBtn = `
        <span class="status done">Avaliado</span>
        <button type="button" class="text-btn" data-toggle-review="${request.id}" aria-expanded="false">Exibir avaliação</button>
      `;
    } else if (request.status === "concluido") {
      actionBtn = '<button class="text-btn" data-request-action="evaluate">Avaliar</button>';
    } else if (["solicitado", "confirmado"].includes(request.status)) {
      actionBtn = '<button class="text-btn" data-request-action="cancel">Cancelar</button>';
    } else {
      actionBtn = "";
    }
    item.innerHTML = `
      <div class="history-thumb">${requestInitials(request.prestador_nome)}</div>
      <div class="history-content">
        <div class="history-title">${request.servico_titulo}</div>
        <div class="history-provider">${request.prestador_nome} • ${formatRequestDate(request.data_hora_agendada)}</div>
        <div class="history-meta">
          <span class="status ${requestStatusClass(request.status)}">${requestStatusLabel(request.status)}</span>
          <span class="history-price">R$ ${formatPrice(request.valor_proposto || 0)}</span>
        </div>
      </div>
      <div class="history-item-actions">${actionBtn}</div>
    `;
    wrapper.appendChild(item);

    if (request.avaliacao_id) {
      const reviewPanel = document.createElement("div");
      reviewPanel.className = "review-inline-panel";
      reviewPanel.hidden = true;
      reviewPanel.innerHTML = `
        <div class="review-stars">${renderStars(request.avaliacao_nota)}</div>
        <p>${request.avaliacao_comentario || "Sem comentário."}</p>
      `;
      wrapper.appendChild(reviewPanel);
    }

    historyList.appendChild(wrapper);
  });
}

function renderClientAgenda() {
  const list = document.getElementById("clientAgendaList");
  if (!list) return;
  const appointments = CLIENT_REQUESTS
    .filter((request) => request.data_hora_agendada && request.status !== "cancelado")
    .sort((first, second) => new Date(first.data_hora_agendada) - new Date(second.data_hora_agendada));
  list.replaceChildren();
  if (!appointments.length) {
    list.innerHTML = '<p class="empty-state">Nenhum serviço agendado.</p>';
    return;
  }
  appointments.forEach((request) => {
    const scheduledAt = new Date(request.data_hora_agendada);
    const item = document.createElement("article");
    item.className = "agenda-item";
    item.innerHTML = `<div class="date-tile"><strong>${String(scheduledAt.getDate()).padStart(2, "0")}</strong><small>${MONTH_NAMES[scheduledAt.getMonth()].slice(0, 3).toUpperCase()}</small></div><div><strong>${escapeHtml(request.servico_titulo)}</strong><small>${scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • ${escapeHtml(request.prestador_nome)}</small></div><span class="status ${requestStatusClass(request.status)}">${requestStatusLabel(request.status)}</span>`;
    list.appendChild(item);
  });
}

document.getElementById("historyTabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".history-tab");
  if (!tab) return;
  document.querySelectorAll(".history-tab").forEach((el) => el.classList.remove("active"));
  tab.classList.add("active");
  historyFilter = tab.dataset.historyFilter;
  renderHistoryList();
});

async function loadClientRequests() {
  if (currentSessionRole !== "cliente") return;
  if (!historyList) return;
  try {
    const response = await authFetch("/clientes/me/solicitacoes");
    const requests = await response.json();
    if (!response.ok) throw new Error(requests.detail || "Não foi possível carregar seus pedidos.");
    if (currentService) {
      const matchingRequest = requests.find((request) => request.servico_id === currentService.id && request.status !== "cancelado");
      if (matchingRequest) currentChatRequestId = matchingRequest.id;
    }
    CLIENT_EVENTS = requests
      .filter((request) => request.data_hora_agendada && request.status !== "cancelado")
      .map((request) => ({
        date: new Date(request.data_hora_agendada),
        label: `${request.servico_titulo} — ${formatRequestDate(request.data_hora_agendada)} • ${request.prestador_nome}`,
      }));
    renderClientCalendar();
    CLIENT_REQUESTS = requests;
    renderHistoryList();
    renderClientAgenda();
    renderClientReviews();
  } catch (error) {
    showToast(error.message);
  }
}

async function promptAndSubmitReview(requestId) {
  try {
    const nota = Number(window.prompt("Dê uma nota de 1 a 5:"));
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) return;
    const comentario = window.prompt("Escreva um comentário:") || "";
    const evaluationResponse = await authFetch("/avaliacoes", {
      method: "POST",
      body: JSON.stringify({ solicitacao_id: requestId, nota, comentario }),
    });
    const evaluation = await evaluationResponse.json();
    if (!evaluationResponse.ok) throw new Error(evaluation.detail || "Não foi possível salvar a avaliação.");
    await loadClientRequests();
    showToast("Avaliação enviada.");
  } catch (error) {
    showToast(error.message);
  }
}

function toggleReviewPanel(toggleBtn) {
  const panel = toggleBtn.closest(".history-item").nextElementSibling;
  const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
  toggleBtn.setAttribute("aria-expanded", String(!isExpanded));
  toggleBtn.textContent = isExpanded ? "Exibir avaliação" : "Ocultar avaliação";
  if (panel) panel.hidden = isExpanded;
}

historyList.addEventListener("click", async (event) => {
  const toggleBtn = event.target.closest("[data-toggle-review]");
  if (toggleBtn) {
    toggleReviewPanel(toggleBtn);
    return;
  }
  const button = event.target.closest("[data-request-action]");
  if (!button) return;
  const item = button.closest(".history-item");
  if (button.dataset.requestAction === "evaluate") {
    await promptAndSubmitReview(Number(item.dataset.requestId));
    return;
  }
  try {
    const response = await authFetch(`/solicitacoes/${item.dataset.requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelado" }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível cancelar o pedido.");
    await loadClientRequests();
  } catch (error) {
    showToast(error.message);
  }
});

// ============================================
// Aba "Avaliações" do cliente: serviços contratados, avaliar os concluídos
// ============================================
const clientReviewsList = document.getElementById("clientReviewsList");
const clientReviewsSearchInput = document.getElementById("clientReviewsSearchInput");
let clientReviewsSearchTerm = "";

function renderClientReviews() {
  if (!clientReviewsList) return;
  const term = clientReviewsSearchTerm.trim().toLowerCase();
  const contracted = CLIENT_REQUESTS.filter((request) => request.status !== "cancelado").filter((request) => (
    !term || `${request.servico_titulo} ${request.prestador_nome}`.toLowerCase().includes(term)
  ));
  clientReviewsList.replaceChildren();
  if (!contracted.length) {
    clientReviewsList.innerHTML = `<p class="empty-state">${term ? "Nenhum resultado para essa busca." : "Nenhum serviço contratado ainda."}</p>`;
    return;
  }
  contracted.forEach((request) => {
    const wrapper = document.createElement("div");
    wrapper.className = "favorite-provider-block";

    const item = document.createElement("article");
    item.className = "history-item";
    item.dataset.requestId = request.id;
    let actionBtn;
    if (request.avaliacao_id) {
      actionBtn = `
        <span class="status done">Avaliado</span>
        <button type="button" class="text-btn" data-toggle-review="${request.id}" aria-expanded="false">Exibir avaliação</button>
      `;
    } else if (request.status === "concluido") {
      actionBtn = `<button class="text-btn" data-review-action="evaluate">${iconImage("star-filled", "")} Avaliar</button>`;
    } else {
      actionBtn = '<span class="field-help">Disponível após a conclusão</span>';
    }
    item.innerHTML = `
      <div class="history-thumb">${requestInitials(request.prestador_nome)}</div>
      <div class="history-content">
        <div class="history-title">${request.servico_titulo}</div>
        <div class="history-provider">${request.prestador_nome} • ${formatRequestDate(request.data_hora_agendada)}</div>
        <div class="history-meta"><span class="status ${requestStatusClass(request.status)}">${requestStatusLabel(request.status)}</span></div>
      </div>
      <div class="history-item-actions">${actionBtn}</div>
    `;
    wrapper.appendChild(item);

    if (request.avaliacao_id) {
      const reviewPanel = document.createElement("div");
      reviewPanel.className = "review-inline-panel";
      reviewPanel.hidden = true;
      reviewPanel.innerHTML = `
        <div class="review-stars">${renderStars(request.avaliacao_nota)}</div>
        <p>${request.avaliacao_comentario || "Sem comentário."}</p>
      `;
      wrapper.appendChild(reviewPanel);
    }

    clientReviewsList.appendChild(wrapper);
  });
}

clientReviewsList?.addEventListener("click", async (event) => {
  const evaluateBtn = event.target.closest('[data-review-action="evaluate"]');
  if (evaluateBtn) {
    const item = evaluateBtn.closest(".history-item");
    await promptAndSubmitReview(Number(item.dataset.requestId));
    return;
  }
  const toggleBtn = event.target.closest("[data-toggle-review]");
  if (toggleBtn) toggleReviewPanel(toggleBtn);
});

clientReviewsSearchInput?.addEventListener("input", () => {
  clientReviewsSearchTerm = clientReviewsSearchInput.value;
  renderClientReviews();
});

// ============================================
// Painel do prestador: solicitações recebidas
// ============================================
const requestList = document.getElementById("requestList");

let PROVIDER_REQUESTS = [];
const providerClientsList = document.getElementById("providerClientsList");
const providerClientsSearchInput = document.getElementById("providerClientsSearchInput");
let providerClientsSearchTerm = "";

function renderProviderClients() {
  if (!providerClientsList) return;
  const term = providerClientsSearchTerm.trim().toLowerCase();
  const completed = PROVIDER_REQUESTS.filter((request) => request.status === "concluido").filter((request) => (
    !term || request.cliente_nome.toLowerCase().includes(term)
  ));
  providerClientsList.replaceChildren();
  if (!completed.length) {
    providerClientsList.innerHTML = `<p class="empty-state">${term ? "Nenhum resultado para essa busca." : "Nenhum serviço concluído ainda."}</p>`;
    return;
  }

  const groups = new Map();
  completed.forEach((request) => {
    if (!groups.has(request.cliente_id)) groups.set(request.cliente_id, []);
    groups.get(request.cliente_id).push(request);
  });

  groups.forEach((requests) => {
    const [first] = requests.sort((a, b) => new Date(b.data_hora_agendada) - new Date(a.data_hora_agendada));
    const contact = [first.cliente_telefone, first.cliente_email].filter(Boolean).join(" • ");
    const item = document.createElement("article");
    item.className = "history-item";
    const body = requests.length > 1
      ? `
        <div class="client-served-label">Serviços prestados a essa pessoa:</div>
        <ul class="client-served-list">
          ${requests.map((request) => `<li>${request.servico_titulo} • ${formatRequestDate(request.data_hora_agendada)}</li>`).join("")}
        </ul>
      `
      : `<div class="history-provider">${first.servico_titulo} • ${formatRequestDate(first.data_hora_agendada)}</div>`;
    item.innerHTML = `
      <div class="history-thumb">${requestInitials(first.cliente_nome)}</div>
      <div class="history-content">
        <div class="history-title">${first.cliente_nome}</div>
        <div class="history-meta"><span class="history-price">${contact || "Sem contato cadastrado"}</span></div>
        ${body}
      </div>
    `;
    providerClientsList.appendChild(item);
  });
}

providerClientsSearchInput?.addEventListener("input", () => {
  providerClientsSearchTerm = providerClientsSearchInput.value;
  renderProviderClients();
});

async function loadProviderRequests() {
  if (currentSessionRole !== "prestador") return;
  try {
    const response = await authFetch("/prestadores/me/solicitacoes");
    const requests = await response.json();
    if (!response.ok) throw new Error(requests.detail || "Não foi possível carregar as solicitações.");
    PROVIDER_REQUESTS = requests;
    renderProviderClients();
    PROVIDER_EVENTS = requests
      .filter((request) => request.data_hora_agendada && !["cancelado", "concluido"].includes(request.status))
      .map((request) => ({
        date: new Date(request.data_hora_agendada),
        label: `${request.servico_titulo} — ${formatRequestDate(request.data_hora_agendada)} • ${request.cliente_nome}`,
      }));
    renderProviderAgenda();
    requestList.replaceChildren();
    if (!requests.length) {
      requestList.innerHTML = '<p class="empty-state">Nenhuma solicitação recebida.</p>';
      return;
    }
    requests.forEach((request) => {
      const item = document.createElement("article");
      item.className = "request-item";
      item.dataset.requestId = request.id;
      const initials = request.cliente_nome.split(" ").map((part) => part[0]).slice(0, 2).join("");
      const actions = request.status === "solicitado"
        ? '<button class="small-btn accept" data-request-status="confirmado">Aceitar</button><button class="small-btn propose" data-request-status="confirmado">Propor</button><button class="small-btn reject" data-request-status="cancelado">Recusar</button><button class="small-btn" data-chat-request>Chat</button>'
        : request.status === "confirmado"
          ? '<button class="small-btn accept" data-request-status="em_andamento">Iniciar</button><button class="small-btn reject" data-request-status="cancelado">Cancelar</button><button class="small-btn" data-chat-request>Chat</button>'
          : request.status === "em_andamento"
            ? '<button class="small-btn accept" data-request-status="concluido">Concluir</button><button class="small-btn" data-chat-request>Chat</button>'
            : "";
      item.innerHTML = `
        <div class="request-avatar">${initials}</div>
        <div><strong>${request.cliente_nome}</strong><small>${request.servico_titulo} • ${formatRequestDate(request.data_hora_agendada)}</small></div>
        <strong>R$ ${formatPrice(request.valor_proposto || 0)}</strong>
        <div class="request-actions">${actions}</div>
      `;
      requestList.appendChild(item);
    });
  } catch (error) {
    showToast(error.message);
  }
}

async function loadProviderMetrics() {
  if (currentSessionRole !== "prestador") return;
  try {
    const response = await authFetch("/prestadores/me/metrics");
    const metrics = await response.json();
    if (!response.ok) throw new Error(metrics.detail || "Não foi possível carregar as métricas.");
    document.getElementById("metricRequests").textContent = metrics.solicitacoes;
    document.getElementById("metricCompleted").textContent = `${metrics.servicos_realizados} realizados`;
    document.getElementById("metricAcceptance").textContent = `${String(metrics.taxa_aceitacao).replace(".", ",")}%`;
    document.getElementById("metricRating").textContent = String(metrics.nota_media.toFixed(1)).replace(".", ",");
    document.getElementById("metricRevenue").textContent = `R$ ${formatPrice(metrics.faturamento)}`;
    document.getElementById("metricPeriod").textContent = `${String(metrics.mes).padStart(2, "0")}/${metrics.ano}`;
    renderPerformanceChart("topSellingServicesChart", metrics.mais_vendidos, "vendas", "venda");
    renderPerformanceChart("bestPerformingServicesChart", metrics.melhor_desempenho, "nota_media", "estrela");
    renderStatusPieChart("requestStatusChart", metrics.status_distribuicao);
  } catch (error) {
    showToast(error.message);
  }
}

const STATUS_CHART_COLORS = { pending: "#A77A2C", confirmed: "#7FA3C7", done: "#4E8B72", cancelled: "#A65D66" };

function renderStatusPieChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  const entries = (data || []).filter((item) => item.total > 0);
  const total = entries.reduce((sum, item) => sum + item.total, 0);
  if (!total) {
    container.innerHTML = '<p class="empty-state">Ainda não há pedidos neste período.</p>';
    return;
  }
  let cursor = 0;
  const stops = entries.map((item) => {
    const cls = requestStatusClass(item.status);
    const color = STATUS_CHART_COLORS[cls] || "var(--muted)";
    const start = (cursor / total) * 360;
    cursor += item.total;
    const end = (cursor / total) * 360;
    return `${color} ${start}deg ${end}deg`;
  });

  const pie = document.createElement("div");
  pie.className = "pie-chart";
  pie.style.background = `conic-gradient(${stops.join(",")})`;
  container.appendChild(pie);

  const legend = document.createElement("div");
  legend.className = "pie-chart-legend";
  entries.forEach((item) => {
    const cls = requestStatusClass(item.status);
    const color = STATUS_CHART_COLORS[cls] || "var(--muted)";
    const row = document.createElement("div");
    row.className = "pie-chart-legend-row";
    row.innerHTML = `<span class="swatch" style="background:${color}"></span><span>${requestStatusLabel(item.status)}</span><strong>${item.total}</strong>`;
    legend.appendChild(row);
  });
  container.appendChild(legend);
}

function renderPerformanceChart(containerId, data, valueKey, unit) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();
  if (!data?.length || !data.some((item) => Number(item[valueKey]) > 0)) {
    container.innerHTML = '<p class="empty-state">Ainda não há dados suficientes.</p>';
    return;
  }
  const maximum = Math.max(...data.map((item) => Number(item[valueKey])));
  data.forEach((item) => {
    const value = Number(item[valueKey]);
    const row = document.createElement("div");
    row.className = "bar-chart-row";
    row.innerHTML = `<span title="${escapeHtml(item.titulo)}">${escapeHtml(item.titulo)}</span><div class="bar-chart-track"><i style="width:${Math.max((value / maximum) * 100, 4)}%"></i></div><strong>${String(value).replace(".", ",")} ${unit}${value === 1 ? "" : "s"}</strong>`;
    container.appendChild(row);
  });
}

requestList.addEventListener("click", async (event) => {
  const chatButton = event.target.closest("[data-chat-request]");
  if (chatButton) {
    openChatConversation(Number(chatButton.closest(".request-item").dataset.requestId));
    return;
  }
  const button = event.target.closest("[data-request-status]");
  if (!button) return;
  const item = button.closest(".request-item");
  try {
    const response = await authFetch(`/solicitacoes/${item.dataset.requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: button.dataset.requestStatus }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível atualizar a solicitação.");
    await loadProviderRequests();
    showToast(`Solicitação ${requestStatusLabel(data.status).toLowerCase()}.`);
  } catch (error) {
    showToast(error.message);
  }
});

const availabilityForm = document.getElementById("availabilityForm");
const availabilityDate = document.getElementById("availabilityDate");
const availabilityStart = document.getElementById("availabilityStart");
const availabilityEnd = document.getElementById("availabilityEnd");
const availabilityBlocked = document.getElementById("availabilityBlocked");

async function loadProviderAvailability() {
  if (currentSessionRole !== "prestador") return;
  try {
    const response = await authFetch("/prestadores/me/disponibilidade");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível carregar sua disponibilidade.");
    providerAvailability = data;
    renderProviderAgenda();
  } catch (error) {
    showToast(error.message);
  }
}

availabilityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const response = await authFetch("/disponibilidade", {
      method: "POST",
      body: JSON.stringify({
        data: availabilityDate.value,
        hora_inicio: availabilityStart.value,
        hora_fim: availabilityEnd.value,
        bloqueado: availabilityBlocked.checked,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o horário.");
    availabilityForm.reset();
    await loadProviderAvailability();
    showToast("Horário salvo na agenda.");
  } catch (error) {
    showToast(error.message);
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

document.getElementById("addCategoryBtn").addEventListener("click", async () => {
  const name = window.prompt("Nome da nova categoria:");
  if (!name?.trim()) return;
  try {
    const response = await authFetch("/categories/provider", {
      method: "POST",
      body: JSON.stringify({ nome: name.trim() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível criar a categoria.");
    await loadCategories();
    const adCategory = document.getElementById("adCategory");
    adCategory.value = String(data.id);
    showToast(`Categoria "${data.nome}" disponível.`);
  } catch (error) {
    showToast(error.message);
  }
});

let editingServiceId = null;
const newAdEyebrow = document.getElementById("newAdEyebrow");
const newAdTitleEl = document.getElementById("newAdTitle");
const newAdSubmitBtn = document.getElementById("newAdSubmitBtn");

// ============================================
// Disponibilidade semanal do anúncio
// ============================================
const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const adWeeklySchedule = document.getElementById("adWeeklySchedule");

function renderWeeklyScheduleForm() {
  adWeeklySchedule.replaceChildren();
  WEEKDAY_LABELS.forEach((label, dia) => {
    const row = document.createElement("div");
    row.className = "weekly-schedule-row";
    row.dataset.dia = dia;
    row.innerHTML = `
      <label class="day-toggle"><input type="checkbox" data-day-toggle /> ${label}</label>
      <input type="time" data-day-start value="09:00" />
      <input type="time" data-day-end value="18:00" />
      <button type="button" class="small-btn" data-apply-all title="Usar esse horário em todos os dias">Aplicar a todos</button>
    `;
    row.querySelector("[data-day-toggle]").addEventListener("change", (event) => {
      row.classList.toggle("enabled", event.target.checked);
    });
    row.querySelector("[data-apply-all]").addEventListener("click", () => {
      const start = row.querySelector("[data-day-start]").value;
      const end = row.querySelector("[data-day-end]").value;
      adWeeklySchedule.querySelectorAll(".weekly-schedule-row").forEach((otherRow) => {
        if (otherRow === row) return;
        otherRow.querySelector("[data-day-start]").value = start;
        otherRow.querySelector("[data-day-end]").value = end;
        otherRow.querySelector("[data-day-toggle]").checked = true;
        otherRow.classList.add("enabled");
      });
      showToast("Horário aplicado a todos os dias.");
    });
    adWeeklySchedule.appendChild(row);
  });
}

function getWeeklyScheduleValues() {
  return [...adWeeklySchedule.querySelectorAll(".weekly-schedule-row.enabled")].map((row) => ({
    dia_semana: Number(row.dataset.dia),
    hora_inicio: row.querySelector("[data-day-start]").value,
    hora_fim: row.querySelector("[data-day-end]").value,
  })).filter((item) => item.hora_inicio && item.hora_fim);
}

function validateWeeklyScheduleValues(items) {
  for (const item of items) {
    if (item.hora_fim <= item.hora_inicio) {
      return `Em "${WEEKDAY_LABELS[item.dia_semana]}", o horário final precisa ser depois do inicial.`;
    }
  }
  return null;
}

function setWeeklyScheduleValues(schedule) {
  adWeeklySchedule.querySelectorAll(".weekly-schedule-row").forEach((row) => {
    const dia = Number(row.dataset.dia);
    const match = schedule.find((item) => item.dia_semana === dia);
    const checkbox = row.querySelector("[data-day-toggle]");
    checkbox.checked = Boolean(match);
    row.classList.toggle("enabled", Boolean(match));
    row.querySelector("[data-day-start]").value = match ? match.hora_inicio.slice(0, 5) : "09:00";
    row.querySelector("[data-day-end]").value = match ? match.hora_fim.slice(0, 5) : "18:00";
  });
}

renderWeeklyScheduleForm();

function setAdModalMode(mode) {
  const isEdit = mode === "edit";
  newAdEyebrow.textContent = isEdit ? "EDITAR ANÚNCIO" : "NOVO ANÚNCIO";
  newAdTitleEl.textContent = isEdit ? "Editar serviço" : "Publicar serviço";
  newAdSubmitBtn.textContent = isEdit ? "Salvar alterações" : "Publicar anúncio";
}

document.getElementById("newAdBtn").addEventListener("click", () => {
  editingServiceId = null;
  setAdModalMode("create");
  newAdForm.reset();
  adPhotos = [];
  renderAdPhotosGrid();
  renderWeeklyScheduleForm();
  openModal(newAdModal);
});

async function openAdEditModal(serviceId) {
  try {
    const response = await authFetch(`/services/${serviceId}`);
    const service = await readApiResponse(response);
    if (!response.ok) throw new Error(service.detail || "Não foi possível carregar o anúncio.");

    editingServiceId = serviceId;
    setAdModalMode("edit");
    document.getElementById("adTitle").value = service.title || "";
    document.getElementById("adDescription").value = service.description || "";
    document.getElementById("adCategory").value = String(service.categoria_id);
    document.getElementById("adPrice").value = service.price;
    document.getElementById("adPriceType").value = service.price_type;
    document.getElementById("adNegotiable").checked = Boolean(service.negociavel);
    adRadius.value = service.raio_atendimento_km;
    adRadiusLabel.textContent = `${service.raio_atendimento_km} km`;
    adPhotos = (service.photos || []).map((photo) => photo.url);
    renderAdPhotosGrid();

    const scheduleResponse = await authFetch(`/services/${serviceId}/horarios`);
    const schedule = await readApiResponse(scheduleResponse);
    setWeeklyScheduleValues(scheduleResponse.ok ? schedule : []);

    openModal(newAdModal);
  } catch (error) {
    showToast(error.message);
  }
}

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

  if (button.classList.contains("ad-edit")) {
    openAdEditModal(serviceId);
  } else if (button.classList.contains("ad-pause")) {
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

const removeSelectedAdsBtn = document.getElementById("removeSelectedAdsBtn");

function getSelectedAdIds() {
  return [...adList.querySelectorAll(".ad-item")]
    .filter((item) => item.querySelector(".ad-select").checked)
    .map((item) => item.dataset.serviceId);
}

function updateBulkRemoveButton() {
  const count = getSelectedAdIds().length;
  removeSelectedAdsBtn.hidden = count === 0;
  removeSelectedAdsBtn.innerHTML = `<img class="icon" src="img/icons/icon-trash.png" alt="" /> Remover selecionados (${count})`;
}

adList.addEventListener("change", (event) => {
  if (event.target.classList.contains("ad-select")) updateBulkRemoveButton();
});

removeSelectedAdsBtn.addEventListener("click", async () => {
  const ids = getSelectedAdIds();
  if (!ids.length) return;
  if (!confirm(`Remover ${ids.length} anúncio${ids.length === 1 ? "" : "s"} selecionado${ids.length === 1 ? "" : "s"}?`)) return;
  try {
    const results = await Promise.all(
      ids.map((id) => authFetch(`/services/${id}`, { method: "DELETE" }))
    );
    const failed = results.filter((response) => !response.ok).length;
    await loadProviderServices();
    showToast(failed ? `${ids.length - failed} anúncio(s) removido(s), ${failed} falharam.` : "Anúncios removidos.");
  } catch (error) {
    showToast(error.message);
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
        <input type="checkbox" class="ad-select" title="Selecionar anúncio" />
        <div class="ad-thumb electric" style="background-image:url('${service.photos?.[0]?.url || ""}');background-size:cover;background-position:center">${service.photos?.[0]?.url ? "" : serviceVisual(service).icon}</div>
        <div><strong>${service.title}</strong><small>R$ ${formatPrice(service.price)} ${service.price_type === "por_hora" ? "por hora" : "fixo"}${service.negociavel ? " · Negociável" : ""} • Raio de ${service.raio_atendimento_km} km</small></div>
        <span class="status ${service.status === "ativo" ? "done" : "pending"}">${service.status === "ativo" ? "Ativo" : service.status === "pausado" ? "Pausado" : "Removido"}</span>
        <button class="icon-btn ad-edit" title="Editar"><img class="icon" src="img/icons/icon-edit.png" alt="Editar" /></button>
        <button class="icon-btn ad-pause" title="Pausar ou reativar" ${service.status === "removido" ? "disabled" : ""}><img class="icon" src="img/icons/icon-pause.png" alt="Pausar ou reativar" /></button>
        <button class="icon-btn ad-remove" title="Remover" ${service.status === "removido" ? "disabled" : ""}><img class="icon" src="img/icons/icon-trash.png" alt="Remover" /></button>
      `;
      adList.appendChild(item);
    });
    updateBulkRemoveButton();
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
  const weeklySchedule = getWeeklyScheduleValues();
  const scheduleError = validateWeeklyScheduleValues(weeklySchedule);
  if (scheduleError) {
    showToast(scheduleError);
    return;
  }

  const isEdit = editingServiceId !== null;
  try {
    const response = await authFetch(isEdit ? `/services/${editingServiceId}` : "/services", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify({
        titulo: title,
        descricao: document.getElementById("adDescription").value,
        categoria_id: Number(document.getElementById("adCategory").value),
        valor: Number(price),
        tipo_valor: priceType,
        negociavel: document.getElementById("adNegotiable").checked,
        raio_atendimento_km: Number(radius),
        fotos: adPhotos,
      }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o anúncio.");

    const scheduleResponse = await authFetch(`/services/${data.id}/horarios`, {
      method: "PUT",
      body: JSON.stringify({ horarios: weeklySchedule }),
    });
    if (!scheduleResponse.ok) {
      const scheduleErrorData = await readApiResponse(scheduleResponse);
      throw new Error(scheduleErrorData.detail || "Anúncio salvo, mas não foi possível salvar a disponibilidade semanal.");
    }

    closeModal(newAdModal);
    newAdForm.reset();
    adPhotos = [];
    editingServiceId = null;
    renderAdPhotosGrid();
    renderWeeklyScheduleForm();
    await loadProviderServices();
    showToast(isEdit ? "Anúncio atualizado." : "Anúncio publicado.");
  } catch (error) {
    showToast(error.message);
  }
});

// ============================================
// Painel do prestador: avaliações
// ============================================
async function loadProviderEvaluations() {
  if (currentSessionRole !== "prestador") return;
  const panel = document.querySelector('[data-provider-view="avaliacoes"] .panel-card');
  if (!panel) return;
  try {
    const profileResponse = await authFetch("/prestadores/me");
    const profile = await profileResponse.json();
    const response = await fetch(`/prestadores/${profile.id}/avaliacoes`);
    const reviews = await response.json();
    if (!response.ok) throw new Error(reviews.detail || "Não foi possível carregar as avaliações.");
    panel.querySelectorAll(".review").forEach((review) => review.remove());
    if (!reviews.length) {
      panel.insertAdjacentHTML("beforeend", '<p class="empty-state">Você ainda não recebeu avaliações.</p>');
      return;
    }
    reviews.forEach((review) => {
      const item = document.createElement("div");
      item.className = "review";
      item.dataset.evaluationId = review.id;
      item.innerHTML = `<div class="review-stars">${renderStars(review.nota)}</div><p>${review.comentario || "Sem comentário."}</p><small>— ${review.cliente_nome}</small>${review.resposta_prestador ? `<p class="field-help">Sua resposta: ${review.resposta_prestador}</p>` : '<button class="text-btn" data-review-action="reply">Responder</button>'}<button class="text-btn" data-review-action="report">Denunciar</button>`;
      panel.appendChild(item);
    });
  } catch (error) {
    showToast(error.message);
  }
}

document.querySelector('[data-provider-view="avaliacoes"] .panel-card').addEventListener("click", async (event) => {
  const button = event.target.closest("[data-review-action]");
  if (!button) return;
  const item = button.closest(".review");
  try {
    if (button.dataset.reviewAction === "reply") {
      const resposta_prestador = window.prompt("Escreva sua resposta pública:");
      if (!resposta_prestador?.trim()) return;
      const response = await authFetch(`/avaliacoes/${item.dataset.evaluationId}/resposta`, { method: "PATCH", body: JSON.stringify({ resposta_prestador }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível responder.");
      await loadProviderEvaluations();
      showToast("Resposta publicada.");
    } else {
      const response = await authFetch(`/avaliacoes/${item.dataset.evaluationId}/denunciar`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível denunciar.");
      await loadProviderEvaluations();
      showToast("Avaliação denunciada.");
    }
  } catch (error) {
    showToast(error.message);
  }
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

document.querySelectorAll(".settings-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const target = document.getElementById(item.dataset.settingsAnchor);
    if (!target) return;
    document.querySelectorAll(".settings-menu-item").forEach((menuItem) => menuItem.classList.remove("active"));
    item.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function setSettingsRoleVisibility(role) {
  const isProvider = role === "prestador";
  clientProfileForm.hidden = isProvider;
  providerProfileForm.hidden = !isProvider;
  document.getElementById("clientPreferencesCard").hidden = isProvider;
  document.getElementById("clientPaymentCard").hidden = isProvider;
  document.getElementById("providerPaymentCard").hidden = !isProvider;
  const settingsMenuPreferencias = document.getElementById("settingsMenuPreferencias");
  if (settingsMenuPreferencias) settingsMenuPreferencias.hidden = isProvider;

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

const ppPhotoPicker = setupPhotoDropzone({
  dropzoneId: "ppPhotoDropzone",
  fileId: "ppPhotoFile",
  previewId: "ppPhotoPreview",
  emptyId: "ppPhotoEmpty",
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
      ? `${category.nome} <span class="trending-badge">${iconImage("fire", "Em alta")}</span>`
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
      ppPhotoPicker.setValue(settingsProfile.foto || "");
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
    updateStoredUser({ nome: data.nome, email: data.email, foto: data.foto });
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
    foto: ppPhotoPicker.getValue(),
    ...readAddressFields("pp"),
  };
  try {
    const response = await authFetch("/prestadores/me", { method: "PUT", body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o perfil.");
    settingsProfile = data;
    updateStoredUser({ nome: data.nome, email: data.email, foto: data.foto });
    showToast("Perfil atualizado.");
  } catch (error) {
    showToast(error.message);
  }
});

function methodLabel(method) {
  const labels = { pix: "Pix", cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito", banco: "Conta bancária", cartao: "Cartão" };
  return labels[method.tipo] || method.tipo;
}

function renderSavedMethods(containerId, methods, receiving = false) {
  const container = document.getElementById(containerId);
  container.replaceChildren();
  methods.forEach((method) => {
    const item = document.createElement("div");
    item.className = "saved-method";
    const detail = method.tipo === "pix" ? method.chave_pix : method.tipo === "banco" ? `${method.banco} · Ag. ${method.agencia || "-"} · Conta ${method.conta || "-"}` : `Cartão terminado em ${method.ultimos_4_digitos}`;
    item.innerHTML = `<span><strong>${methodLabel(method)}</strong><small>${detail}</small></span><button type="button" class="text-btn" data-method-id="${method.id}" data-receiving="${receiving}">Excluir</button>`;
    container.appendChild(item);
  });
}

async function loadPaymentMethods() {
  if (currentSessionRole !== "cliente") return;
  const response = await authFetch("/clientes/me/metodos-pagamento");
  const methods = await response.json();
  if (response.ok) renderSavedMethods("paymentMethodsList", methods);
}

async function loadReceivingMethods() {
  if (currentSessionRole !== "prestador") return;
  const response = await authFetch("/prestadores/me/metodos-recebimento");
  const methods = await response.json();
  if (response.ok) renderSavedMethods("receivingMethodsList", methods, true);
}

document.getElementById("paymentType").addEventListener("change", () => {
  const pix = document.getElementById("paymentType").value === "pix";
  document.getElementById("paymentPixField").hidden = !pix;
  document.getElementById("paymentCardField").hidden = pix;
});
document.getElementById("receivingType").addEventListener("change", () => {
  const type = document.getElementById("receivingType").value;
  document.getElementById("receivingPixField").hidden = type !== "pix";
  document.getElementById("receivingBankField").hidden = type !== "banco";
  document.getElementById("receivingBankDetails").hidden = type !== "banco";
  document.getElementById("receivingCardField").hidden = type !== "cartao";
});

document.getElementById("paymentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const tipo = document.getElementById("paymentType").value;
  try {
    const response = await authFetch("/clientes/me/metodos-pagamento", { method: "POST", body: JSON.stringify({ tipo, chave_pix: document.getElementById("paymentPixKey").value, ultimos_4_digitos: document.getElementById("paymentLast4").value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o pagamento.");
    event.target.reset(); await loadPaymentMethods(); showToast("Método de pagamento salvo.");
  } catch (error) { showToast(error.message); }
});

document.getElementById("receivingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const tipo = document.getElementById("receivingType").value;
  try {
    const response = await authFetch("/prestadores/me/metodos-recebimento", { method: "POST", body: JSON.stringify({ tipo, chave_pix: document.getElementById("receivingPixKey").value, ultimos_4_digitos: document.getElementById("receivingLast4").value, banco: document.getElementById("receivingBank").value, agencia: document.getElementById("receivingAgency").value, conta: document.getElementById("receivingAccount").value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível salvar o recebimento.");
    event.target.reset(); await loadReceivingMethods(); showToast("Método de recebimento salvo.");
  } catch (error) { showToast(error.message); }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-method-id]");
  if (!button) return;
  const base = button.dataset.receiving === "true" ? "/prestadores/me/metodos-recebimento" : "/clientes/me/metodos-pagamento";
  try {
    const response = await authFetch(`${base}/${button.dataset.methodId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Não foi possível excluir o método.");
    button.closest(".saved-method").remove(); showToast("Método excluído.");
  } catch (error) { showToast(error.message); }
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

      const cellDate = new Date(date.getFullYear(), date.getMonth(), cell.day);
      const dayEvents = events.filter((event) => isSameDate(event.date, cellDate));
      if (dayEvents.length) {
        cellEl.classList.add("has-event");
        cellEl.title = dayEvents.map((event) => event.label).join(" | ");
        cellEl.addEventListener("click", () => dayEvents.forEach((event) => showToast(event.label)));
      }
    }
    gridEl.appendChild(cellEl);
  });
}

let CLIENT_EVENTS = [];
let clientCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);

function renderClientCalendar() {
  renderCalendar({
    gridEl: document.getElementById("clientCalendar"),
    labelEl: document.getElementById("clientCalendarLabel"),
    date: clientCalendarDate,
    events: CLIENT_EVENTS,
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

let PROVIDER_EVENTS = [];
let providerAvailability = [];

function eventsOnDate(date) {
  const blockedEvents = providerAvailability
    .filter((slot) => slot.bloqueado && slot.data)
    .map((slot) => ({
      date: new Date(`${slot.data}T${slot.hora_inicio}`),
      label: `Bloqueado — ${slot.data} ${slot.hora_inicio.slice(0, 5)}–${slot.hora_fim.slice(0, 5)}`,
    }));
  return [...PROVIDER_EVENTS, ...blockedEvents].filter((event) => isSameDate(event.date, date));
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
  refineMapCenter();
  loadProviderServices();
  loadClientRequests();
  loadProviderRequests();
  loadProviderMetrics();
  loadNotifications();
  window.setInterval(loadNotifications, 20000);
  loadPaymentMethods();
  loadReceivingMethods();
  loadProviderAvailability();
  loadProviderEvaluations();
  loadFavorites();
  loadFavoriteProviderIds();
  renderClientCalendar();
  renderProviderAgenda();
}

// ============================================
// Animação de entrada ao rolar a página (scroll reveal)
// ============================================
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
}
