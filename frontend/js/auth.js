const roleButtons = document.querySelectorAll("[data-role]");
const modeButtons = document.querySelectorAll("[data-mode]");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const contextBanner = document.getElementById("contextBanner");
const documentGroup = document.getElementById("documentGroup");
const preferencesFutureHint = document.getElementById("preferencesFutureHint");
const registerNameLabel = document.querySelector('label[for="registerName"]');
const registerNameInput = document.getElementById("registerName");
const toast = document.getElementById("toast");

function setupThemeToggle() {
  const button = document.getElementById("themeToggleBtn");
  if (!button) return;
  const applyTheme = (dark) => {
    document.body.classList.toggle("dark", dark);
    button.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
    button.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
    button.querySelector("img").src = `img/icons/icon-${dark ? "sun" : "moonlight"}.png?v=20260912`;
  };
  applyTheme(localStorage.getItem("nearhand_theme") === "dark");
  button.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    localStorage.setItem("nearhand_theme", dark ? "dark" : "light");
    applyTheme(dark);
  });
}

setupThemeToggle();

let currentRole = "cliente";
let currentMode = "login";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

async function readApiResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`O servidor retornou um erro inesperado (${response.status}).`);
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

setupCepLookup("registerCep", {
  rua: "registerRua",
  complemento: "registerComplemento",
  bairro: "registerBairro",
  cidade: "registerCidade",
  estado: "registerEstado",
});

// ============================================
// Foto de perfil: arrastar ou clicar para enviar um arquivo
// ============================================
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

  return { getValue: () => value };
}

const registerPhotoPicker = setupPhotoDropzone({
  dropzoneId: "registerPhotoDropzone",
  fileId: "registerPhotoFile",
  previewId: "registerPhotoPreview",
  emptyId: "registerPhotoEmpty",
});

const roleCopy = {
  cliente: {
    title: "Conta de cliente",
    description: "Entre para buscar serviços próximos, favoritar prestadores e acompanhar seus agendamentos.",
    name: "Nome completo",
    placeholder: "Seu nome completo",
    loginLabel: "Email",
    loginPlaceholder: "Digite seu email",
  },
  prestador: {
    title: "Conta de prestador",
    description: "Entre para publicar seus serviços, organizar a agenda e receber solicitações.",
    name: "Nome da empresa ou do prestador",
    placeholder: "Nome que seus clientes verão",
    loginLabel: "Email",
    loginPlaceholder: "Digite seu email",
  },
};

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
  localStorage.setItem("nearhand_last_role", role);
  const copy = roleCopy[role];
  roleButtons.forEach((button) => {
    const active = button.dataset.role === role;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  contextBanner.querySelector("strong").textContent = copy.title;
  contextBanner.querySelector("p").textContent = copy.description;
  registerNameLabel.textContent = copy.name;
  document.querySelector(".provider-photo-field .field-label").textContent = role === "prestador"
    ? "Foto da empresa *"
    : "Foto de perfil *";
  registerNameInput.placeholder = copy.placeholder;
  document.getElementById("loginIdentityLabel").textContent = copy.loginLabel;
  document.getElementById("loginIdentity").placeholder = copy.loginPlaceholder;
  documentGroup.hidden = role !== "prestador";
  preferencesFutureHint.hidden = role !== "cliente";
  registerNameInput.name = role === "cliente" ? "nome_completo" : "nome_empresa";
}

roleButtons.forEach((button) => button.addEventListener("click", () => setRole(button.dataset.role)));
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelectorAll("[data-open-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.openMode));
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  const icon = button.querySelector("img");
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    icon.src = showing ? "img/icons/icon-visibility-off.png" : "img/icons/icon-visibility.png";
    icon.alt = showing ? "Mostrar senha" : "Ocultar senha";
  });
});

