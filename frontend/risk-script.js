const RISK_API = "http://localhost:5000/api/risiko";
const riskBody = document.getElementById("risk-table-body");
const riskSearch = document.getElementById("risk-search");
const riskModal = document.getElementById("risk-modal");
const riskForm = document.getElementById("risk-form");
const riskError = document.getElementById("risk-form-error");
let risks = [];
const riskFilters = { category: "", location: "", status: "", owner: "", dateFrom: "", dateTo: "" };
const riskDateFrom = document.getElementById("risk-date-from");
const riskDateTo = document.getElementById("risk-date-to");

function riskToken() { return localStorage.getItem("token") || localStorage.getItem("authToken"); }
function escapeRisk(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function riskValue(item, ...keys) { return keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== "") || "-"; }
function riskLevel(score) { if (score >= 15) return "Ekstrem"; if (score >= 8) return "Tinggi"; if (score >= 4) return "Sedang"; return "Rendah"; }
function riskClass(level) { return String(level).toLowerCase().replace(" ", "-"); }
function riskScore(item) { return (Number(riskValue(item, "likelihood", "probability")) || 0) * (Number(riskValue(item, "impact", "severity")) || 0); }
function itemLevel(item) { return riskValue(item, "risk_level", "level") === "-" ? riskLevel(riskScore(item)) : riskValue(item, "risk_level", "level"); }

function renderRisks(items) {
  if (!items.length) { riskBody.innerHTML = '<tr><td colspan="11">Tidak ada data risiko.</td></tr>'; return; }
  riskBody.innerHTML = items.map((item, index) => {
    const likelihood = Number(riskValue(item, "likelihood", "probability")) || 0;
    const impact = Number(riskValue(item, "impact", "severity")) || 0;
    const id = Number(item.id);
    return `<tr><td>${index + 1}</td><td>${escapeRisk(riskValue(item, "risk_code", "code", "id"))}</td><td>${escapeRisk(riskValue(item, "description", "title", "name"))}</td><td>${escapeRisk(riskValue(item, "category"))}</td><td>${escapeRisk(riskValue(item, "location", "area"))}</td><td>${likelihood}</td><td>${impact}</td><td><span class="badge ${riskClass(itemLevel(item))}-b">${escapeRisk(itemLevel(item))}</span></td><td><span class="status aktif">${escapeRisk(riskValue(item, "status"))}</span></td><td>${escapeRisk(riskValue(item, "owner", "risk_owner", "responsible_person"))}</td><td><button type="button" data-delete-risk="${id}" title="Hapus">Hapus</button></td></tr>`;
  }).join("");
}

function updateRiskStats(items) {
  const counts = items.reduce((result, item) => { const key = itemLevel(item).toLowerCase(); if (key.includes("ekstrem")) result.extreme += 1; else if (key.includes("tinggi")) result.high += 1; else if (key.includes("sedang")) result.medium += 1; else result.low += 1; return result; }, { extreme: 0, high: 0, medium: 0, low: 0 });
  document.getElementById("risk-stat-total").textContent = items.length;
  document.getElementById("risk-stat-extreme").textContent = counts.extreme;
  document.getElementById("risk-stat-high").textContent = counts.high;
  document.getElementById("risk-stat-medium").textContent = counts.medium;
  document.getElementById("risk-stat-low").textContent = counts.low;
  const total = document.querySelector(".total-box h2"); if (total) total.textContent = items.length;
}

