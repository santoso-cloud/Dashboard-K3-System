const USERS_API = "http://localhost:5000/api/pengguna";

const usersState = {
  rows: [],
  roles: [],
  query: "",
  role: "",
  department: "",
  status: "",
  page: 1,
  pageSize: 10
};
let editingUserId = null;
const roleColors = ["#8b5cf6", "#2563eb", "#059669", "#f59e0b", "#f97316", "#06b6d4"];

function usersToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function userStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "aktif";
  if (normalized === "pending") return "menunggu";
  return "nonaktif";
}

function userStatusLabel(status) {
  const labels = { active: "Aktif", inactive: "Nonaktif", pending: "Menunggu" };
  return labels[String(status || "").toLowerCase()] || "Tidak diketahui";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function percentage(value, total) {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

function renderUserStats(rows) {
  const active = rows.filter((row) => String(row.status).toLowerCase() === "active").length;
  const pending = rows.filter((row) => String(row.status).toLowerCase() === "pending").length;
  const inactive = rows.filter((row) => String(row.status).toLowerCase() === "inactive").length;
  const superAdmin = rows.filter((row) => String(row.role || "").toLowerCase() === "super admin").length;
  const today = new Date();
  const loginsToday = rows.filter((row) => {
    if (!row.last_login) return false;
    const lastLogin = new Date(row.last_login);
    return !Number.isNaN(lastLogin.getTime()) && lastLogin.toDateString() === today.toDateString();
  }).length;
  const recentDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const createdThisMonth = rows.filter((row) => {
    if (!row.created_at) return false;
    const created = new Date(row.created_at);
    return !Number.isNaN(created.getTime()) && created >= recentDate;
  }).length;
  const activeRate = percentage(active, rows.length);

  document.getElementById("users-total").textContent = rows.length;
  document.getElementById("users-active").textContent = active;
  document.getElementById("users-inactive").textContent = inactive;
  document.getElementById("users-pending").textContent = pending;
  document.getElementById("users-super-admin").textContent = superAdmin;
  document.getElementById("users-active-percent").textContent = `${percentage(active, rows.length)} dari total`;
  document.getElementById("users-inactive-percent").textContent = `${percentage(inactive, rows.length)} dari total`;
  document.getElementById("users-pending-percent").textContent = `${percentage(pending, rows.length)} dari total`;
  document.getElementById("users-login-today").textContent = loginsToday;
  document.getElementById("users-never-logged-in").textContent = rows.filter((row) => !row.last_login).length;
  document.getElementById("users-created-month").textContent = createdThisMonth;
  document.getElementById("users-active-rate").textContent = activeRate;
  document.getElementById("users-active-progress").style.width = activeRate;
}

function filteredUsers() {
  const query = usersState.query.toLowerCase();
  return usersState.rows.filter((row) => {
    const matchesQuery = [row.name, row.username, row.email, row.role, row.department]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesQuery
      && (!usersState.role || row.role === usersState.role)
      && (!usersState.department || row.department === usersState.department)
      && (!usersState.status || String(row.status).toLowerCase() === usersState.status);
  });
}

function renderRoleDistribution(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const role = row.role || "Tanpa peran";
    grouped.set(role, (grouped.get(role) || 0) + 1);
  });
  const entries = [...grouped.entries()].sort(([first], [second]) => first.localeCompare(second, "id"));
  const total = rows.length;
  const chart = document.getElementById("users-role-chart");
  const legend = document.getElementById("users-role-legend");
  let offset = 0;
  const segments = entries.map(([, count], index) => {
    const start = offset;
    offset += total ? (count / total) * 100 : 0;
    return `${roleColors[index % roleColors.length]} ${start}% ${offset}%`;
  });

  chart.style.background = total ? `conic-gradient(${segments.join(",")})` : "#e2e8f0";
  document.getElementById("users-role-total").innerHTML = `${total}<small>Total</small>`;
  legend.innerHTML = entries.length ? entries.map(([role, count], index) => `
    <p><span><b class="role-dot" style="background:${roleColors[index % roleColors.length]}"></b> ${escapeHtml(role)}</span>
    <strong>${count} (${percentage(count, total)})</strong></p>
  `).join("") : "<p>Belum ada data peran.</p>";
}

