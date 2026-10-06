const API_URL = "http://localhost:5000/api/apd";

const tableBody = document.getElementById("apd-table-body");
const searchInput = document.getElementById("apd-search");
const addButton = document.getElementById("add-apd-button");
const modal = document.getElementById("apd-modal");
const form = document.getElementById("apd-form");
const formError = document.getElementById("apd-form-error");
const closeModalButton = document.getElementById("close-apd-modal");
const cancelModalButton = document.getElementById("cancel-apd-modal");

const state = { items: [], query: "", category: "", location: "", status: "", page: 1, pageSize: 10 };
const chartColors = ["#059669", "#f59e0b", "#8b5cf6", "#ef4444", "#2563eb", "#06b6d4", "#f97316"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function statusClass(status) {
  const normalized = statusGroup(status);

  if (normalized === "borrowed") return "dipinjam";
  if (normalized === "maintenance") return "maintenance";
  if (normalized === "damaged") return "rusak";
  return "tersedia";
}

function statusGroup(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("pinjam") || normalized.includes("borrow")) return "borrowed";
  if (normalized.includes("maintenance") || normalized.includes("perawatan")) return "maintenance";
  if (normalized.includes("rusak") || normalized.includes("damaged") || normalized.includes("broken") || normalized.includes("tidak layak")) return "damaged";
  if (normalized.includes("tersedia") || normalized.includes("available") || normalized.includes("ready")) return "available";
  return "other";
}

function statusLabel(status) {
  const labels = { available: "Tersedia", borrowed: "Dipinjam", maintenance: "Maintenance", damaged: "Rusak / Tidak Layak", other: "Status Lainnya" };
  return labels[status] || status;
}