async function riskRequest(path = "", options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = riskToken(); if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${RISK_API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request gagal (${response.status})`);
  return payload;
}
function filteredRisks() {
  const search = riskSearch.value.trim().toLowerCase();
  return risks.filter(item => {
    const rawDate = riskValue(item, "risk_date", "assessment_date", "identified_at", "date", "created_at");
    const itemDate = rawDate === "-" ? "" : String(rawDate).slice(0, 10);
    const text = [item.risk_code, item.code, item.description, item.title, item.name, item.category, item.location, item.area, item.status, item.owner, item.risk_owner, item.responsible_person].join(" ").toLowerCase();
    return (!search || text.includes(search))
      && (!riskFilters.category || riskValue(item, "category") === riskFilters.category)
      && (!riskFilters.location || riskValue(item, "location", "area") === riskFilters.location)
      && (!riskFilters.status || riskValue(item, "status") === riskFilters.status)
      && (!riskFilters.owner || riskValue(item, "owner", "risk_owner", "responsible_person") === riskFilters.owner)
      && (!riskFilters.dateFrom || (itemDate && itemDate >= riskFilters.dateFrom))
      && (!riskFilters.dateTo || (itemDate && itemDate <= riskFilters.dateTo));
  });
}
function refreshRiskTable() { const filtered = filteredRisks(); updateRiskStats(filtered); renderRisks(filtered); }
function riskOptions(items, ...keys) {
  return [...new Set(items.map(item => riskValue(item, ...keys)).filter(value => value !== "-"))].sort((a, b) => String(a).localeCompare(String(b), "id"));
}
function wireRiskFilters() {
  const controls = [...document.querySelectorAll(".filter > button")];
  const definitions = [["category", "Semua Kategori", ["category"]], ["location", "Semua Lokasi", ["location", "area"]], ["status", "Semua Status", ["status"]], ["owner", "Semua Pemilik Risiko", ["owner", "risk_owner", "responsible_person"]]];
  definitions.forEach(([key, label, fields], index) => {
    const button = controls[index]; if (!button) return;
    const select = document.createElement("select"); select.className = "risk-filter-select"; select.setAttribute("aria-label", label);
    select.innerHTML = `<option value="">${label}</option>` + riskOptions(risks, ...fields).map(value => `<option value="${escapeRisk(value)}">${escapeRisk(value)}</option>`).join("");
    select.addEventListener("change", event => { riskFilters[key] = event.target.value; refreshRiskTable(); });
    button.replaceWith(select);
  });
  const reset = controls[4];
  if (reset && !reset.dataset.ready) { reset.dataset.ready = "1"; reset.addEventListener("click", () => { Object.keys(riskFilters).forEach(key => { riskFilters[key] = ""; }); riskSearch.value = ""; riskDateFrom.value = ""; riskDateTo.value = ""; document.querySelectorAll(".risk-filter-select").forEach(select => { select.value = ""; }); refreshRiskTable(); }); }
}
async function loadRisks() { riskBody.innerHTML = '<tr><td colspan="11">Memuat data risiko...</td></tr>'; try { const payload = await riskRequest(""); risks = payload.data || []; wireRiskFilters(); refreshRiskTable(); } catch (error) { riskBody.innerHTML = `<tr><td colspan="11">${escapeRisk(error.message)}</td></tr>`; } }
function openRiskModal() { riskForm.reset(); riskError.textContent = ""; riskModal.hidden = false; riskForm.elements.description.focus(); }
function closeRiskModal() { riskModal.hidden = true; riskError.textContent = ""; }
async function saveRisk(event) { event.preventDefault(); riskError.textContent = ""; const data = Object.fromEntries(new FormData(riskForm).entries()); data.likelihood = Number(data.likelihood); data.impact = Number(data.impact); data.risk_score = data.likelihood * data.impact; data.risk_level = riskLevel(data.risk_score); const button = riskForm.querySelector("button[type='submit']"); button.disabled = true; try { await riskRequest("", { method: "POST", body: JSON.stringify(data) }); closeRiskModal(); await loadRisks(); } catch (error) { riskError.textContent = error.message; } finally { button.disabled = false; } }
async function deleteRisk(id) { if (!Number.isFinite(id) || !window.confirm("Hapus risiko ini?")) return; try { await riskRequest(`/${id}`, { method: "DELETE" }); await loadRisks(); } catch (error) { window.alert(error.message); } }

document.getElementById("add-risk-button").addEventListener("click", openRiskModal);
document.getElementById("close-risk-modal").addEventListener("click", closeRiskModal);
document.getElementById("cancel-risk-modal").addEventListener("click", closeRiskModal);
riskForm.addEventListener("submit", saveRisk);
riskSearch.addEventListener("input", refreshRiskTable);
riskDateFrom.addEventListener("change", event => { riskFilters.dateFrom = event.target.value; refreshRiskTable(); });
riskDateTo.addEventListener("change", event => { riskFilters.dateTo = event.target.value; refreshRiskTable(); });
riskBody.addEventListener("click", event => { const button = event.target.closest("[data-delete-risk]"); if (button) deleteRisk(Number(button.dataset.deleteRisk)); });
loadRisks();
