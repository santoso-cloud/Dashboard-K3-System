const SIDEBAR_API = "http://localhost:5000/api";

function setSidebarBadge(selector, value, label) {
  document.querySelectorAll(selector).forEach((badge) => {
    badge.textContent = value > 99 ? "99+" : String(value);
    badge.title = `${value} ${label}`;
    badge.setAttribute("aria-label", `${value} ${label}`);
  });
}

async function updateSidebarNotifications() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (!token) {
    setSidebarBadge('.nav-menu a[href$="insiden.html"] small', 0, "insiden terbuka");
    setSidebarBadge('.nav-menu a[href$="tindakan-korektif.html"] small, .nav-menu a[href$="tindakan.html"] small', 0, "tindakan korektif terbuka");
    return;
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [incidentResponse, actionResponse] = await Promise.all([
      fetch(`${SIDEBAR_API}/insiden`, { headers }),
      fetch(`${SIDEBAR_API}/tindakan/summary`, { headers })
    ]);
    if (!incidentResponse.ok || !actionResponse.ok) throw new Error("Sidebar notification request failed");

    const incidentsPayload = await incidentResponse.json();
    const actionPayload = await actionResponse.json();
    const incidents = Array.isArray(incidentsPayload.data) ? incidentsPayload.data : [];
    const actionStats = actionPayload.data || {};
    const openStatuses = ["open", "opened", "terbuka", "progress", "in progress", "dalam proses"];
    const openIncidents = incidents.filter((item) => openStatuses.includes(String(item.status || "").toLowerCase().trim())).length;
    const openActions = Number(actionStats.open || 0) + Number(actionStats.progress || 0);

    setSidebarBadge('.nav-menu a[href$="insiden.html"] small', openIncidents, "insiden terbuka");
    setSidebarBadge('.nav-menu a[href$="tindakan-korektif.html"] small, .nav-menu a[href$="tindakan.html"] small', openActions, "tindakan korektif terbuka");
  } catch {
    setSidebarBadge('.nav-menu a[href$="insiden.html"] small', 0, "insiden terbuka");
    setSidebarBadge('.nav-menu a[href$="tindakan-korektif.html"] small, .nav-menu a[href$="tindakan.html"] small', 0, "tindakan korektif terbuka");
  }
}

updateSidebarNotifications();
setInterval(updateSidebarNotifications, 120000);
