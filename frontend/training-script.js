const TRAINING_API = "http://localhost:5000/api/training";
const trainingBody = document.getElementById("training-table-body");
const trainingSearch = document.getElementById("training-search");
const trainingModal = document.getElementById("training-modal");
const trainingForm = document.getElementById("training-form");
const trainingError = document.getElementById("training-form-error");
const state = { trainings: [], search: "", category: "", status: "", trainer: "", page: 1, pageSize: 10 };
const chartColors = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#ef4444", "#f97316"];

function trainingToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapeTraining(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function trainingValue(item, ...keys) {
  return keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== "") || "-";
}

function trainingStatusClass(status) {
  const value = normalizeTrainingStatus(status);
  if (value === "completed") return "selesai";
  if (value === "in progress") return "berlangsung";
  return "terjadwal";
}

function normalizeTrainingStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (/selesai|complete|completed|closed/.test(value)) return "completed";
  if (/berlangsung|langsung|ongoing|in progress|progress/.test(value)) return "in progress";
  if (/batal|cancel/.test(value)) return "cancelled";
  if (/jadwal|schedule|scheduled|planned/.test(value)) return "scheduled";
  return value || "unknown";
}

function trainingStatusLabel(status) {
  const labels = { scheduled: "Terjadwal", "in progress": "Berlangsung", completed: "Selesai", cancelled: "Dibatalkan", unknown: "Tidak diketahui" };
  return labels[normalizeTrainingStatus(status)] || status;
}

function formatTrainingDate(value) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("id-ID");
}

function upcomingTrainings(items) {
  const now = new Date();
  return items.filter(item => {
    const date = new Date(item.scheduled_at);
    return item.scheduled_at && !Number.isNaN(date.getTime()) && date >= now
      && !["cancelled", "completed"].includes(normalizeTrainingStatus(item.status));
  }).sort((first, second) => new Date(first.scheduled_at) - new Date(second.scheduled_at));
}

function filteredTrainings() {
  const query = state.search.toLocaleLowerCase("id-ID");
  return state.trainings.filter(item => [item.name, item.category, item.trainer, item.status, item.duration]
    .some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query))
    && (!state.category || item.category === state.category)
    && (!state.status || normalizeTrainingStatus(item.status) === state.status)
    && (!state.trainer || item.trainer === state.trainer));
}

function renderStats(items) {
  const completed = items.filter(item => normalizeTrainingStatus(item.status) === "completed").length;
  const active = items.filter(item => normalizeTrainingStatus(item.status) === "in progress").length;
  const scheduled = items.filter(item => normalizeTrainingStatus(item.status) === "scheduled").length;
  const categories = new Set(items.map(item => item.category).filter(Boolean));
  const capacity = items.reduce((sum, item) => sum + (Number(item.capacity) || 0), 0);
  const upcoming = upcomingTrainings(items);

  document.getElementById("training-stat-total").textContent = items.length;
  document.getElementById("training-stat-active").textContent = active;
  document.getElementById("training-stat-certificates").textContent = categories.size;
  document.getElementById("training-stat-scheduled").textContent = scheduled;
  document.getElementById("training-stat-completed").textContent = completed;
  document.getElementById("training-category-count").textContent = categories.size;
  document.getElementById("training-capacity-total").textContent = capacity;
  document.getElementById("training-trainer-total").textContent = items.filter(item => item.trainer).length;
  document.getElementById("training-upcoming-total").textContent = upcoming.length;
}