document.querySelector(".text-link").addEventListener("click", (event) => {
  event.preventDefault();
  showToast("Enviaremos um link de recuperação quando o serviço de e-mail estiver conectado.");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.checkValidity()) {
    loginForm.classList.add("show-validation");
    loginForm.reportValidity();
    return;
  }
  const submitButton = loginForm.querySelector("button[type=submit]");
  submitButton.dataset.loadingLabel = "Entrando...";
  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
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
      const data = await readApiResponse(response);
      if (!response.ok) {
        const roleName = currentRole === "prestador" ? "Prestador" : "Cliente";
        const message = response.status === 401
          ? `Credenciais inválidas para o tipo "${roleName}". Se você tem conta do outro tipo, troque a aba acima antes de entrar.`
          : (data.detail || "Não foi possível entrar.");
        throw new Error(message);
      }
      localStorage.setItem("nearhand_access_token", data.access_token);
      localStorage.setItem("nearhand_user", JSON.stringify(data.user));
      localStorage.setItem("nearhand_user_type", data.tipo);
      showToast("Login realizado. Abrindo sua área...");
      window.setTimeout(() => { window.location.href = "/app"; }, 500);
    })
    .catch((error) => {
      showToast(error.message);
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");
    });
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.getElementById("registerPassword").value;
  const confirmation = document.getElementById("registerPasswordConfirm").value;
  if (!registerForm.checkValidity()) {
    registerForm.classList.add("show-validation");
    registerForm.reportValidity();
    return;
  }
  if (password !== confirmation) {
    showToast("As senhas precisam ser iguais.");
    return;
  }
  if (!registerPhotoPicker.getValue()) {
    showToast("Adicione uma foto de perfil ou da empresa.");
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
    senha: password,
  };

  const submitButton = registerForm.querySelector("button[type=submit]");
  submitButton.dataset.loadingLabel = "Criando conta...";
  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
  fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.detail || "Não foi possível criar a conta.");
      showVerificationModal(payload.email, payload.tipo);
    })
    .catch((error) => showToast(error.message))
    .finally(() => { submitButton.disabled = false; submitButton.classList.remove("is-loading"); });
});

// Email verification
let verificationEmail = "";
let verificationType = "";

function showVerificationModal(email, tipo) {
  verificationEmail = email;
  verificationType = tipo;
  document.getElementById("verificationEmail").textContent = email;
  const backdrop = document.getElementById("verificationBackdrop");
  backdrop.hidden = false;
  setTimeout(() => backdrop.classList.add("is-open"), 10);
  document.querySelectorAll(".code-input")[0].focus();
}

function hideVerificationModal() {
  const backdrop = document.getElementById("verificationBackdrop");
  backdrop.classList.remove("is-open");
  setTimeout(() => (backdrop.hidden = true), 280);
  document.querySelectorAll(".code-input").forEach((input) => (input.value = ""));
}

document.querySelectorAll(".code-input").forEach((input, idx, arr) => {
  input.addEventListener("input", (e) => {
    if (e.target.value && idx < arr.length - 1) arr[idx + 1].focus();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !e.target.value && idx > 0) arr[idx - 1].focus();
  });
});

document.getElementById("closeVerificationBtn").addEventListener("click", hideVerificationModal);
document.getElementById("verificationBackdrop").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) hideVerificationModal();
});

document.getElementById("verificationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = Array.from(document.querySelectorAll(".code-input"))
    .map((input) => input.value)
    .join("");

  if (code.length !== 6) {
    document.getElementById("verificationMessage").textContent = "Digite os 6 dígitos";
    return;
  }

  try {
    const response = await fetch("/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: verificationType,
        email: verificationEmail,
        code,
      }),
    });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.detail || "Código inválido");
    showToast("Email verificado! Faça login para continuar.");
    hideVerificationModal();
    document.getElementById("loginIdentity").value = verificationEmail;
    setMode("login");
  } catch (error) {
    document.getElementById("verificationMessage").textContent = error.message;
  }
});

document.querySelectorAll(".auth-form input").forEach((input) => {
  input.addEventListener("input", () => input.closest(".auth-form")?.classList.remove("show-validation"));
});

const urlParams = new URLSearchParams(window.location.search);
const urlRole = urlParams.get("tipo");
const urlMode = urlParams.get("modo");
const lastRole = localStorage.getItem("nearhand_last_role");

if (urlRole === "cliente" || urlRole === "prestador") {
  currentRole = urlRole;
} else if (lastRole === "cliente" || lastRole === "prestador") {
  // Lembra o último tipo de conta usado neste dispositivo, pra quem já se
  // cadastrou como prestador não cair sempre na aba "Cliente" ao voltar.
  currentRole = lastRole;
}
if (urlMode === "login" || urlMode === "cadastro") currentMode = urlMode;

setRole(currentRole);
setMode(currentMode);
