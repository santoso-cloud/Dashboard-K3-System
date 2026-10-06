const INCIDENT_API = "http://localhost:5000/api/insiden";
const incidentBody = document.getElementById("incident-table-body");
const incidentSearch = document.getElementById("incident-search");
const incidentModal = document.getElementById("incident-modal");
const incidentForm = document.getElementById("incident-form");
const incidentError = document.getElementById("incident-form-error");
let incidents = [];
const incidentChartColors = ["#2563eb", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#f97316"];

function incidentToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapeIncident(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function incidentValue(item, ...keys) {
  return keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== "") || "-";
}

function incidentStatusClass(status) {
  const value = String(status).toLowerCase();
  if (value.includes("closed") || value.includes("tutup")) return "closed";
  if (value.includes("progress") || value.includes("tangani")) return "process";
  return "open";
}

function formatIncidentDate(value) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("id-ID");
}

function incidentDate(item) {
  return item.incident_date || item.occurred_at || item.created_at || null;
}

function countIncidentField(items, field, fallback) {
  const groups = new Map();
  items.forEach(item => {
    const label = String(item[field] || fallback).trim() || fallback;
    const key = label.toLocaleLowerCase("id-ID");
    const group = groups.get(key) || { label, count: 0 };
    group.count += 1;
    groups.set(key, group);
  });
  return [...groups.values()].sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, "id"));
}

function renderIncidentCharts(items) {
  const monthlyChart = document.getElementById("incident-month-chart");
  const monthCounts = new Map();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1));

  months.forEach(month => monthCounts.set(`${month.getFullYear()}-${month.getMonth()}`, 0));
  items.forEach(item => {
    const date = new Date(incidentDate(item));
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthCounts.has(key)) monthCounts.set(key, monthCounts.get(key) + 1);
  });

  const maxMonthlyCount = Math.max(...monthCounts.values(), 1);
  monthlyChart.innerHTML = months.map(month => {
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    const count = monthCounts.get(key);
    const label = month.toLocaleDateString("id-ID", { month: "short" });
    const height = count ? Math.max(5, Math.round((count / maxMonthlyCount) * 100)) : 0;
    return `<div class="month-column" title="${escapeIncident(label)} ${month.getFullYear()}: ${count} insiden">
      <span class="month-column-value">${count}</span>
      <div class="month-column-track"><b style="height:${height}%"></b></div>
      <span class="month-column-label">${escapeIncident(label)}</span>
    </div>`;
  }).join("");

  const categories = countIncidentField(items, "category", "Tidak dikategorikan");
  const categoryChart = document.getElementById("incident-category-chart");
  const categoryTotal = items.length;
  let offset = 0;
  const segments = categories.map((category, index) => {
    const start = offset;
    offset += categoryTotal ? (category.count / categoryTotal) * 100 : 0;
    return `${incidentChartColors[index % incidentChartColors.length]} ${start}% ${offset}%`;
  });
  categoryChart.style.background = categoryTotal ? `conic-gradient(${segments.join(",")})` : "#e2e8f0";
  document.getElementById("incident-category-total").innerHTML = `${categoryTotal}<small>Total</small>`;
  document.getElementById("incident-category-legend").innerHTML = categories.length
    ? categories.map((category, index) => `<p>
        <b class="chart-dot" style="background:${incidentChartColors[index % incidentChartColors.length]}"></b>
        <span>${escapeIncident(category.label)}</span>
        <strong>${category.count} (${Math.round((category.count / categoryTotal) * 100)}%)</strong>
      </p>`).join("")
    : '<p class="chart-empty">Belum ada data kategori.</p>';

  const locations = countIncidentField(items.filter(item => item.location), "location", "Lokasi tidak diketahui").slice(0, 5);
  const maxLocationCount = Math.max(...locations.map(location => location.count), 1);
  document.getElementById("incident-location-chart").innerHTML = locations.length
    ? locations.map(location => `<div class="bar-row">
        <span title="${escapeIncident(location.label)}">${escapeIncident(location.label)}</span>
        <div><b style="width:${Math.round((location.count / maxLocationCount) * 100)}%"></b></div>
        <strong>${location.count}</strong>
      </div>`).join("")
    : '<p class="chart-empty">Belum ada data lokasi.</p>';
}