function renderCategoryChart(items) {
  const groups = new Map();
  items.forEach(item => {
    const label = normalizeTrainingStatus(item.status);
    groups.set(label, (groups.get(label) || 0) + 1);
  });
  const entries = [...groups.entries()].sort((first, second) => second[1] - first[1]);
  let offset = 0;
  const segments = entries.map(([, count], index) => {
    const start = offset;
    offset += items.length ? (count / items.length) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`;
  });
  const chart = document.getElementById("training-category-chart");
  chart.style.background = items.length ? `conic-gradient(${segments.join(",")})` : "#e2e8f0";
  document.getElementById("training-category-total").innerHTML = `${items.length}<small>Total</small>`;
  document.getElementById("training-category-legend").innerHTML = entries.length
    ? entries.map(([label, count], index) => `<p>
        <span><b class="chart-dot" style="background:${chartColors[index % chartColors.length]}"></b>${escapeTraining(trainingStatusLabel(label))}</span>
        <strong>${count} (${Math.round((count / items.length) * 100)}%)</strong>
      </p>`).join("")
    : '<p class="chart-empty">Belum ada data status.</p>';
}

function renderStatusChart(items) {
  const groups = new Map();
  items.forEach(item => {
    const status = normalizeTrainingStatus(item.status);
    groups.set(status, (groups.get(status) || 0) + 1);
  });
  const entries = [...groups.entries()].sort((first, second) => second[1] - first[1]);
  document.getElementById("training-status-chart").innerHTML = entries.length
    ? entries.map(([status, count], index) => {
        const percent = items.length ? Math.round((count / items.length) * 100) : 0;
        return `<div class="bar-row">
          <span>${escapeTraining(trainingStatusLabel(status))}</span>
          <div><b style="width:${percent}%;background:${chartColors[index % chartColors.length]}"></b></div>
          <strong>${percent}%</strong>
        </div>`;
      }).join("")
    : '<p class="chart-empty">Belum ada data status.</p>';
}

function renderUpcoming(items) {
  const upcoming = upcomingTrainings(items).slice(0, 5);
  document.getElementById("training-upcoming-list").innerHTML = upcoming.length
    ? upcoming.map(item => `<div class="schedule">
        <i class="fa-regular fa-calendar"></i>
        <p>${escapeTraining(item.name)}<br><small>${escapeTraining(formatTrainingDate(item.scheduled_at))}</small></p>
        <span>${escapeTraining(item.capacity ?? 0)} Kapasitas</span>
      </div>`).join("")
    : '<p class="chart-empty">Tidak ada training mendatang.</p>';
}

function renderFilters(items) {
  const filters = [
    ["training-category-filter", "Semua Kategori", [...new Set(items.map(item => item.category).filter(Boolean))]],
    ["training-status-filter", "Semua Status", [...new Set(items.map(item => normalizeTrainingStatus(item.status)))].filter(status => status !== "unknown")],
    ["training-trainer-filter", "Semua Trainer", [...new Set(items.map(item => item.trainer).filter(Boolean))]]
  ];
  filters.forEach(([id, placeholder, options]) => {
    const select = document.getElementById(id);
    const value = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + options
      .sort((first, second) => first.localeCompare(second, "id"))
      .map(option => `<option value="${escapeTraining(option)}">${escapeTraining(id === "training-status-filter" ? trainingStatusLabel(option) : option)}</option>`).join("");
    select.value = value;
  });
}

function renderTrainings() {
  const items = filteredTrainings();
  const pageCount = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pageItems = items.slice(start, start + state.pageSize);

  trainingBody.innerHTML = pageItems.length ? pageItems.map((item, index) => `<tr>
    <td>${start + index + 1}</td>
    <td>${escapeTraining(item.name || "-")}</td>
    <td>${escapeTraining(item.category || "-")}</td>
    <td>${escapeTraining(item.trainer || "-")}</td>
    <td>${escapeTraining(item.capacity ?? 0)}</td>
    <td>${escapeTraining(formatTrainingDate(item.scheduled_at))}</td>
    <td>${escapeTraining(item.duration || "-")}</td>
    <td><span class="status ${trainingStatusClass(item.status)}">${escapeTraining(trainingStatusLabel(item.status))}</span></td>
    <td><button type="button" data-delete-training="${Number(item.id)}" title="Hapus">Hapus</button></td>
  </tr>`).join("") : '<tr><td colspan="9">Tidak ada data training.</td></tr>';

  document.getElementById("training-table-info").textContent = items.length
    ? `Menampilkan ${start + 1}-${Math.min(start + state.pageSize, items.length)} dari ${items.length} training`
    : "Menampilkan 0 dari 0 training";
  document.getElementById("training-page-info").textContent = `${state.page} / ${pageCount}`;
  document.getElementById("training-page-prev").disabled = state.page <= 1;
  document.getElementById("training-page-next").disabled = state.page >= pageCount;
}

function renderAll() {
  renderStats(state.trainings);
  renderCategoryChart(state.trainings);
  renderUpcoming(state.trainings);
  renderFilters(state.trainings);
  renderTrainings();
}

async function trainingRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = trainingToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${TRAINING_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Request gagal (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadTrainings() {
  trainingBody.innerHTML = '<tr><td colspan="9">Memuat data training...</td></tr>';
  try {
    const payload = await trainingRequest();
    state.trainings = Array.isArray(payload.data) ? payload.data : [];
    renderAll();
  } catch (error) {
    const message = error.status === 401
      ? "Silakan login untuk melihat data training."
      : "Data training belum dapat dimuat. Periksa koneksi backend.";
    trainingBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`;
    document.getElementById("training-table-info").textContent = message;
    ["training-stat-total", "training-stat-active", "training-stat-certificates", "training-stat-scheduled", "training-stat-completed", "training-capacity-total", "training-trainer-total", "training-upcoming-total", "training-category-count"]
      .forEach(id => { document.getElementById(id).textContent = "—"; });
    document.getElementById("training-category-total").innerHTML = "—<small>Total</small>";
    document.getElementById("training-category-legend").innerHTML = `<p class="chart-empty">${escapeTraining(message)}</p>`;
    document.getElementById("training-upcoming-list").innerHTML = `<p class="chart-empty">${escapeTraining(message)}</p>`;
  }
}

function openTrainingModal() {
  trainingForm.reset();
  trainingError.textContent = "";
  trainingModal.hidden = false;
  trainingForm.elements.name.focus();
}

function closeTrainingModal() {
  trainingModal.hidden = true;
  trainingError.textContent = "";
}

async function saveTraining(event) {
  event.preventDefault();
  trainingError.textContent = "";
  const data = Object.fromEntries(new FormData(trainingForm).entries());
  data.capacity = Number(data.capacity);
  const button = trainingForm.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await trainingRequest("", { method: "POST", body: JSON.stringify(data) });
    closeTrainingModal();
    await loadTrainings();
  } catch (error) {
    trainingError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteTraining(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus training ini?")) return;
  try {
    await trainingRequest(`/${id}`, { method: "DELETE" });
    await loadTrainings();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById("add-training-button").addEventListener("click", openTrainingModal);
document.getElementById("close-training-modal").addEventListener("click", closeTrainingModal);
document.getElementById("cancel-training-modal").addEventListener("click", closeTrainingModal);
trainingForm.addEventListener("submit", saveTraining);
trainingSearch.addEventListener("input", event => {
  state.search = event.target.value.trim();
  state.page = 1;
  renderTrainings();
});

[
  ["training-category-filter", "category"],
  ["training-status-filter", "status"],
  ["training-trainer-filter", "trainer"]
].forEach(([id, key]) => {
  document.getElementById(id).addEventListener("change", event => {
    state[key] = event.target.value;
    state.page = 1;
    renderTrainings();
  });
});

document.getElementById("training-reset").addEventListener("click", () => {
  trainingSearch.value = "";
  state.search = "";
  state.category = "";
  state.status = "";
  state.trainer = "";
  state.page = 1;
  ["training-category-filter", "training-status-filter", "training-trainer-filter"]
    .forEach(id => { document.getElementById(id).value = ""; });
  renderTrainings();
});

document.getElementById("training-page-size").addEventListener("change", event => {
  state.pageSize = Number(event.target.value) || 10;
  state.page = 1;
  renderTrainings();
});
document.getElementById("training-page-prev").addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderTrainings();
});
document.getElementById("training-page-next").addEventListener("click", () => {
  state.page += 1;
  renderTrainings();
});
trainingBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-training]");
  if (button) deleteTraining(Number(button.dataset.deleteTraining));
});

await loadTrainings();
