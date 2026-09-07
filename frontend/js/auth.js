const roleButtons = document.querySelectorAll("[data-role]");
const modeButtons = document.querySelectorAll("[data-mode]");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const contextBanner = document.getElementById("contextBanner");
const documentGroup = document.getElementById("documentGroup");
const servicePreferenceGroup = document.getElementById("servicePreferenceGroup");
const registerNameLabel = document.querySelector('label[for="registerName"]');
const registerNameInput = document.getElementById("registerName");
const registerPreferences = document.getElementById("registerPreferences");
const toast = document.getElementById("toast");

let currentRole = "cliente";
let currentMode = "login";
const selectedPreferences = new Set();

// ============================================
// Categorias (preferências de serviço) — vindas do backend, ordenadas por popularidade
// ============================================
function renderPreferenceChips(container, categories, selected) {
  container.replaceChildren();
  categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preference-chip";
    chip.dataset.value = category.nome;
    chip.classList.toggle("active", selected.has(category.nome));
    chip.innerHTML = category.servico_count > 0
      ? `${category.nome} <span class="trending-badge">🔥</span>`
      : category.nome;
    chip.addEventListener("click", () => {
      if (selectedPreferences.has(category.nome)) {
        selectedPreferences.delete(category.nome);
        chip.classList.remove("active");
      } else {
        selectedPreferences.add(category.nome);
        chip.classList.add("active");
      }
    });
    container.appendChild(chip);
  });
}

fetch("/categories/public")
  .then((response) => response.json())
  .then((categories) => {
    renderPreferenceChips(registerPreferences, categories, selectedPreferences);
    const trendingCount = categories.filter((c) => c.servico_count > 0).length;
    document.getElementById("preferencesHint").textContent =
      trendingCount > 0 ? "🔥 = categoria em alta agora." : "";
  })
  .catch(() => showToast("Não foi possível carregar as categorias."));

// ============================================
// Foto de perfil: colar link ou enviar arquivo
// ============================================
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

  return { getValue: () => value };
}

const registerPhotoPicker = setupPhotoPicker({
  modeId: "registerPhotoMode",
  urlId: "registerPhotoUrl",
  fileId: "registerPhotoFile",
  fileLabelId: "registerPhotoFileLabel",
  previewId: "registerPhotoPreview",
  emptyId: "registerPhotoEmpty",
});

const roleCopy = {
  cliente: {
    title: "Conta de cliente",
    description: "Entre para buscar serviços próximos, favoritar prestadores e acompanhar seus agendamentos.",
    name: "Nome completo",
    placeholder: "Seu nome completo",
  },
  prestador: {
    title: "Conta de prestador",
    description: "Entre para publicar seus serviços, organizar a agenda e receber solicitações.",
    name: "Nome da empresa ou do prestador",
    placeholder: "Nome que seus clientes verão",
  },
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  loginForm.hidden = mode !== "login";
  registerForm.hidden = mode !== "cadastro";
}

function setRole(role) {
  currentRole = role;
  const copy = roleCopy[role];
  roleButtons.forEach((button) => {
    const active = button.dataset.role === role;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  contextBanner.querySelector("strong").textContent = copy.title;
  contextBanner.querySelector("p").textContent = copy.description;
  registerNameLabel.textContent = copy.name;
  registerNameInput.placeholder = copy.placeholder;
  documentGroup.hidden = role !== "prestador";
  servicePreferenceGroup.hidden = role !== "cliente";
  registerNameInput.name = role === "cliente" ? "nome_completo" : "nome_empresa";
}

roleButtons.forEach((button) => button.addEventListener("click", () => setRole(button.dataset.role)));
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelectorAll("[data-open-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.openMode));
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Mostrar" : "Ocultar";
  });
});

document.querySelectorAll(".oauth-btn").forEach((button) => {
  button.addEventListener("click", () => showToast("Login social ficará disponível na próxima etapa."));
});

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

document.querySelector(".text-link").addEventListener("click", (event) => {
  event.preventDefault();
  showToast("Enviaremos um link de recuperação quando o serviço de e-mail estiver conectado.");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.checkValidity()) {
    loginForm.reportValidity();
    return;
  }
  const submitButton = loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: currentRole,
      identificador: document.getElementById("loginIdentity").value,
      senha: document.getElementById("loginPassword").value,
    }),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível entrar.");
      localStorage.setItem("nearhand_access_token", data.access_token);
      localStorage.setItem("nearhand_user", JSON.stringify(data.user));
      localStorage.setItem("nearhand_user_type", data.tipo);
      showToast("Login realizado. Abrindo sua área...");
      window.setTimeout(() => { window.location.href = "/app"; }, 500);
    })
    .catch((error) => {
      showToast(error.message);
      submitButton.disabled = false;
    });
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.getElementById("registerPassword").value;
  const confirmation = document.getElementById("registerPasswordConfirm").value;
  if (!registerForm.checkValidity()) {
    registerForm.reportValidity();
    return;
  }
  if (password !== confirmation) {
    showToast("As senhas precisam ser iguais.");
    return;
  }
  if (currentRole === "cliente" && !registerPhotoPicker.getValue()) {
    showToast("Adicione uma foto de perfil (link ou arquivo).");
    return;
  }
  const payload = {
    tipo: currentRole,
    nome: document.getElementById("registerName").value,
    email: document.getElementById("registerEmail").value,
    telefone: document.getElementById("registerPhone").value,
    cpf_cnpj: document.getElementById("registerDocument").value,
    cep: document.getElementById("registerCep").value,
    rua: document.getElementById("registerRua").value,
    numero: document.getElementById("registerNumero").value,
    complemento: document.getElementById("registerComplemento").value,
    bairro: document.getElementById("registerBairro").value,
    cidade: document.getElementById("registerCidade").value,
    estado: document.getElementById("registerEstado").value,
    foto: registerPhotoPicker.getValue(),
    preferencias: currentRole === "cliente" ? Array.from(selectedPreferences) : [],
    senha: password,
  };

  const submitButton = registerForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível criar a conta.");
      showToast("Conta criada. Agora faça login.");
      document.getElementById("loginIdentity").value = payload.email;
      setMode("login");
    })
    .catch((error) => showToast(error.message))
    .finally(() => { submitButton.disabled = false; });
});

const urlParams = new URLSearchParams(window.location.search);
const urlRole = urlParams.get("tipo");
const urlMode = urlParams.get("modo");
if (urlRole === "cliente" || urlRole === "prestador") currentRole = urlRole;
if (urlMode === "login" || urlMode === "cadastro") currentMode = urlMode;

setRole(currentRole);
setMode(currentMode);
