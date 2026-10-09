const AUDIT_API = "http://localhost:5000/api/audit";
const ACTION_API = "http://localhost:5000/api/tindakan";
const auditBody = document.getElementById("audit-table-body");
const auditSearch = document.getElementById("audit-search");
const auditModal = document.getElementById("audit-modal");
const auditForm = document.getElementById("audit-form");
const auditError = document.getElementById("audit-form-error");
const state = { audits: [], actions: [], query: "", type: "", status: "", location: "" };
const chartColors = ["#10b981", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

function auditToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapeAudit(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function auditValue(item, ...keys) {
  return keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== "") || "-";
}

function statusClass(status) {
  const value = normalizeAuditStatus(status);
  if (value === "completed") return "done";
  if (value === "in progress") return "run";
  return "plan";
}

function normalizeAuditStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (/selesai|complete|closed/.test(value)) return "completed";
  if (/berjalan|progress|ongoing|in progress/.test(value)) return "in progress";
  if (/rencana|plan|scheduled/.test(value)) return "planned";
  return value || "unknown";
}

function auditStatusLabel(status) {
  const labels = { completed: "Selesai", "in progress": "Berjalan", planned: "Direncanakan", unknown: "Tidak diketahui" };
  return labels[normalizeAuditStatus(status)] || status;
}

function auditDate(item) {
  return item.audit_date || item.date || item.scheduled_date || null;
}

function filteredAudits() {
  const query = state.query.toLocaleLowerCase("id-ID");
  return state.audits.filter(item => [item.name, item.type, item.location, item.auditor, item.status, item.findings]
    .some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query))
    && (!state.type || item.type === state.type)
    && (!state.status || normalizeAuditStatus(item.status) === state.status)
    && (!state.location || item.location === state.location));
}

