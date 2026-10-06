const DOCUMENT_API = "http://localhost:5000/api/dokumen";
const documentBody = document.getElementById("document-table-body");
const documentSearch = document.getElementById("document-search");
const documentModal = document.getElementById("document-modal");
const documentForm = document.getElementById("document-form");
const documentError = document.getElementById("document-form-error");
const state = { documents: [], query: "", category: "", type: "", status: "", page: 1, pageSize: 10 };
const chartColors = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#f97316"];

function documentToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapeDocument(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function documentValue(item, ...keys) {
  return keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== "") || "-";
}

function documentStatusClass(status) {
  const value = String(status).toLowerCase();
  if (value.includes("expired")) return "expired";
  if (value.includes("review")) return "review";
  return "aktif";
}

function documentType(item) {
  return item.file_type || item.type || item.mime_type || "-";
}

function filteredDocuments() {
  const query = state.query.toLocaleLowerCase("id-ID");
  return state.documents.filter(item => [item.name, item.description, item.category, documentType(item), item.version, item.status]
    .some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query))
    && (!state.category || item.category === state.category)
    && (!state.type || documentType(item) === state.type)
    && (!state.status || item.status === state.status));
}

function renderDocuments() {
  const items = filteredDocuments();
  const pageCount = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pageItems = items.slice(start, start + state.pageSize);

  if (!pageItems.length) {
    documentBody.innerHTML = '<tr><td colspan="7">Tidak ada data dokumen.</td></tr>';
  } else {
    documentBody.innerHTML = pageItems.map(item => {
      const status = item.status || "Tidak diketahui";
      const date = item.uploaded_at || item.created_at || item.upload_date;
      const formattedDate = date ? new Date(date).toLocaleDateString("id-ID") : "-";
      const id = Number(item.id);

      return `<tr>
        <td><b>${escapeDocument(item.name || item.title || item.document_name || "-")}</b><br><small>${escapeDocument(item.description || "-")}</small></td>
        <td><span class="tag">${escapeDocument(item.category || "-")}</span></td>
        <td>${escapeDocument(documentType(item))}</td>
        <td>${escapeDocument(item.version || "-")}</td>
        <td><span class="status ${documentStatusClass(status)}">${escapeDocument(status)}</span></td>
        <td>${escapeDocument(formattedDate)}</td>
        <td class="action"><button type="button" data-delete-document="${id}" title="Hapus">Hapus</button></td>
      </tr>`;
    }).join("");
  }

  document.getElementById("document-table-info").textContent = items.length
    ? `Menampilkan ${start + 1}-${Math.min(start + state.pageSize, items.length)} dari ${items.length} dokumen`
    : "Menampilkan 0 dari 0 dokumen";
  document.getElementById("document-page-info").textContent = `${state.page} / ${pageCount}`;
  document.getElementById("document-page-prev").disabled = state.page <= 1;
  document.getElementById("document-page-next").disabled = state.page >= pageCount;
}

function updateDocumentStats(items) {
  const total = items.length;
  const active = items.filter(item => String(item.status || "").toLowerCase() === "active" || String(item.status || "").toLowerCase() === "aktif").length;
  const review = items.filter(item => documentStatusClass(item.status) === "review").length;
  const expired = items.filter(item => documentStatusClass(item.status) === "expired").length;

  document.getElementById("document-stat-total").textContent = total;
  document.getElementById("document-stat-active").textContent = active;
  document.getElementById("document-stat-review").textContent = review;
  document.getElementById("document-stat-expired").textContent = expired;
}

