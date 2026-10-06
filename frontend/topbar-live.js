const TOPBAR_API = "http://localhost:5000/api";

function topbarText(element, text) {
  if (!element) return;
  const icon = element.querySelector("i");
  element.textContent = "";
  if (icon) element.append(icon);
  element.append(` ${text}`);
}

function updateLiveDate() {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(now);

  document.querySelectorAll(".top-info, .top-actions, .topbar-right").forEach((container) => {
    const calendar = [...container.children].find((element) => element.querySelector(".fa-calendar:not(.fa-calendar-check)"));
    topbarText(calendar, formatted);
  });
}

async function updateLiveWeather() {
  const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,weather_code&timezone=Asia%2FJakarta";

  try {
    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error("Weather request failed");
    const payload = await response.json();
    const temperature = Math.round(payload.current.temperature_2m);

    document.querySelectorAll(".top-info, .top-actions, .topbar-right").forEach((container) => {
      const weather = [...container.children].find((element) => element.querySelector(".fa-sun"));
      topbarText(weather, `${temperature}°C Jakarta`);
    });
  } catch {
    document.querySelectorAll(".top-info, .top-actions, .topbar-right").forEach((container) => {
      const weather = [...container.children].find((element) => element.querySelector(".fa-sun"));
      if (weather && !weather.textContent.includes("°C")) topbarText(weather, "Jakarta");
    });
  }
}

async function updateNotifications() {
  const badgeSelectors = ".top-info .notif span, .top-info .bell span, .top-actions .notif span, .top-actions .bell span, .topbar-right .notif span, .topbar-right .bell span";
  const badges = document.querySelectorAll(badgeSelectors);
  if (!badges.length) return;

  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (!token) {
    badges.forEach((badge) => { badge.textContent = "0"; });
    return;
  }

  try {
    const response = await fetch(`${TOPBAR_API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Notification request failed");
    const payload = await response.json();
    const data = payload.data || {};
    const incidents = Number(data.incidents?.open || 0);
    const corrective = Number(data.corrective_actions?.total || 0);
    const count = incidents + corrective;
    badges.forEach((badge) => {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.title = `${count} item memerlukan perhatian`;
    });
  } catch {
    badges.forEach((badge) => { badge.textContent = "0"; });
  }
}

function refreshTopbarLive() {
  updateLiveDate();
  updateLiveWeather();
  updateNotifications();
}

refreshTopbarLive();
setInterval(updateLiveDate, 60000);
setInterval(updateLiveWeather, 600000);
setInterval(updateNotifications, 120000);