function renderAuditRows(items) {
  const tableInfo = document.getElementById("audit-table-info");
  tableInfo.textContent = items.length ? `Menampilkan ${items.length} audit` : "Menampilkan 0 audit";
  if (!items.length) {
    auditBody.innerHTML = '<tr><td colspan="10">Tidak ada data audit.</td></tr>';
    return;
  }

  auditBody.innerHTML = items.map((item, index) => {
    const status = auditValue(item, "status");
    const id = Number(item.id);
    const date = auditDate(item);
    const formattedDate = date ? new Date(date).toLocaleDateString("id-ID") : "-";

    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeAudit(auditValue(item, "name", "title", "audit_name"))}</td>
      <td>${escapeAudit(auditValue(item, "type", "audit_type", "category"))}</td>
      <td>${escapeAudit(auditValue(item, "location", "area"))}</td>
      <td>${escapeAudit(auditValue(item, "auditor", "lead_auditor", "auditor_name"))}</td>
      <td>${escapeAudit(formattedDate)}</td>
      <td><span class="badge ${statusClass(status)}">${escapeAudit(auditStatusLabel(status))}</span></td>
      <td><div class="audit-row-progress"><span>${Math.max(0, Math.min(100, Number(item.progress ?? 0)))}%</span><div><b style="width:${Math.max(0, Math.min(100, Number(item.progress ?? 0)))}%"></b></div></div></td>
      <td>${escapeAudit(auditValue(item, "findings", "finding_count", "total_findings"))}</td>
      <td><button type="button" data-delete-audit="${id}" title="Hapus">Hapus</button></td>
    </tr>`;
  }).join("");
}

function updateAuditStats(items) {
  const completed = items.filter(item => normalizeAuditStatus(item.status) === "completed").length;
  const running = items.filter(item => normalizeAuditStatus(item.status) === "in progress").length;
  const planned = items.filter(item => normalizeAuditStatus(item.status) === "planned").length;
  const findings = items.filter(item => String(item.findings || "").trim()).length;

  document.getElementById("audit-stat-total").textContent = items.length;
  document.getElementById("audit-stat-completed").textContent = completed;
  document.getElementById("audit-stat-running").textContent = running;
  document.getElementById("audit-stat-planned").textContent = planned;
  document.getElementById("audit-stat-findings").textContent = findings;
  const completionRate = items.length ? Math.round((completed / items.length) * 100) : 0;
  const gauge = document.getElementById("audit-completion-gauge");
  const arcLength = 251.33;
  const arcOffset = arcLength * (1 - completionRate / 100);
  gauge.innerHTML = `<svg class="audit-gauge-svg" viewBox="0 0 180 105" aria-hidden="true"><path class="audit-gauge-track" d="M 10 92 A 80 80 0 0 1 170 92"></path><path class="audit-gauge-progress" d="M 10 92 A 80 80 0 0 1 170 92" style="stroke-dasharray:${arcLength};stroke-dashoffset:${arcOffset}"></path></svg><span class="audit-gauge-value">${completionRate}%<small>Audit selesai</small></span>`;
  gauge.style.background = "transparent";
  document.getElementById("audit-completion-summary").textContent = `${completed} dari ${items.length} audit selesai`;
}

function renderCharts(items) {
  const statusCounts = new Map();
  const typeGroups = new Map();
  items.forEach(item => {
    const status = normalizeAuditStatus(item.status);
    const type = item.type || "Tanpa jenis";
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    const group = typeGroups.get(type) || { count: 0, progress: 0 }; group.count += 1; group.progress += Math.max(0, Math.min(100, Number(item.progress ?? 0))); typeGroups.set(type, group);
  });

  const statuses = [...statusCounts.entries()].sort((first, second) => second[1] - first[1]);
  let offset = 0;
  const segments = statuses.map(([, count], index) => {
    const start = offset;
    offset += items.length ? (count / items.length) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`;
  });
  document.getElementById("audit-status-chart").style.background = items.length
    ? `conic-gradient(${segments.join(",")})`
    : "#e2e8f0";
  document.getElementById("audit-status-total").innerHTML = `${items.length}<small>Total Audit</small>`;
  document.getElementById("audit-status-legend").innerHTML = statuses.length
    ? statuses.map(([status, count], index) => `<p>
        <span><b class="chart-dot" style="background:${chartColors[index % chartColors.length]}"></b>${escapeAudit(auditStatusLabel(status))}</span>
        <strong>${count} (${Math.round((count / items.length) * 100)}%)</strong>
      </p>`).join("")
    : '<p class="chart-empty">Belum ada data status.</p>';

  const types = [...typeGroups.entries()].sort((first, second) => second[1].count - first[1].count);
  document.getElementById("audit-type-chart").innerHTML = types.length
    ? types.map(([type, group], index) => { const progress = Math.round(group.progress / group.count); return `<div class="audit-type-row">
        <span title="${escapeAudit(type)}">${escapeAudit(type)}</span>
        <div><b style="width:${progress}%"></b></div>
        <strong>${progress}%</strong>
      </div>`; }).join("")
    : '<p class="chart-empty">Belum ada data jenis audit.</p>';
}

function renderUpcoming(items) {
  const now = new Date();
  const upcoming = items.filter(item => {
    const date = new Date(auditDate(item));
    return auditDate(item) && !Number.isNaN(date.getTime()) && date >= now
      && normalizeAuditStatus(item.status) !== "completed";
  }).sort((first, second) => new Date(auditDate(first)) - new Date(auditDate(second))).slice(0, 5);
  document.getElementById("audit-upcoming-list").innerHTML = upcoming.length
    ? upcoming.map(item => `<div class="schedule">
        <i class="fa-regular fa-calendar"></i>
        <p>${escapeAudit(item.name || "Audit")}${item.location ? ` · ${escapeAudit(item.location)}` : ""}<br>
          <small>${escapeAudit(new Date(auditDate(item)).toLocaleString("id-ID"))}</small>
        </p>
      </div>`).join("")
    : '<p class="chart-empty">Tidak ada jadwal audit mendatang.</p>';
}

