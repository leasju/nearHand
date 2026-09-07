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

  visibleServices = services.filter((service) => {
    const matchesSearch = [service.title, service.provider, service.category]
      .some((value) => value.toLowerCase().includes(search));
    const matchesCategory = category === "all" || service.category === category;
    return matchesSearch && matchesCategory && service.rating >= minimumRating;
  });

  visibleServices.sort((first, second) => {
    if (sortFilter.value === "rating") return second.rating - first.rating;
    if (sortFilter.value === "price") return first.price - second.price;
    return first.distance - second.distance;
  });
  renderCards();
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
[searchInput, categoryFilter, ratingFilter, sortFilter].forEach((control) => {
  control.addEventListener("input", applyFilters);
  control.addEventListener("change", applyFilters);
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});

renderCards();
renderFavorites();
