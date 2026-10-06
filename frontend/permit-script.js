const PERMIT_API = "http://localhost:5000/api/izin";
const permitBody = document.getElementById("permit-table-body");
const permitSearch = document.getElementById("permit-search");
const permitModal = document.getElementById("permit-modal");
const permitForm = document.getElementById("permit-form");
const permitError = document.getElementById("permit-form-error");
let permits = [];

function permitToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapePermit(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function permitValue(item, ...keys) {
  return keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== "") || "-";
}

function permitStatusClass(status) {
  const value = String(status).toLowerCase();
  if (value.includes("selesai")) return "selesai";
  if (value.includes("tolak") || value.includes("batal")) return "ditolak";
  if (value.includes("tunggu")) return "menunggu";
  return "aktif";
}

function formatPermitDate(value) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("id-ID");
}

function renderPermits(items) {
  if (!items.length) {
    permitBody.innerHTML = '<tr><td colspan="9">Tidak ada data izin kerja.</td></tr>';
    return;
  }

  permitBody.innerHTML = items.map((item, index) => {
    const status = permitValue(item, "status");
    const id = Number(item.id);
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapePermit(permitValue(item, "permit_number", "code", "permit_code", "id"))}</td>
      <td>${escapePermit(permitValue(item, "work_type", "type", "job_type"))}</td>
      <td>${escapePermit(permitValue(item, "location", "area"))}</td>
      <td>${escapePermit(permitValue(item, "applicant", "requested_by", "requester"))}</td>
      <td>${escapePermit(formatPermitDate(permitValue(item, "start_date", "starts_at")))}</td>
      <td>${escapePermit(formatPermitDate(permitValue(item, "end_date", "ends_at")))}</td>
      <td><span class="status ${permitStatusClass(status)}">${escapePermit(status)}</span></td>
      <td><button type="button" data-delete-permit="${id}" title="Hapus">Hapus</button></td>
    </tr>`;
  }).join("");
}

function updatePermitStats(items) {
  const status = item => String(item.status || "").toLowerCase();
  const active = items.filter(item => status(item).includes("aktif")).length;
  const pending = items.filter(item => status(item).includes("tunggu")).length;
  const completed = items.filter(item => status(item).includes("selesai")).length;
  const rejected = items.filter(item => status(item).includes("tolak")).length;
  const cancelled = items.filter(item => status(item).includes("batal")).length;

  document.getElementById("permit-stat-total").textContent = items.length;
  document.getElementById("permit-stat-active").textContent = active;
  document.getElementById("permit-stat-pending").textContent = pending;
  document.getElementById("permit-stat-completed").textContent = completed;
  document.getElementById("permit-stat-rejected").textContent = rejected;
  document.getElementById("permit-summary-total").firstChild.nodeValue = `${items.length}`;
  document.getElementById("permit-summary-active").textContent = active;
  document.getElementById("permit-summary-pending").textContent = pending;
  document.getElementById("permit-summary-completed").textContent = completed;
  document.getElementById("permit-summary-rejected").textContent = rejected;
  document.getElementById("permit-summary-cancelled").textContent = cancelled;

  const typeCounts = items.reduce((counts, item) => {
    const type = permitValue(item, "work_type", "type", "job_type");
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const types = Object.entries(typeCounts).sort((first, second) => second[1] - first[1]).slice(0, 5);
  const maxTypeCount = types[0]?.[1] || 1;
  document.getElementById("permit-type-summary").innerHTML = types.length
    ? types.map(([type, count]) => `<div class="bar-row"><span>${escapePermit(type)}</span><div><b style="width:${Math.round((count / maxTypeCount) * 100)}%"></b></div><strong>${count}</strong></div>`).join("")
    : "<p>Belum ada data jenis pekerjaan.</p>";
}

async function permitRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = permitToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${PERMIT_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request gagal (${response.status})`);
  return payload;
}

async function loadPermits(search = "") {
  permitBody.innerHTML = '<tr><td colspan="9">Memuat data izin kerja...</td></tr>';
  try {
    const payload = await permitRequest(search ? `?search=${encodeURIComponent(search)}` : "");
    permits = payload.data || [];
    updatePermitStats(permits);
    renderPermits(permits);
  } catch (error) {
    permitBody.innerHTML = `<tr><td colspan="9">${escapePermit(error.message)}</td></tr>`;
  }
}

function openPermitModal() {
  permitForm.reset();
  permitError.textContent = "";
  permitModal.hidden = false;
  permitForm.elements.work_type.focus();
}

function closePermitModal() {
  permitModal.hidden = true;
  permitError.textContent = "";
}

async function savePermit(event) {
  event.preventDefault();
  permitError.textContent = "";
  const data = Object.fromEntries(new FormData(permitForm).entries());
  const button = permitForm.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await permitRequest("", { method: "POST", body: JSON.stringify(data) });
    closePermitModal();
    await loadPermits(permitSearch.value.trim());
  } catch (error) {
    permitError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deletePermit(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus izin kerja ini?")) return;
  try {
    await permitRequest(`/${id}`, { method: "DELETE" });
    await loadPermits(permitSearch.value.trim());
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById("add-permit-button").addEventListener("click", openPermitModal);
document.getElementById("close-permit-modal").addEventListener("click", closePermitModal);
document.getElementById("cancel-permit-modal").addEventListener("click", closePermitModal);
permitForm.addEventListener("submit", savePermit);
permitSearch.addEventListener("input", event => loadPermits(event.target.value.trim()));
permitBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-permit]");
  if (button) deletePermit(Number(button.dataset.deletePermit));
});

loadPermits();