function renderRecentFindings(items) {
  const findings = items.filter(item => String(item.findings || "").trim())
    .sort((first, second) => new Date(auditDate(second) || second.created_at || 0) - new Date(auditDate(first) || first.created_at || 0))
    .slice(0, 4);
  document.getElementById("audit-recent-findings").innerHTML = findings.length
    ? findings.map(item => `<div class="finding">
        <span class="risk">Temuan</span>
        <p>${escapeAudit(item.findings)}<br><small>${escapeAudit(item.name || "Audit")}</small></p>
        <b class="${statusClass(item.status)}">${escapeAudit(auditStatusLabel(item.status))}</b>
      </div>`).join("")
    : '<p class="chart-empty">Belum ada catatan temuan pada data audit.</p>';
}

function renderRecentActions(items) {
  const recent = [...items].sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0)).slice(0, 4);
  document.getElementById("audit-recent-actions").innerHTML = recent.length
    ? recent.map((item, index) => `<div class="corrective">
        <span>${index + 1}</span>
        <p>${escapeAudit(item.description)}<br><small>${escapeAudit(item.source || item.assignee || "Tindakan korektif")}</small></p>
        <b class="${/selesai|complete|closed/i.test(String(item.status || "")) ? "closed" : "progress"}">${escapeAudit(item.status || "Open")}</b>
      </div>`).join("")
    : '<p class="chart-empty">Belum ada tindakan korektif.</p>';
}

function renderFilters(items) {
  const filters = [
    ["audit-type-filter", "Semua Jenis Audit", [...new Set(items.map(item => item.type).filter(Boolean))]],
    ["audit-status-filter", "Semua Status", [...new Set(items.map(item => normalizeAuditStatus(item.status)))].filter(status => status !== "unknown")],
    ["audit-location-filter", "Semua Lokasi", [...new Set(items.map(item => item.location).filter(Boolean))]]
  ];
  filters.forEach(([id, placeholder, options]) => {
    const select = document.getElementById(id);
    const value = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + options
      .sort((first, second) => first.localeCompare(second, "id"))
      .map(option => `<option value="${escapeAudit(option)}">${escapeAudit(id === "audit-status-filter" ? auditStatusLabel(option) : option)}</option>`).join("");
    select.value = value;
  });
}

function renderAll() {
  updateAuditStats(state.audits);
  renderCharts(state.audits);
  renderUpcoming(state.audits);
  renderRecentFindings(state.audits);
  renderRecentActions(state.actions);
  renderFilters(state.audits);
  renderAuditRows(filteredAudits());
}

