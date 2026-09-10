const token = localStorage.getItem("nearhand_admin_token");
const list = document.getElementById("reportedReviews");
const message = document.getElementById("moderationMessage");

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

function stars(rating) {
  return Array.from({ length: 5 }, (_, index) => `<img class="icon" src="img/icons/icon-${index < rating ? "star-filled" : "star-empty"}.png" alt="" />`).join("");
}

async function loadReportedReviews() {
  const response = await fetch("/admin/avaliacoes-denunciadas", { headers: headers() });
  if (handleUnauthorized(response)) return;
  const reviews = await response.json();
  list.replaceChildren();
  if (!reviews.length) {
    list.innerHTML = '<p class="field-help">Nenhuma avaliação denunciada.</p>';
    return;
  }
  reviews.forEach((review) => {
    const item = document.createElement("article");
    item.className = "moderation-item";
    item.dataset.id = review.id;
    item.innerHTML = `
      <div class="moderation-meta"><strong>${review.servico_titulo}</strong><span>${review.prestador_nome}</span></div>
      <div class="review-stars">${stars(review.nota)}</div>
      <p>${review.comentario || "Sem comentário."}</p>
      <small>Cliente: ${review.cliente_nome}</small>
      <div class="moderation-actions"><button class="small-btn approve" data-action="aprovar">Aprovar avaliação</button><button class="small-btn remove" data-action="remover">Remover avaliação</button></div>
    `;
    list.appendChild(item);
  });
}

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const item = button.closest(".moderation-item");
  const response = await fetch(`/admin/avaliacoes/${item.dataset.id}/moderar`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ acao: button.dataset.action }),
  });
  if (handleUnauthorized(response)) return;
  const result = await response.json();
  message.textContent = response.ok ? "Moderação aplicada." : result.detail;
  if (response.ok) await loadReportedReviews();
});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  localStorage.removeItem("nearhand_admin_token");
  window.location.href = "/admin/login";
});

if (!token) window.location.href = "/admin/login";
else loadReportedReviews();
