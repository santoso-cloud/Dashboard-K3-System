const DASHBOARD_AUTH_API = "http://localhost:5000/api/auth/login";

function createLoginPopup() {
  if (document.getElementById("loginPopup")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="login-popup" id="loginPopup" hidden>
      <div class="login-popup-head">
        <div>
          <h2>Login Sistem</h2>
          <p>Masuk dengan akun Anda</p>
        </div>
        <button class="login-popup-close" id="loginPopupClose" type="button" aria-label="Tutup login">&times;</button>
      </div>
      <form id="dashboardLoginForm">
        <label for="dashboardUsername">Username</label>
        <input id="dashboardUsername" name="username" type="text" autocomplete="username" required>
        <label for="dashboardPassword">Password</label>
        <input id="dashboardPassword" name="password" type="password" autocomplete="current-password" required>
        <p class="login-popup-message" id="dashboardLoginMessage" role="alert"></p>
        <button class="login-popup-submit" id="dashboardLoginButton" type="submit">
          <i class="fa-solid fa-right-to-bracket"></i> Masuk
        </button>
      </form>
    </div>
  `);
}

function getPopupElements() {
  return {
    profileButtons: document.querySelectorAll(".profile"),
    profileName: document.getElementById("profileName"),
    loginPopup: document.getElementById("loginPopup"),
    loginPopupClose: document.getElementById("loginPopupClose"),
    loginForm: document.getElementById("dashboardLoginForm"),
    loginMessage: document.getElementById("dashboardLoginMessage"),
    loginButton: document.getElementById("dashboardLoginButton")
  };
}

function closeLoginPopup(elements) {
  elements.loginPopup.hidden = true;
  elements.profileButtons.forEach((profile) => profile.setAttribute("aria-expanded", "false"));
}

function openLoginPopup(elements) {
  elements.loginPopup.hidden = false;
  elements.profileButtons.forEach((profile) => profile.setAttribute("aria-expanded", "true"));
  document.getElementById("dashboardUsername").focus();
}

function showProfileName(elements) {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return;

    elements.profileButtons.forEach((profile) => {
      const name = profile.querySelector("b");
      if (name) name.textContent = user.name || user.username || "Admin K3";
    });

    if (elements.profileName) {
      elements.profileName.textContent = user.name || user.username || "Admin K3";
    }
  } catch {
    localStorage.removeItem("user");
  }
}

function initializeDashboardLogin() {
  const profiles = document.querySelectorAll(".profile");
  if (!profiles.length) return;

  createLoginPopup();
  const elements = getPopupElements();

  elements.profileButtons.forEach((profile) => {
    profile.setAttribute("role", "button");
    profile.setAttribute("tabindex", "0");
    profile.setAttribute("aria-expanded", "false");
    profile.addEventListener("click", () => {
      if (elements.loginPopup.hidden) openLoginPopup(elements);
      else closeLoginPopup(elements);
    });
    profile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        profile.click();
      }
    });
  });

  elements.loginPopupClose.addEventListener("click", () => closeLoginPopup(elements));

  document.addEventListener("click", (event) => {
    const clickedProfile = [...elements.profileButtons].some((profile) => profile.contains(event.target));
    if (!elements.loginPopup.hidden && !elements.loginPopup.contains(event.target) && !clickedProfile) {
      closeLoginPopup(elements);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.loginPopup.hidden) closeLoginPopup(elements);
  });

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.loginMessage.textContent = "";
    elements.loginButton.disabled = true;
    elements.loginButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

    const formData = new FormData(elements.loginForm);
    const username = formData.get("username").trim();
    const password = formData.get("password");

    try {
      const response = await fetch(DASHBOARD_AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.message || "Username atau password salah");

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      showProfileName(elements);
      elements.loginForm.reset();
      closeLoginPopup(elements);
      window.location.href = "apd.html";
    } catch (error) {
      elements.loginMessage.textContent = error.message || "Tidak dapat terhubung ke server.";
    } finally {
      elements.loginButton.disabled = false;
      elements.loginButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
    }
  });

  showProfileName(elements);
}

initializeDashboardLogin();