async function auditRequest(path = "", options = {}, api = AUDIT_API) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = auditToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${api}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Request gagal (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadAudits() {
  auditBody.innerHTML = '<tr><td colspan="9">Memuat data audit...</td></tr>';

  try {
    const [auditPayload, actionPayload] = await Promise.all([
      auditRequest(),
      auditRequest("", {}, ACTION_API)
    ]);
    state.audits = Array.isArray(auditPayload.data) ? auditPayload.data : [];
    state.actions = Array.isArray(actionPayload.data) ? actionPayload.data : [];
    renderAll();
  } catch (error) {
    const message = error.status === 401
      ? "Silakan login untuk melihat data audit."
      : "Data audit belum dapat dimuat. Periksa koneksi backend.";
    auditBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`;
    document.getElementById("audit-table-info").textContent = message;
    ["audit-stat-total", "audit-stat-completed", "audit-stat-running", "audit-stat-planned", "audit-stat-findings"]
      .forEach(id => { document.getElementById(id).textContent = "—"; });
    document.getElementById("audit-status-total").innerHTML = "—<small>Total Audit</small>";
    document.getElementById("audit-status-legend").innerHTML = `<p class="chart-empty">${escapeAudit(message)}</p>`;
    document.getElementById("audit-type-chart").innerHTML = `<p class="chart-empty">${escapeAudit(message)}</p>`;
    document.getElementById("audit-upcoming-list").innerHTML = `<p class="chart-empty">${escapeAudit(message)}</p>`;
    document.getElementById("audit-recent-findings").innerHTML = `<p class="chart-empty">${escapeAudit(message)}</p>`;
    document.getElementById("audit-recent-actions").innerHTML = `<p class="chart-empty">${escapeAudit(message)}</p>`;
    document.getElementById("audit-completion-gauge").innerHTML = `—<small>${escapeAudit(message)}</small>`;
    document.getElementById("audit-completion-summary").textContent = message;
    document.getElementById("audit-status-chart").style.background = "#e2e8f0";
  }
}

function openAuditModal() {
  auditForm.reset();
  auditForm.elements.progress.value = 0;
  const heading = auditModal.querySelector("h2");
  if (heading) heading.textContent = "Jadwalkan Audit";
  if (auditForm.elements.attachment) {
    auditForm.elements.attachment.required = false;
    const attachmentInfo = auditForm.querySelector(".attachment-copy small");
    if (attachmentInfo) attachmentInfo.textContent = "Belum ada file dipilih · PNG, JPG/JPEG, atau PDF";
  }
  auditError.textContent = "";
  auditModal.hidden = false;
  auditForm.elements.name.focus();
}

function syncAuditProgress() {
  const status = normalizeAuditStatus(auditForm.elements.status.value);
  const progress = auditForm.elements.progress;
  const help = document.getElementById("audit-progress-help");
  if (status === "planned") { progress.value = 0; progress.disabled = false; progress.readOnly = true; progress.min = 0; progress.max = 0; help.textContent = "Direncanakan otomatis 0%"; }
  else if (status === "completed") { progress.value = 100; progress.disabled = false; progress.readOnly = true; progress.min = 100; progress.max = 100; help.textContent = "Selesai otomatis 100%"; }
  else { progress.readOnly = false; progress.disabled = false; progress.min = 1; progress.max = 99; progress.value = Math.min(99, Math.max(1, Number(progress.value) || 1)); help.textContent = "Berjalan dapat diisi antara 1% sampai 99%"; }
}

function closeAuditModal() {
  auditModal.hidden = true;
  auditError.textContent = "";
}

async function saveAudit(event) {
  event.preventDefault();
  auditError.textContent = "";
  const data = Object.fromEntries(new FormData(auditForm).entries());
  const button = auditForm.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await auditRequest("", { method: "POST", body: JSON.stringify(data) });
    closeAuditModal();
    await loadAudits();
  } catch (error) {
    auditError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteAudit(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus audit ini?")) return;

  try {
    await auditRequest(`/${id}`, { method: "DELETE" });
    await loadAudits();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById("add-audit-button").addEventListener("click", openAuditModal);
auditForm.elements.status.addEventListener("change", syncAuditProgress);
auditForm.elements.progress.addEventListener("input", () => { if (normalizeAuditStatus(auditForm.elements.status.value) === "in progress") auditForm.elements.progress.value = Math.min(99, Math.max(1, Number(auditForm.elements.progress.value) || 1)); });
document.getElementById("close-audit-modal").addEventListener("click", closeAuditModal);
document.getElementById("cancel-audit-modal").addEventListener("click", closeAuditModal);
auditForm.addEventListener("submit", saveAudit);
auditSearch.addEventListener("input", event => {
  state.query = event.target.value.trim();
  renderAuditRows(filteredAudits());
});
[
  ["audit-type-filter", "type"],
  ["audit-status-filter", "status"],
  ["audit-location-filter", "location"]
].forEach(([id, key]) => {
  document.getElementById(id).addEventListener("change", event => {
    state[key] = event.target.value;
    renderAuditRows(filteredAudits());
  });
});
document.getElementById("audit-reset").addEventListener("click", () => {
  auditSearch.value = "";
  state.query = "";
  state.type = "";
  state.status = "";
  state.location = "";
  ["audit-type-filter", "audit-status-filter", "audit-location-filter"]
    .forEach(id => { document.getElementById(id).value = ""; });
  renderAuditRows(filteredAudits());
});
auditBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-audit]");
  if (button) deleteAudit(Number(button.dataset.deleteAudit));
});

await loadAudits();
