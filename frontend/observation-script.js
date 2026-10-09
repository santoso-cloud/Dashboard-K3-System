const OBSERVATION_API = "http://localhost:5000/api/observasi";
const observationBody = document.getElementById("observation-table-body");
const observationSearch = document.getElementById("observation-search");
const observationModal = document.getElementById("observation-modal");
const observationForm = document.getElementById("observation-form");
const observationError = document.getElementById("observation-form-error");
const state = {
  observations: [],
  inspections: [],
  search: "",
  type: "",
  status: "",
  location: "",
  page: 1,
  pageSize: 10
};
const chartColors = ["#ef4444", "#f59e0b", "#10b981", "#2563eb", "#8b5cf6", "#06b6d4", "#f97316"];

function observationToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapeObservation(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatObservationDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function observationRecords() {
  return [
    ...state.observations.map(item => ({
      ...item,
      source: "observation",
      sourceId: Number(item.id),
      type: item.type || "Observasi",
      date: item.observation_date || item.created_at,
      createdBy: item.created_by || "-"
    })),
    ...state.inspections.map(item => ({
      ...item,
      source: "inspection",
      sourceId: Number(item.id),
      type: item.type || item.title || "Inspeksi",
      date: item.inspection_date || item.created_at,
      createdBy: item.inspector || "-"
    }))
  ].sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
}

function observationStatusClass(status) {
  return /selesai|complete|closed|resolved/i.test(String(status || "")) ? "selesai" : "proses";
}

function findingCount(value) {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 1;
}

function filteredRecords() {
  const query = state.search.toLocaleLowerCase("id-ID");
  return observationRecords().filter(item => {
    const values = [item.type, item.title, item.location, item.createdBy, item.status, item.findings, item.follow_up];
    return values.some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query))
      && (!state.type || item.type === state.type)
      && (!state.status || item.status === state.status)
      && (!state.location || item.location === state.location);
  });
}

function renderStats(records) {
  const completed = records.filter(item => /selesai|complete|closed|resolved/i.test(String(item.status || ""))).length;
  const scheduled = state.inspections.filter(item => {
    if (!item.inspection_date || /selesai|complete|closed|cancel/i.test(String(item.status || ""))) return false;
    const date = new Date(item.inspection_date);
    const now = new Date();
    return !Number.isNaN(date.getTime())
      && date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }).length;
  const findings = records.reduce((sum, item) => sum + findingCount(item.findings), 0);
  const progress = Math.max(records.length - completed, 0);
  const completionRate = records.length ? Math.round((completed / records.length) * 100) : 0;

  document.getElementById("observation-stat-total").textContent = records.length;
  document.getElementById("observation-stat-findings").textContent = findings;
  document.getElementById("observation-stat-completed").textContent = completed;
  document.getElementById("observation-stat-progress").textContent = progress;
  document.getElementById("observation-stat-scheduled").textContent = scheduled;
  document.getElementById("observation-stat-completed-rate").textContent = `${completionRate}% dari data`;
  document.getElementById("observation-stat-progress-rate").textContent = `${100 - completionRate}% dari data`;

  const gauge = document.getElementById("observation-followup-gauge");
  gauge.innerHTML = `${completionRate}%<small>Data berstatus selesai</small>`;
  gauge.style.background = `conic-gradient(from 270deg,#10b981 0 ${completionRate}%,#fef3c7 ${completionRate}% 100%)`;
  document.getElementById("observation-followup-summary").textContent = `${completed} selesai dari ${records.length} data`;
}