function renderRecentLogins(rows) {
  const recentUsers = rows
    .filter((row) => row.last_login && !Number.isNaN(new Date(row.last_login).getTime()))
    .sort((first, second) => new Date(second.last_login) - new Date(first.last_login))
    .slice(0, 5);
  const container = document.getElementById("users-recent-logins");

  container.innerHTML = recentUsers.length ? recentUsers.map((row) => `
    <div class="activity">
      <i class="fa-solid fa-user green-bg"></i>
      <p><b>${escapeHtml(row.name)}</b><br><small>Login ke sistem</small></p>
      <span>${escapeHtml(formatDate(row.last_login))}</span>
    </div>
  `).join("") : "<p>Belum ada data login.</p>";
}

function renderFilterOptions() {
  const roleFilter = document.getElementById("user-role-filter");
  const departmentFilter = document.getElementById("user-department-filter");
  const selectedRole = usersState.role;
  const selectedDepartment = usersState.department;
  const roles = [...new Set(usersState.roles.map((role) => role.name))].sort((a, b) => a.localeCompare(b, "id"));
  const departments = [...new Set(usersState.rows.map((row) => row.department).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id"));

  roleFilter.innerHTML = '<option value="">Semua Peran</option>' + roles.map((role) =>
    `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("");
  departmentFilter.innerHTML = '<option value="">Semua Departemen</option>' + departments.map((department) =>
    `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`).join("");
  roleFilter.value = selectedRole;
  departmentFilter.value = selectedDepartment;
}

function renderUsers() {
  const body = document.getElementById("users-table-body");
  const info = document.getElementById("users-table-info");
  const rows = filteredUsers();
  const pageCount = Math.max(1, Math.ceil(rows.length / usersState.pageSize));
  usersState.page = Math.min(usersState.page, pageCount);
  const start = (usersState.page - 1) * usersState.pageSize;
  const pageRows = rows.slice(start, start + usersState.pageSize);

  body.innerHTML = pageRows.length ? pageRows.map((row, index) => `
    <tr>
      <td>${start + index + 1}</td>
      <td><div class="user"><span aria-hidden="true">👤</span><div><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.username || "")}</small></div></div></td>
      <td>${escapeHtml(row.email)}</td>
      <td><span class="role">${escapeHtml(row.role || "-" )}</span></td>
      <td>${escapeHtml(row.department || "-")}</td>
      <td><span class="status ${userStatusClass(row.status)}">${escapeHtml(userStatusLabel(row.status))}</span></td>
      <td>${escapeHtml(formatDate(row.last_login))}</td>
      <td class="action"><button type="button" data-user-edit="${row.id}" title="Edit">Edit</button><button type="button" data-user-delete="${row.id}" title="Hapus">Hapus</button></td>
    </tr>
  `).join("") : '<tr><td colspan="8">Data pengguna tidak ditemukan.</td></tr>';

  info.textContent = rows.length
    ? `Menampilkan ${start + 1}-${Math.min(start + usersState.pageSize, rows.length)} dari ${rows.length} pengguna`
    : `Menampilkan 0 dari ${rows.length} pengguna`;
  document.getElementById("users-page-info").textContent = `${usersState.page} / ${pageCount}`;
  document.getElementById("users-page-prev").disabled = usersState.page <= 1;
  document.getElementById("users-page-next").disabled = usersState.page >= pageCount;
  renderUserStats(usersState.rows);
  renderRoleDistribution(usersState.rows);
  renderRecentLogins(usersState.rows);
}

async function loadUsers() {
  const token = usersToken();
  if (!token) {
    usersState.rows = [];
    renderUsers();
    document.getElementById("users-table-info").textContent = "Silakan login untuk melihat data pengguna.";
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const [response, rolesResponse] = await Promise.all([
    fetch(USERS_API, { headers }),
    fetch(`${USERS_API}/roles`, { headers })
  ]);
  const [payload, rolesPayload] = await Promise.all([
    response.json().catch(() => ({})),
    rolesResponse.json().catch(() => ({}))
  ]);

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return;
  }

  if (!response.ok) throw new Error(payload.message || "Gagal mengambil pengguna");
  if (!rolesResponse.ok) throw new Error(rolesPayload.message || "Gagal mengambil daftar peran");
  usersState.rows = Array.isArray(payload.data) ? payload.data : [];
  usersState.roles = Array.isArray(rolesPayload.data) ? rolesPayload.data : [];
  renderFilterOptions();
  renderUsers();
}

function showUserForm(user = null) {
  if (document.getElementById("user-modal")) return;
  editingUserId = user?.id || null;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="user-modal" id="user-modal">
      <form class="user-form" id="user-form">
        <div class="user-form-head"><h2>${editingUserId ? "Edit Pengguna" : "Tambah Pengguna"}</h2><button type="button" id="close-user-modal" aria-label="Tutup">&times;</button></div>
        <label>Nama<input name="name" required maxlength="150" value="${escapeHtml(user?.name)}"></label>
        <label>Username<input name="username" required maxlength="80" value="${escapeHtml(user?.username)}"></label>
        <label>Email<input name="email" type="email" required maxlength="180" value="${escapeHtml(user?.email)}"></label>
        <label>Password<input name="password" type="password" ${editingUserId ? "" : "required"} minlength="8"></label>
        <label>Departemen<input name="department" maxlength="120" value="${escapeHtml(user?.department)}"></label>
        <label>Peran<select name="role_id" required>${usersState.roles.map((role) =>
          `<option value="${role.id}" ${Number(user?.role_id) === Number(role.id) ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select></label>
        <label>Status<select name="status"><option value="active" ${user?.status === "active" || !user ? "selected" : ""}>Aktif</option><option value="inactive" ${user?.status === "inactive" ? "selected" : ""}>Nonaktif</option><option value="pending" ${user?.status === "pending" ? "selected" : ""}>Menunggu</option></select></label>
        <p id="user-form-error" role="alert"></p>
        <div class="user-form-actions"><button type="button" id="cancel-user-modal">Batal</button><button type="submit">Simpan</button></div>
      </form>
    </div>
  `);

  const modal = document.getElementById("user-modal");
  const close = () => modal.remove();
  document.getElementById("close-user-modal").addEventListener("click", close);
  document.getElementById("cancel-user-modal").addEventListener("click", close);
  document.getElementById("user-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = document.getElementById("user-form-error");
    const data = Object.fromEntries(new FormData(form));
    data.role_id = Number(data.role_id);

    try {
      const userPath = editingUserId ? `/${editingUserId}` : "";
      const response = await fetch(USERS_API + userPath, {
        method: editingUserId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${usersToken()}` },
        body: JSON.stringify(data)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Gagal menambah pengguna");
      close();
      editingUserId = null;
      await loadUsers();
    } catch (submitError) {
      error.textContent = submitError.message;
    }
  });
}

