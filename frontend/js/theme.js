(() => {
  const button = document.getElementById("themeToggleBtn");
  if (!button) return;

  const applyTheme = (dark) => {
    document.body.classList.toggle("dark", dark);
    button.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
    button.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
    const icon = button.querySelector("img");
    if (icon) icon.src = `img/icons/icon-${dark ? "sun" : "moonlight"}.png?v=20260912`;
  };

  applyTheme(localStorage.getItem("nearhand_theme") === "dark");
  button.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    localStorage.setItem("nearhand_theme", dark ? "dark" : "light");
    applyTheme(dark);
  });
})();