function renderStatusChart(records) {
  const groups = new Map();
  records.forEach(item => {
    const label = item.status || "Tanpa status";
    groups.set(label, (groups.get(label) || 0) + 1);
  });
  const entries = [...groups.entries()].sort((first, second) => second[1] - first[1]);
  const chart = document.getElementById("observation-status-chart");
  let offset = 0;
  const segments = entries.map(([, count], index) => {
    const start = offset;
    offset += records.length ? (count / records.length) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`;
  });
  chart.style.background = records.length ? `conic-gradient(${segments.join(",")})` : "#e2e8f0";
  document.getElementById("observation-status-total").innerHTML = `${records.length}<small>Total Data</small>`;
  document.getElementById("observation-status-legend").innerHTML = entries.length
    ? entries.map(([label, count], index) => `<p>
        <span><b class="chart-dot" style="background:${chartColors[index % chartColors.length]}"></b>${escapeObservation(label)}</span>
        <strong>${count} (${Math.round((count / records.length) * 100)}%)</strong>
      </p>`).join("")
    : '<p class="chart-empty">Belum ada data.</p>';
}

function renderTypeChart(records) {
  const groups = new Map();
  records.forEach(item => groups.set(item.type, (groups.get(item.type) || 0) + 1));
  const entries = [...groups.entries()].sort((first, second) => second[1] - first[1]);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  const rows = entries.map(([label, count]) => `<div class="bar-row">
      <span title="${escapeObservation(label)}">${escapeObservation(label)}</span>
      <div><b style="width:${Math.round((count / max) * 100)}%"></b></div>
      <strong>${count}</strong>
    </div>`).join("");
  document.getElementById("observation-type-chart").innerHTML = entries.length
    ? `<div class="type-chart">${rows}</div>`
    : '<p class="chart-empty">Belum ada data.</p>';
}

function renderSchedule() {
  const now = new Date();
  const upcoming = state.inspections.filter(item => {
    const date = new Date(item.inspection_date);
    return item.inspection_date && !Number.isNaN(date.getTime()) && date >= now
      && !/selesai|complete|closed|cancel/i.test(String(item.status || ""));
  }).sort((first, second) => new Date(first.inspection_date) - new Date(second.inspection_date)).slice(0, 5);
  document.getElementById("observation-schedule-list").innerHTML = upcoming.length
    ? upcoming.map(item => `<div class="schedule">
        <i class="fa-regular fa-calendar"></i>
        <p>${escapeObservation(item.title || item.location || "Inspeksi")}
          <br><small>${escapeObservation(item.location || "Lokasi belum diisi")} · ${escapeObservation(formatObservationDate(item.inspection_date))}</small>
        </p>
      </div>`).join("")
    : '<p class="schedule-empty">Tidak ada inspeksi mendatang.</p>';
}

function renderFilters(records) {
  const filters = [
    ["observation-type-filter", "Semua Jenis", [...new Set(records.map(item => item.type).filter(Boolean))]],
    ["observation-status-filter", "Semua Status", [...new Set(records.map(item => item.status).filter(Boolean))]],
    ["observation-location-filter", "Semua Lokasi", [...new Set(records.map(item => item.location).filter(Boolean))]]
  ];
  filters.forEach(([id, placeholder, options]) => {
    const select = document.getElementById(id);
    const currentValue = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + options
      .sort((first, second) => first.localeCompare(second, "id"))
      .map(value => `<option value="${escapeObservation(value)}">${escapeObservation(value)}</option>`).join("");
    select.value = currentValue;
  });
}

function renderObservations() {
  const records = filteredRecords();
  const pageCount = Math.max(1, Math.ceil(records.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pageItems = records.slice(start, start + state.pageSize);

  observationBody.innerHTML = pageItems.length ? pageItems.map((item, index) => {
    const actions = item.source === "observation"
      ? `<button type="button" data-delete-observation="${item.sourceId}" title="Hapus">Hapus</button>`
      : "-";
    return `<tr data-record-source="${item.source}">
      <td>${start + index + 1}</td>
      <td>${escapeObservation(formatObservationDate(item.date))}</td>
      <td><span class="tag blue-tag">${escapeObservation(item.type)}</span></td>
      <td>${escapeObservation(item.location || "-")}</td>
      <td>${escapeObservation(item.createdBy || "-")}</td>
      <td><span class="status ${observationStatusClass(item.status)}">${escapeObservation(item.status || "-")}</span></td>
      <td>${escapeObservation(item.findings ?? "-")}</td>
      <td>${escapeObservation(item.follow_up ?? "-")}</td>
      <td class="action">${actions}</td>
    </tr>`;
  }).join("") : '<tr><td colspan="9">Tidak ada data observasi atau inspeksi.</td></tr>';

  document.getElementById("observation-table-info").textContent = records.length
    ? `Menampilkan ${start + 1}-${Math.min(start + state.pageSize, records.length)} dari ${records.length} data`
    : "Menampilkan 0 dari 0 data";
  document.getElementById("observation-page-info").textContent = `${state.page} / ${pageCount}`;
  document.getElementById("observation-page-prev").disabled = state.page <= 1;
  document.getElementById("observation-page-next").disabled = state.page >= pageCount;
}

function renderAll() {
  const records = observationRecords();
  renderFilters(records);
  renderStats(records);
  renderStatusChart(records);
  renderTypeChart(records);
  renderSchedule();
  renderObservations();
}

async function observationRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = observationToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${OBSERVATION_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Request gagal (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadObservations() {
  observationBody.innerHTML = '<tr><td colspan="9">Memuat data observasi...</td></tr>';
  try {
    const payload = await observationRequest("/summary");
    state.observations = Array.isArray(payload.data?.observations) ? payload.data.observations : [];
    state.inspections = Array.isArray(payload.data?.inspections) ? payload.data.inspections : [];
    renderAll();
  } catch (error) {
    const message = error.status === 401
      ? "Silakan login untuk melihat data observasi."
      : "Data observasi belum dapat dimuat. Periksa koneksi backend.";
    document.getElementById("observation-table-info").textContent = message;
    observationBody.innerHTML = `<tr><td colspan="9">${escapeObservation(message)}</td></tr>`;
    ["observation-stat-total", "observation-stat-findings", "observation-stat-completed", "observation-stat-progress", "observation-stat-scheduled"]
      .forEach(id => { document.getElementById(id).textContent = "—"; });
    document.getElementById("observation-status-total").innerHTML = "—<small>Total Data</small>";
    document.getElementById("observation-status-legend").innerHTML = `<p class="chart-empty">${escapeObservation(message)}</p>`;
    document.getElementById("observation-type-chart").innerHTML = `<p class="chart-empty">${escapeObservation(message)}</p>`;
    document.getElementById("observation-schedule-list").innerHTML = `<p class="schedule-empty">${escapeObservation(message)}</p>`;
    document.getElementById("observation-followup-gauge").innerHTML = `—<small>${escapeObservation(message)}</small>`;
    document.getElementById("observation-followup-summary").textContent = message;
    document.getElementById("observation-status-chart").style.background = "#e2e8f0";
  }
}

function openObservationModal() {
  observationForm.reset();
  observationError.textContent = "";
  observationModal.hidden = false;
  observationForm.elements.location.focus();
}

function closeObservationModal() {
  observationModal.hidden = true;
  observationError.textContent = "";
}

async function saveObservation(event) {
  event.preventDefault();
  observationError.textContent = "";
  const data = Object.fromEntries(new FormData(observationForm).entries());
  data.findings = Number(data.findings);
  data.follow_up = Number(data.follow_up);
  const button = observationForm.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    await observationRequest("", { method: "POST", body: JSON.stringify(data) });
    closeObservationModal();
    await loadObservations();
  } catch (error) {
    observationError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteObservation(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus data observasi ini?")) return;
  try {
    await observationRequest(`/${id}`, { method: "DELETE" });
    await loadObservations();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById("add-observation-button").addEventListener("click", openObservationModal);
document.getElementById("close-observation-modal").addEventListener("click", closeObservationModal);
document.getElementById("cancel-observation-modal").addEventListener("click", closeObservationModal);
observationForm.addEventListener("submit", saveObservation);
observationSearch.addEventListener("input", event => {
  state.search = event.target.value.trim();
  state.page = 1;
  renderObservations();
});

[
  ["observation-type-filter", "type"],
  ["observation-status-filter", "status"],
  ["observation-location-filter", "location"]
].forEach(([id, key]) => {
  document.getElementById(id).addEventListener("change", event => {
    state[key] = event.target.value;
    state.page = 1;
    renderObservations();
  });
});

document.getElementById("observation-reset").addEventListener("click", () => {
  observationSearch.value = "";
  state.search = "";
  state.type = "";
  state.status = "";
  state.location = "";
  state.page = 1;
  ["observation-type-filter", "observation-status-filter", "observation-location-filter"]
    .forEach(id => { document.getElementById(id).value = ""; });
  renderObservations();
});

document.getElementById("observation-page-size").addEventListener("change", event => {
  state.pageSize = Number(event.target.value) || 10;
  state.page = 1;
  renderObservations();
});
document.getElementById("observation-page-prev").addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderObservations();
});
document.getElementById("observation-page-next").addEventListener("click", () => {
  state.page += 1;
  renderObservations();
});
observationBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-observation]");
  if (button) deleteObservation(Number(button.dataset.deleteObservation));
});

await loadObservations();