document.getElementById("user-search").addEventListener("input", (event) => {
  usersState.query = event.target.value;
  usersState.page = 1;
  renderUsers();
});
document.getElementById("user-role-filter").addEventListener("change", (event) => {
  usersState.role = event.target.value;
  usersState.page = 1;
  renderUsers();
});
document.getElementById("user-department-filter").addEventListener("change", (event) => {
  usersState.department = event.target.value;
  usersState.page = 1;
  renderUsers();
});
document.getElementById("user-status-filter").addEventListener("change", (event) => {
  usersState.status = event.target.value;
  usersState.page = 1;
  renderUsers();
});
document.getElementById("user-reset").addEventListener("click", () => {
  document.getElementById("user-search").value = "";
  document.getElementById("user-role-filter").value = "";
  document.getElementById("user-department-filter").value = "";
  document.getElementById("user-status-filter").value = "";
  usersState.query = "";
  usersState.role = "";
  usersState.department = "";
  usersState.status = "";
  usersState.page = 1;
  renderUsers();
});
document.getElementById("users-page-size").addEventListener("change", (event) => {
  usersState.pageSize = Number(event.target.value) || 10;
  usersState.page = 1;
  renderUsers();
});
document.getElementById("users-page-prev").addEventListener("click", () => {
  usersState.page = Math.max(1, usersState.page - 1);
  renderUsers();
});
document.getElementById("users-page-next").addEventListener("click", () => {
  usersState.page += 1;
  renderUsers();
});
document.getElementById("add-user-button").addEventListener("click", showUserForm);

document.getElementById("users-table-body").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-user-edit]");
  const deleteButton = event.target.closest("[data-user-delete]");

  if (editButton) {
    const user = usersState.rows.find((row) => Number(row.id) === Number(editButton.dataset.userEdit));
    if (user) showUserForm(user);
  }

  if (deleteButton && window.confirm("Hapus pengguna ini?")) {
    try {
      const response = await fetch(`${USERS_API}/${deleteButton.dataset.userDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${usersToken()}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Gagal menghapus pengguna");
      await loadUsers();
    } catch (error) {
      window.alert(error.message);
    }
  }
});

try {
  await loadUsers();
} catch (error) {
  usersState.rows = [];
  renderUsers();
  document.getElementById("users-table-info").textContent = error.message;
}
