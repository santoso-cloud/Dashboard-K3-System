const DASHBOARD_API = "http://localhost:5000/api/dashboard";

function dashboardToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function setDashboardValue(id, value) {
  const element = document.getElementById(id);
  if (!element) return;

  const formatted = Number(value || 0).toLocaleString("id-ID");

  if (element.firstChild?.nodeType === Node.TEXT_NODE) {
    element.firstChild.nodeValue = `${formatted} `;
  } else {
    element.textContent = formatted;
  }
}

function renderIncidentChart(incidents) {
  const chart = document.getElementById("incident-status-chart");
  if (!chart) return;

  const open = Number(incidents.open || 0);
  const closed = Number(incidents.closed || 0);
  const max = Math.max(open, closed, 1);
  const openHeight = Math.round((open / max) * 100);
  const closedHeight = Math.round((closed / max) * 100);

  chart.innerHTML = `
    <div style="height:${openHeight}%" title="Terbuka: ${open}"></div>
    <div style="height:${closedHeight}%" title="Selesai: ${closed}"></div>
  `;
}

async function loadDashboard() {
  const status = document.getElementById("dashboard-load-status");
  const token = dashboardToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(DASHBOARD_API, { headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(payload.message || `Request gagal (${response.status})`);

    const data = payload.data || {};
    const incidents = data.incidents || {};
    const audits = data.audits || {};
    const corrective = data.corrective_actions || {};
    const risks = data.risks || {};

    setDashboardValue("dashboard-incidents-total", incidents.total);
    setDashboardValue("dashboard-incidents-open", incidents.open);
    setDashboardValue("dashboard-incidents-closed", incidents.closed);
    setDashboardValue("dashboard-risks-total", risks.total);
    setDashboardValue("incident-total", incidents.total);
    setDashboardValue("incident-open", incidents.open);
    setDashboardValue("incident-closed", incidents.closed);
    setDashboardValue("audit-total", audits.total);
    setDashboardValue("audit-completed", audits.completed);
    setDashboardValue("audit-completed-label", audits.completed);
    setDashboardValue("corrective-total", corrective.total);
    setDashboardValue("activity-open", incidents.open);
    setDashboardValue("activity-audit", audits.completed);
    setDashboardValue("activity-corrective", corrective.total);
    setDashboardValue("risk-total-table", risks.total);
    setDashboardValue("corrective-table", corrective.total);
    renderIncidentChart(incidents);

    if (status) status.textContent = "Terakhir diperbarui sekarang";
  } catch (error) {
    if (status) status.textContent = error.message;
  }
}

loadDashboard();
