const SETTINGS_API = "http://localhost:5000/api/pengaturan";
const settingsForm = document.querySelector(".center-content");
const settingsMessageElement = document.getElementById("settings-message");
const saveSettingsButton = document.getElementById("save-settings-button");
const resetSettingsButton = document.getElementById("reset-settings-button");
let settings = [];
let originalValues = {};

const settingPanels = {
  company: {
    title: "Profil Perusahaan",
    description: "Kelola identitas dan informasi perusahaan.",
    fields: [
      ["company_name", "Nama Perusahaan", "text"],
      ["company_address", "Alamat Perusahaan", "textarea"],
      ["phone", "Nomor Telepon", "text"],
      ["company_website", "Website Perusahaan", "url"]
    ]
  },
  notifications: {
    title: "Notifikasi",
    description: "Tentukan informasi yang perlu dikirimkan sistem.",
    fields: [
      ["notify_incidents", "Notifikasi insiden", "checkbox"],
      ["notify_corrective_actions", "Notifikasi tindakan korektif", "checkbox"],
      ["notify_training", "Pengingat training", "checkbox"],
      ["notification_digest", "Ringkasan email", "select", ["Tidak ada", "Harian", "Mingguan"]]
    ]
  },
  smtp: {
    title: "Email & SMTP",
    description: "Konfigurasi pengiriman email sistem.",
    fields: [
      ["smtp_host", "SMTP Host", "text"],
      ["smtp_port", "SMTP Port", "number"],
      ["smtp_username", "SMTP Username", "text"],
      ["smtp_password", "SMTP Password", "password"],
      ["smtp_from", "Email Pengirim", "email"],
      ["smtp_secure", "Gunakan koneksi aman", "checkbox"]
    ]
  },
  backup: {
    title: "Backup Database",
    description: "Atur jadwal dan retensi backup database.",
    fields: [
      ["backup_enabled", "Backup otomatis aktif", "checkbox"],
      ["backup_time", "Waktu backup", "time"],
      ["backup_retention_days", "Retensi (hari)", "number"]
    ]
  },
  api: {
    title: "Integrasi API",
    description: "Kelola endpoint dan webhook integrasi eksternal.",
    fields: [
      ["api_base_url", "API Base URL", "url"],
      ["api_webhook_url", "Webhook URL", "url"],
      ["api_enabled", "Integrasi aktif", "checkbox"]
    ]
  },
  security: {
    title: "Keamanan",
    description: "Atur kebijakan keamanan akun dan sesi.",
    fields: [
      ["session_timeout", "Batas sesi (menit)", "number"],
      ["password_min_length", "Panjang password minimum", "number"],
      ["max_login_attempts", "Maksimum percobaan login", "number"],
      ["require_2fa", "Wajibkan autentikasi dua faktor", "checkbox"]
    ]
  },
  appearance: {
    title: "Tampilan Dashboard",
    description: "Sesuaikan tampilan dashboard untuk tim Anda.",
    fields: [
      ["dashboard_theme", "Tema", "select", ["Terang", "Gelap", "Otomatis"]],
      ["dashboard_density", "Kepadatan tampilan", "select", ["Nyaman", "Ringkas"]],
      ["show_sidebar", "Tampilkan sidebar", "checkbox"],
      ["show_dashboard_cards", "Tampilkan kartu ringkasan", "checkbox"]
    ]
  }
};

function settingsToken() { return localStorage.getItem("token") || localStorage.getItem("authToken"); }
function settingKey(item) { return item.key || item.name || item.setting_key || item.setting_name; }
function settingValue(item) { return item.value ?? item.setting_value ?? item.content ?? ""; }
function showSettingsMessage(text, error = false) { settingsMessageElement.textContent = text; settingsMessageElement.className = `settings-message${error ? " error" : ""}`; }

