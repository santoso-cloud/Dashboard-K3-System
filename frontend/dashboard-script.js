const DASHBOARD_API = "http://localhost:5000/api";
const modules = [
  ["Insiden", "/insiden", "kpi-incidents", "fa-helmet-safety"],
  ["Observasi & Inspeksi", "/observasi", "kpi-observations", "fa-clipboard-check"],
  ["Izin Kerja", "/izin", "kpi-permits", "fa-calendar-check"],
  ["Training K3", "/training", "kpi-training", "fa-graduation-cap"],
  ["APD & Peralatan", "/apd", "kpi-apd", "fa-toolbox"],
  ["Dokumen", "/dokumen", "kpi-documents", "fa-file-lines"],
  ["Audit", "/audit", "kpi-audits", "fa-clipboard-list"],
  ["Manajemen Risiko", "/risiko", "kpi-risks", "fa-triangle-exclamation"]
];
const token = () => localStorage.getItem("token") || localStorage.getItem("authToken");
const num = (value) => Number(value || 0).toLocaleString("id-ID");
const rows = (payload) => Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
const countStatus = (items, values) => items.filter((item) => values.includes(String(item.status || "").toLowerCase())).length;

async function get(path) {
  const response = await fetch(`${DASHBOARD_API}${path}`, { headers: token() ? { Authorization: `Bearer ${token()}` } : {} });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
    throw new Error("Sesi login sudah berakhir");
  }
  if (!response.ok) throw new Error(payload.message || `Gagal memuat ${path}`);
  return payload;
}
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = num(value); }
function renderBars(items) {
  const max = Math.max(...items.map((item) => item.value), 1);
  document.getElementById("dashboard-status-bars").innerHTML = items.map((item) => `<div class="bar-row"><label>${item.label}</label><div class="bar-track ${item.type || ""}"><span style="width:${Math.max(4, Math.round(item.value / max * 100))}%"></span></div><strong>${num(item.value)}</strong></div>`).join("");
}
function renderModules(data) {
  document.getElementById("dashboard-module-list").innerHTML = modules.map(([label, path, id, icon]) => `<div class="module-row"><i class="fa-solid ${icon}"></i><b>${label}</b><span>${document.getElementById(id)?.textContent || num(data[path].length)}</span></div>`).join("");
}
function renderAttention(data) {
  const actionStats = data.actionSummary.stats || {};
  const items = [
    ["Insiden terbuka", countStatus(data["/insiden"], ["open", "terbuka", "progress", "in progress"]), "Periksa dan tindak lanjuti laporan insiden", "fa-triangle-exclamation", ""],
    ["Izin kerja menunggu", countStatus(data["/izin"], ["pending", "menunggu", "open"]), "Pastikan persetujuan sebelum pekerjaan dimulai", "fa-calendar-check", "warning"],
    ["Audit dengan temuan", data["/audit"].filter((item) => Number(item.findings || item.finding_count || 0) > 0).length, "Tinjau temuan dan tetapkan tindakan korektif", "fa-clipboard-list", ""],
    ["Tindakan belum selesai", Number(actionStats.open || 0) + Number(actionStats.progress || 0), "Pantau penyelesaian tindakan korektif", "fa-circle-check", "warning"]
  ];
  document.getElementById("dashboard-attention-list").innerHTML = items.map(([label, value, note, icon, type]) => `<div class="attention-row ${type}"><i class="fa-solid ${icon}"></i><div><p><b>${num(value)}</b> ${label}</p><small>${note}</small></div></div>`).join("");
}

async function loadDashboard() {
  const status = document.getElementById("dashboard-status");
  if (!token()) {
    window.location.href = "login.html";
    return;
  }
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (user) {
    document.getElementById("dashboard-greeting").textContent = `Selamat datang, ${user.name || user.username} 👋`;
    document.querySelector(".profile b").textContent = user.name || user.username || "Admin K3";
  }
  document.getElementById("dashboard-date").textContent = new Date().toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  try {
    const paths = [...modules.map((module) => module[1]), "/tindakan/summary"];
    const results = await Promise.all(paths.map(async (path) => [path, await get(path)]));
    const data = Object.fromEntries(results.map(([path, payload]) => [path, rows(payload)]));
    data.actionSummary = results.find(([path]) => path === "/tindakan/summary")?.[1]?.data || {};
    setText("kpi-incidents", data["/insiden"].length); setText("kpi-observations", data["/observasi"].length); setText("kpi-permits", data["/izin"].length); setText("kpi-training", data["/training"].length); setText("kpi-apd", data["/apd"].reduce((sum, item) => sum + Number(item.quantity || 0), 0) || data["/apd"].length); setText("kpi-documents", data["/dokumen"].length); setText("kpi-audits", data["/audit"].length); setText("kpi-actions", data.actionSummary.stats?.total || 0);
    const openIncidents = countStatus(data["/insiden"], ["open", "terbuka", "progress", "in progress"]); const pendingPermits = countStatus(data["/izin"], ["pending", "menunggu"]); const completedAudits = countStatus(data["/audit"], ["completed", "selesai", "closed"]); const unfinishedActions = Number(data.actionSummary.stats?.open || 0) + Number(data.actionSummary.stats?.progress || 0);
    document.getElementById("kpi-incidents-note").textContent = `${num(openIncidents)} perlu tindak lanjut`; document.getElementById("kpi-permits-note").textContent = `${num(pendingPermits)} menunggu persetujuan`; document.getElementById("kpi-audits-note").textContent = `${num(completedAudits)} sudah selesai`; document.getElementById("kpi-actions-note").textContent = `${num(unfinishedActions)} belum selesai`;
    const auditFindings = data["/audit"].filter((item) => Number(item.findings || item.finding_count || 0) > 0).length;
    renderBars([{ label: "Insiden terbuka", value: openIncidents, type: "danger" }, { label: "Izin menunggu", value: pendingPermits, type: "warning" }, { label: "Audit temuan", value: auditFindings, type: "warning" }, { label: "Tindakan terbuka", value: Number(data.actionSummary.stats?.open || 0), type: "danger" }]); renderModules(data); renderAttention(data);
    status.className = "dashboard-status ok"; status.innerHTML = '<i class="fa-solid fa-circle-check"></i> Data diperbarui sekarang';
  } catch (error) { status.className = "dashboard-status error"; status.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${error.message}`; }
}
loadDashboard();
