const roleButtons = document.querySelectorAll("[data-role]");
const modeButtons = document.querySelectorAll("[data-mode]");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const contextBanner = document.getElementById("contextBanner");
const documentGroup = document.getElementById("documentGroup");
const servicePreferenceGroup = document.getElementById("servicePreferenceGroup");
const registerNameLabel = document.querySelector('label[for="registerName"]');
const registerNameInput = document.getElementById("registerName");
const preferenceChips = document.querySelectorAll(".preference-chip");
const toast = document.getElementById("toast");

let currentRole = "cliente";
let currentMode = "login";
const selectedPreferences = new Set();

preferenceChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const value = chip.dataset.value;
    if (selectedPreferences.has(value)) {
      selectedPreferences.delete(value);
      chip.classList.remove("active");
    } else {
      selectedPreferences.add(value);
      chip.classList.add("active");
    }
  });
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
  document.getElementById("registerPhoto").required = role === "cliente";
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
  const payload = {
    tipo: currentRole,
    nome: document.getElementById("registerName").value,
    email: document.getElementById("registerEmail").value,
    telefone: document.getElementById("registerPhone").value,
    cpf_cnpj: document.getElementById("registerDocument").value,
    endereco: document.getElementById("registerAddress").value,
    foto: document.getElementById("registerPhoto").value,
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

setRole(currentRole);
setMode(currentMode);