function renderCharts(items) {
  const total = items.length;
  const categoryCounts = new Map();
  const statusCounts = new Map();
  items.forEach(item => {
    const category = item.category || "Tanpa kategori";
    const status = item.status || "Tidak diketahui";
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  const categories = [...categoryCounts.entries()].sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "id"));
  const maxCategoryCount = Math.max(...categories.map(([, count]) => count), 1);
  document.getElementById("document-category-chart").innerHTML = categories.length
    ? categories.map(([category, count], index) => `<div class="document-chart-row">
        <span title="${escapeDocument(category)}"><b class="chart-dot" style="background:${chartColors[index % chartColors.length]}"></b>${escapeDocument(category)}</span>
        <div><b style="width:${Math.round((count / maxCategoryCount) * 100)}%;background:${chartColors[index % chartColors.length]}"></b></div>
        <strong>${count}</strong>
      </div>`).join("")
    : '<p class="chart-empty">Belum ada data kategori.</p>';

  const statuses = [...statusCounts.entries()].sort((first, second) => second[1] - first[1]);
  let offset = 0;
  const segments = statuses.map(([, count], index) => {
    const start = offset;
    offset += total ? (count / total) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`;
  });
  const statusChart = document.getElementById("document-status-chart");
  statusChart.style.background = total ? `conic-gradient(${segments.join(",")})` : "#e2e8f0";
  document.getElementById("document-status-total").innerHTML = `${total}<small>Total</small>`;
  document.getElementById("document-status-legend").innerHTML = statuses.length
    ? statuses.map(([status, count], index) => `<p>
        <span><b class="chart-dot" style="background:${chartColors[index % chartColors.length]}"></b>${escapeDocument(status)}</span>
        <strong>${count} (${total ? Math.round((count / total) * 100) : 0}%)</strong>
      </p>`).join("")
    : '<p class="chart-empty">Belum ada data status.</p>';
}

function renderFilters(items) {
  const filters = [
    ["document-category-filter", "Semua Kategori", [...new Set(items.map(item => item.category).filter(Boolean))]],
    ["document-type-filter", "Semua Tipe", [...new Set(items.map(documentType).filter(value => value !== "-"))]],
    ["document-status-filter", "Semua Status", [...new Set(items.map(item => item.status).filter(Boolean))]]
  ];
  filters.forEach(([id, placeholder, options]) => {
    const select = document.getElementById(id);
    const value = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + options
      .sort((first, second) => first.localeCompare(second, "id"))
      .map(option => `<option value="${escapeDocument(option)}">${escapeDocument(option)}</option>`).join("");
    select.value = value;
  });
}

function renderAll() {
  updateDocumentStats(state.documents);
  renderCharts(state.documents);
  renderFilters(state.documents);
  renderDocuments();
}

async function documentRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = documentToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${DOCUMENT_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Request gagal (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadDocuments() {
  documentBody.innerHTML = '<tr><td colspan="7">Memuat data dokumen...</td></tr>';

  try {
    const payload = await documentRequest();
    state.documents = Array.isArray(payload.data) ? payload.data : [];
    renderAll();
  } catch (error) {
    const message = error.status === 401
      ? "Silakan login untuk melihat data dokumen."
      : "Data dokumen belum dapat dimuat. Periksa koneksi backend.";
    documentBody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
    document.getElementById("document-table-info").textContent = message;
    ["document-stat-total", "document-stat-active", "document-stat-review", "document-stat-expired"]
      .forEach(id => { document.getElementById(id).textContent = "—"; });
    document.getElementById("document-category-chart").innerHTML = `<p class="chart-empty">${escapeDocument(message)}</p>`;
    document.getElementById("document-status-chart").style.background = "#e2e8f0";
    document.getElementById("document-status-total").innerHTML = "—<small>Total</small>";
    document.getElementById("document-status-legend").innerHTML = `<p class="chart-empty">${escapeDocument(message)}</p>`;
  }
}

function openDocumentModal() {
  documentForm.reset();
  documentError.textContent = "";
  documentModal.hidden = false;
  documentForm.elements.name.focus();
}

function closeDocumentModal() {
  documentModal.hidden = true;
  documentError.textContent = "";
}

async function saveDocument(event) {
  event.preventDefault();
  documentError.textContent = "";
  const data = Object.fromEntries(new FormData(documentForm).entries());
  const button = documentForm.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await documentRequest("", { method: "POST", body: JSON.stringify(data) });
    closeDocumentModal();
    await loadDocuments();
  } catch (error) {
    documentError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteDocument(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus dokumen ini?")) return;

  try {
    await documentRequest(`/${id}`, { method: "DELETE" });
    await loadDocuments();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById("add-document-button").addEventListener("click", openDocumentModal);
document.getElementById("close-document-modal").addEventListener("click", closeDocumentModal);
document.getElementById("cancel-document-modal").addEventListener("click", closeDocumentModal);
documentForm.addEventListener("submit", saveDocument);
documentSearch.addEventListener("input", event => {
  state.query = event.target.value.trim();
  state.page = 1;
  renderDocuments();
});

[
  ["document-category-filter", "category"],
  ["document-type-filter", "type"],
  ["document-status-filter", "status"]
].forEach(([id, key]) => {
  document.getElementById(id).addEventListener("change", event => {
    state[key] = event.target.value;
    state.page = 1;
    renderDocuments();
  });
});

document.getElementById("document-reset").addEventListener("click", () => {
  documentSearch.value = "";
  state.query = "";
  state.category = "";
  state.type = "";
  state.status = "";
  state.page = 1;
  ["document-category-filter", "document-type-filter", "document-status-filter"]
    .forEach(id => { document.getElementById(id).value = ""; });
  renderDocuments();
});

document.getElementById("document-page-size").addEventListener("change", event => {
  state.pageSize = Number(event.target.value) || 10;
  state.page = 1;
  renderDocuments();
});
document.getElementById("document-page-prev").addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderDocuments();
});
document.getElementById("document-page-next").addEventListener("click", () => {
  state.page += 1;
  renderDocuments();
});
documentBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-document]");
  if (button) deleteDocument(Number(button.dataset.deleteDocument));
});

await loadDocuments();