function renderSettingPanels() {
  const container = document.querySelector(".center-content");
  Object.entries(settingPanels).forEach(([section, config]) => {
    const card = document.createElement("div");
    card.className = "form-card settings-panel";
    card.dataset.settingsPanel = section;
    card.hidden = true;
    card.innerHTML = `<h3>${config.title}</h3><p>${config.description}</p><div class="form-grid">${config.fields.map(([name, label, type, options]) => {
      if (type === "checkbox") return `<label class="setting-toggle"><input name="${name}" type="checkbox"><span>${label}</span></label>`;
      if (type === "textarea") return `<div class="input-group full"><label>${label}</label><textarea name="${name}"></textarea></div>`;
      if (type === "select") return `<div class="input-group"><label>${label}</label><select name="${name}">${options.map(option => `<option>${option}</option>`).join("")}</select></div>`;
      return `<div class="input-group"><label>${label}</label><input name="${name}" type="${type}"></div>`;
    }).join("")}</div>`;
    container.append(card);
  });
}

function activateSettingsSection(section) {
  const general = document.querySelector(".center-content > .form-card:first-child");
  const permissions = document.querySelector(".center-content > .form-card:nth-child(2)");
  const isGeneral = section === "general";
  general.hidden = !isGeneral;
  permissions.hidden = section !== "access";
  document.querySelectorAll("[data-settings-panel]").forEach(panel => { panel.hidden = panel.dataset.settingsPanel !== section; });
}

function initializeSettingsMenu() {
  const sections = ["general", "company", "users", "access", "notifications", "smtp", "backup", "api", "security", "appearance"];
  document.querySelectorAll(".settings-menu a").forEach((link, index) => {
    link.dataset.settingsSection = sections[index];
    link.addEventListener("click", event => {
      const section = link.dataset.settingsSection;
      if (section === "users") return;
      event.preventDefault();
      document.querySelectorAll(".settings-menu a").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
      activateSettingsSection(section);
    });
  });
}

async function settingsRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = settingsToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${SETTINGS_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request gagal (${response.status})`);
  return payload;
}

function applySetting(key, value) {
  const field = settingsForm.querySelector(`[name="${CSS.escape(key)}"]`);
  if (!field) return;
  if (field.type === "checkbox") field.checked = value === true || value === "true";
  else field.value = value;
}

async function loadSettings() {
  try {
    const payload = await settingsRequest();
    settings = payload.data || [];
    originalValues = {};
    settings.forEach(item => {
      const key = settingKey(item);
      if (!key) return;
      originalValues[key] = settingValue(item);
      applySetting(key, settingValue(item));
    });
    showSettingsMessage("Pengaturan dimuat dari database.");
  } catch (error) {
    showSettingsMessage(error.message, true);
  }
}

async function saveSettings() {
  const fields = [...settingsForm.querySelectorAll("[name]")];
  saveSettingsButton.disabled = true;
  showSettingsMessage("Menyimpan pengaturan...");

  try {
    for (const field of fields) {
      const key = field.name;
      const value = field.type === "checkbox" ? field.checked : field.value;
      const existing = settings.find(item => settingKey(item) === key);
      const body = existing
        ? { value }
        : { key, value };

      if (existing) await settingsRequest(`/${existing.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await settingsRequest("", { method: "POST", body: JSON.stringify(body) });
    }

    await loadSettings();
    showSettingsMessage("Pengaturan berhasil disimpan ke database.");
  } catch (error) {
    showSettingsMessage(error.message, true);
  } finally {
    saveSettingsButton.disabled = false;
  }
}

function resetSettings() {
  Object.entries(originalValues).forEach(([key, value]) => applySetting(key, value));
  showSettingsMessage("Perubahan dibatalkan.");
}

renderSettingPanels();
initializeSettingsMenu();
activateSettingsSection("general");
saveSettingsButton.addEventListener("click", saveSettings);
resetSettingsButton.addEventListener("click", resetSettings);
loadSettings();
