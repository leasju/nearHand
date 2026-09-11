// ============================================
// Ripple de clique — feedback tátil compartilhado por todas as páginas
// (cliente/prestador, login e admin). Delegado no document, então funciona
// também em botões renderizados dinamicamente por qualquer script da página.
// ============================================
const RIPPLE_SELECTOR = ".primary-btn,.secondary-btn,.ghost-btn,.small-btn,.chip,.toggle-btn,.role-btn,.mode-btn,.admin-tab,.preference-chip,.category-item,.date-option";
document.addEventListener("click", (event) => {
  const target = event.target.closest(RIPPLE_SELECTOR);
  if (!target || target.classList.contains("is-loading") || target.disabled) return;
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
});