function itemQuantity(item) {
  const quantity = Number(item.quantity ?? item.jumlah ?? 0);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function itemName(item) {
  return item.name || item.item_name || item.nama_item || item.description || "-";
}

function filteredItems() {
  const query = state.query.toLocaleLowerCase("id-ID");
  return state.items.filter(item => {
    const category = item.category || item.kategori || "";
    const location = item.location || item.lokasi || "";
    const status = item.status || "Tersedia";
    return [itemName(item), category, item.code || item.item_code || item.kode_item, location, status]
      .some(value => String(value || "").toLocaleLowerCase("id-ID").includes(query))
      && (!state.category || category === state.category)
      && (!state.location || location === state.location)
      && (!state.status || status === state.status);
  });
}

function renderRows() {
  const items = filteredItems();
  const pageCount = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pageItems = items.slice(start, start + state.pageSize);

  if (!pageItems.length) {
    tableBody.innerHTML = '<tr><td colspan="8">Tidak ada data APD.</td></tr>';
  } else {
    tableBody.innerHTML = pageItems.map((item, index) => {
      const status = item.status || "Tersedia";
      const id = Number(item.id);

      return `
        <tr>
          <td>${start + index + 1}</td>
          <td>${escapeHtml(itemName(item))}</td>
          <td>${escapeHtml(item.category || item.kategori || "-")}</td>
          <td>${escapeHtml(item.code || item.item_code || item.kode_item || "-")}</td>
          <td>${escapeHtml(item.location || item.lokasi || "-")}</td>
          <td><span class="status ${statusClass(status)}">${escapeHtml(status)}</span></td>
          <td>${itemQuantity(item)}</td>
          <td class="action">
            <button type="button" data-action="delete" data-id="${id}" title="Hapus">Hapus</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  document.getElementById("apd-table-info").textContent = items.length
    ? `Menampilkan ${start + 1}-${Math.min(start + state.pageSize, items.length)} dari ${items.length} item`
    : "Menampilkan 0 dari 0 item";
  document.getElementById("apd-page-info").textContent = `${state.page} / ${pageCount}`;
  document.getElementById("apd-page-prev").disabled = state.page <= 1;
  document.getElementById("apd-page-next").disabled = state.page >= pageCount;
}

function updateStats(items) {
  const counts = items.reduce((summary, item) => {
    const status = statusGroup(item.status || "Tersedia");
    const quantity = itemQuantity(item);

    summary.total += quantity;
    if (status === "borrowed") summary.borrowed += quantity;
    else if (status === "maintenance") summary.maintenance += quantity;
    else if (status === "damaged") summary.damaged += quantity;
    else if (status === "available") summary.available += quantity;

    return summary;
  }, { total: 0, available: 0, borrowed: 0, maintenance: 0, damaged: 0 });

  document.getElementById("stat-total").textContent = counts.total;
  document.getElementById("stat-available").textContent = counts.available;
  document.getElementById("stat-borrowed").textContent = counts.borrowed;
  document.getElementById("stat-maintenance").textContent = counts.maintenance;
  document.getElementById("stat-damaged").textContent = counts.damaged;
  document.getElementById("apd-maintenance-attention").textContent = `${counts.maintenance} unit dalam perawatan`;
  document.getElementById("apd-damaged-attention").textContent = `${counts.damaged} unit rusak / tidak layak`;
  document.getElementById("apd-low-stock-attention").textContent = `${items.filter(item => itemQuantity(item) === 0).length} item stok habis`;
}

function renderCharts(items) {
  const statusTotals = new Map();
  const categoryTotals = new Map();
  items.forEach(item => {
    const quantity = itemQuantity(item);
    const status = statusGroup(item.status || "Tersedia");
    const category = item.category || item.kategori || "Tanpa kategori";
    statusTotals.set(status, (statusTotals.get(status) || 0) + quantity);
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + quantity);
  });

  const total = items.reduce((sum, item) => sum + itemQuantity(item), 0);
  const statuses = [...statusTotals.entries()].sort((first, second) => second[1] - first[1]);
  let offset = 0;
  const segments = statuses.map(([status, quantity], index) => {
    const start = offset;
    offset += total ? (quantity / total) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`;
  });
  const statusChart = document.getElementById("apd-status-chart");
  statusChart.style.background = total ? `conic-gradient(${segments.join(",")})` : "#e2e8f0";
  document.getElementById("apd-stock-total").innerHTML = `${total}<small>Total Stok</small>`;
  document.getElementById("apd-status-legend").innerHTML = statuses.length
    ? statuses.map(([status, quantity], index) => `<p>
        <span><b class="chart-dot" style="background:${chartColors[index % chartColors.length]}"></b>${escapeHtml(statusLabel(status))}</span>
        <strong>${quantity} (${total ? Math.round((quantity / total) * 100) : 0}%)</strong>
      </p>`).join("")
    : '<p class="chart-empty">Belum ada data status.</p>';

  const categories = [...categoryTotals.entries()].sort((first, second) => second[1] - first[1]);
  const max = Math.max(...categories.map(([, quantity]) => quantity), 1);
  document.getElementById("apd-category-chart").innerHTML = categories.length
    ? categories.map(([category, quantity], index) => `<div class="bar-row">
        <span title="${escapeHtml(category)}">${escapeHtml(category)}</span>
        <div><b style="width:${Math.round((quantity / max) * 100)}%;background:${chartColors[index % chartColors.length]}"></b></div>
        <strong>${quantity}</strong>
      </div>`).join("")
    : '<p class="chart-empty">Belum ada data kategori.</p>';
}

function renderFilters(items) {
  const filters = [
    ["apd-category-filter", "Semua Kategori", [...new Set(items.map(item => item.category || item.kategori).filter(Boolean))]],
    ["apd-location-filter", "Semua Lokasi", [...new Set(items.map(item => item.location || item.lokasi).filter(Boolean))]],
    ["apd-status-filter", "Semua Status", [...new Set(items.map(item => item.status).filter(Boolean))]]
  ];
  filters.forEach(([id, placeholder, options]) => {
    const select = document.getElementById(id);
    const value = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>` + options
      .sort((first, second) => first.localeCompare(second, "id"))
      .map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
    select.value = value;
  });
}

function renderAll() {
  updateStats(state.items);
  renderCharts(state.items);
  renderFilters(state.items);
  renderRows();
}

async function request(path = "", options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || `Request gagal (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function loadApd() {
  tableBody.innerHTML = '<tr><td colspan="8">Memuat data APD...</td></tr>';

  try {
    const payload = await request();
    state.items = Array.isArray(payload.data) ? payload.data : [];
    renderAll();
  } catch (error) {
    const message = error.status === 401
      ? "Silakan login untuk melihat data APD."
      : "Data APD belum dapat dimuat. Periksa koneksi backend.";
    tableBody.innerHTML = `<tr><td colspan="8">${message}</td></tr>`;
    document.getElementById("apd-table-info").textContent = message;
    ["stat-total", "stat-available", "stat-borrowed", "stat-maintenance", "stat-damaged"]
      .forEach(id => { document.getElementById(id).textContent = "—"; });
    document.getElementById("apd-stock-total").innerHTML = "—<small>Total Stok</small>";
    document.getElementById("apd-status-legend").innerHTML = `<p class="chart-empty">${escapeHtml(message)}</p>`;
    document.getElementById("apd-category-chart").innerHTML = `<p class="chart-empty">${escapeHtml(message)}</p>`;
    document.getElementById("apd-status-chart").style.background = "#e2e8f0";
    document.getElementById("apd-maintenance-attention").textContent = message;
    document.getElementById("apd-damaged-attention").textContent = message;
    document.getElementById("apd-low-stock-attention").textContent = message;
  }
}

function openModal() {
  form.reset();
  formError.textContent = "";
  modal.hidden = false;
  form.elements.name.focus();
}

function closeModal() {
  modal.hidden = true;
  formError.textContent = "";
}

async function submitApd(event) {
  event.preventDefault();
  formError.textContent = "";

  const formData = new FormData(form);
  const quantity = Number(formData.get("quantity"));
  const data = Object.fromEntries(formData.entries());
  data.quantity = quantity;

  if (!Number.isInteger(quantity) || quantity < 0) {
    formError.textContent = "Jumlah harus berupa angka bulat 0 atau lebih.";
    return;
  }

  const saveButton = form.querySelector(".save-button");
  saveButton.disabled = true;

  try {
    await request("", {
      method: "POST",
      body: JSON.stringify(data)
    });
    closeModal();
    await loadApd();
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteApd(id) {
  if (!Number.isFinite(id) || !window.confirm("Hapus data APD ini?")) return;

  try {
    await request(`/${id}`, { method: "DELETE" });
    await loadApd();
  } catch (error) {
    window.alert(error.message);
  }
}

searchInput.addEventListener("input", event => {
  state.query = event.target.value.trim();
  state.page = 1;
  renderRows();
});

[
  ["apd-category-filter", "category"],
  ["apd-location-filter", "location"],
  ["apd-status-filter", "status"]
].forEach(([id, key]) => {
  document.getElementById(id).addEventListener("change", event => {
    state[key] = event.target.value;
    state.page = 1;
    renderRows();
  });
});

document.getElementById("apd-reset").addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  state.category = "";
  state.location = "";
  state.status = "";
  state.page = 1;
  ["apd-category-filter", "apd-location-filter", "apd-status-filter"]
    .forEach(id => { document.getElementById(id).value = ""; });
  renderRows();
});

document.getElementById("apd-page-size").addEventListener("change", event => {
  state.pageSize = Number(event.target.value) || 10;
  state.page = 1;
  renderRows();
});
document.getElementById("apd-page-prev").addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  renderRows();
});
document.getElementById("apd-page-next").addEventListener("click", () => {
  state.page += 1;
  renderRows();
});

addButton.addEventListener("click", openModal);
form.addEventListener("submit", submitApd);
closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);
modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

tableBody.addEventListener("click", event => {
  const button = event.target.closest("[data-action='delete']");
  if (button) deleteApd(Number(button.dataset.id));
});

await loadApd();
