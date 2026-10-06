const SIDEBAR_DASHBOARD_API = "http://localhost:5000/api/dashboard";

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
    const response = await fetch(SIDEBAR_DASHBOARD_API, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Sidebar notification request failed");

    const payload = await response.json();
    const data = payload.data || {};
    const openIncidents = Number(data.incidents?.open || 0);
    const openActions = Number(data.corrective_actions?.total || 0);

    setSidebarBadge('.nav-menu a[href$="insiden.html"] small', openIncidents, "insiden terbuka");
    setSidebarBadge('.nav-menu a[href$="tindakan-korektif.html"] small, .nav-menu a[href$="tindakan.html"] small', openActions, "tindakan korektif terbuka");
  } catch {
    setSidebarBadge('.nav-menu a[href$="insiden.html"] small', 0, "insiden terbuka");
    setSidebarBadge('.nav-menu a[href$="tindakan-korektif.html"] small, .nav-menu a[href$="tindakan.html"] small', 0, "tindakan korektif terbuka");
  }
}

updateSidebarNotifications();
setInterval(updateSidebarNotifications, 120000);