function renderIncidents(items) {
  document.getElementById("incident-table-info").textContent = `Menampilkan ${items.length} insiden`;
  if (!items.length) {
    incidentBody.innerHTML = '<tr><td colspan="8">Tidak ada data insiden.</td></tr>';
    return;
  }

  incidentBody.innerHTML = items.map((item, index) => {
    const status = incidentValue(item, "status");
    const id = Number(item.id);
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeIncident(formatIncidentDate(incidentValue(item, "incident_date", "occurred_at", "created_at")))}</td>
      <td>${escapeIncident(incidentValue(item, "title", "name"))}</td>
      <td><span class="tag bluetag">${escapeIncident(incidentValue(item, "category", "type"))}</span></td>
      <td>${escapeIncident(incidentValue(item, "location", "area"))}</td>
      <td><span class="status ${incidentStatusClass(status)}">${escapeIncident(status)}</span></td>
      <td>${escapeIncident(incidentValue(item, "reporter", "reported_by"))}</td>
      <td><button type="button" data-delete-incident="${id}" title="Hapus">Hapus</button></td>
    </tr>`;
  }).join("");
}

function updateIncidentStats(items) {
  const normalized = item => String(item.status || "").toLowerCase();
  const isClosed = item => /closed|resolved|complete|selesai|tutup/.test(normalized(item));
  const isProcess = item => /progress|investigat|tangani|proses/.test(normalized(item));
  const closed = items.filter(isClosed).length;
  const process = items.filter(item => !isClosed(item) && isProcess(item)).length;
  const open = items.length - closed - process;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const todayCount = items.filter(item => {
    const date = new Date(incidentDate(item));
    return !Number.isNaN(date.getTime()) && date >= todayStart && date < tomorrowStart;
  }).length;

  document.getElementById("incident-stat-total").textContent = items.length;
  document.getElementById("incident-stat-open").textContent = open;
  document.getElementById("incident-stat-process").textContent = process;
  document.getElementById("incident-stat-closed").textContent = closed;
  document.getElementById("incident-stat-today").textContent = todayCount;
  document.getElementById("incident-open-warning").textContent = open
    ? `${open} insiden terbuka memerlukan tindakan segera`
    : "Tidak ada insiden terbuka yang memerlukan tindakan segera";
}

function showIncidentLoadError(message) {
  ["incident-stat-total", "incident-stat-open", "incident-stat-process", "incident-stat-closed", "incident-stat-today"]
    .forEach(id => { document.getElementById(id).textContent = "—"; });
  document.getElementById("incident-table-info").textContent = message;
  document.getElementById("incident-month-chart").innerHTML = `<p class="chart-empty">${escapeIncident(message)}</p>`;
  document.getElementById("incident-category-chart").style.background = "#e2e8f0";
  document.getElementById("incident-category-total").innerHTML = "—<small>Total</small>";
  document.getElementById("incident-category-legend").innerHTML = `<p class="chart-empty">${escapeIncident(message)}</p>`;
  document.getElementById("incident-location-chart").innerHTML = `<p class="chart-empty">${escapeIncident(message)}</p>`;
  document.getElementById("incident-open-warning").textContent = message;
}

async function incidentRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = incidentToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${INCIDENT_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Request gagal (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function filterIncidents(search = "") {
  const query = search.toLocaleLowerCase("id-ID");
  return incidents.filter(item => [item.title, item.category, item.location, item.status, item.reporter]
    .some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query)));
}

async function loadIncidents() {
  incidentBody.innerHTML = '<tr><td colspan="8">Memuat data insiden...</td></tr>';
  try {
    const payload = await incidentRequest();
    incidents = Array.isArray(payload.data) ? payload.data : [];
    updateIncidentStats(incidents);
    renderIncidentCharts(incidents);
    renderIncidents(filterIncidents(incidentSearch.value.trim()));
  } catch (error) {
    incidents = [];
    const message = error.status === 401
      ? "Silakan login untuk melihat data insiden."
      : "Data insiden belum dapat dimuat. Periksa koneksi backend.";
    showIncidentLoadError(message);
    incidentBody.innerHTML = `<tr><td colspan="8">${escapeIncident(message)}</td></tr>`;
  }
}

function openIncidentModal() {
  incidentForm.reset();
  incidentError.textContent = "";
  incidentModal.hidden = false;
  incidentForm.elements.title.focus();
}

function closeIncidentModal() {
  incidentModal.hidden = true;
  incidentError.textContent = "";
}

async function saveIncident(event) {
  event.preventDefault();
  incidentError.textContent = "";
  const data = Object.fromEntries(new FormData(incidentForm).entries());
  const button = incidentForm.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await incidentRequest("", { method: "POST", body: JSON.stringify(data) });
    closeIncidentModal();
    await loadIncidents();
  } catch (error) {
    incidentError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteIncident(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus insiden ini?")) return;
  try {
    await incidentRequest(`/${id}`, { method: "DELETE" });
    await loadIncidents();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById("add-incident-button").addEventListener("click", openIncidentModal);
document.getElementById("close-incident-modal").addEventListener("click", closeIncidentModal);
document.getElementById("cancel-incident-modal").addEventListener("click", closeIncidentModal);
incidentForm.addEventListener("submit", saveIncident);
incidentSearch.addEventListener("input", event => renderIncidents(filterIncidents(event.target.value.trim())));
incidentBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-incident]");
  if (button) deleteIncident(Number(button.dataset.deleteIncident));
});

await loadIncidents();
