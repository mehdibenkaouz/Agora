const THEME_KEY = "agora_theme";

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setFavicon(theme) {
  const favicon = document.getElementById("site-favicon");
  if (!favicon) return;

  const href =
    theme === "dark"
      ? "/icon-dark-64.png?v=1"
      : "/icon-light-64.png?v=1";

  if (favicon.getAttribute("href") !== href) {
    favicon.setAttribute("href", href);
  }
}

function syncThemeUi() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const btnA = document.getElementById("themeToggleBtn");
  if (btnA) btnA.textContent = isDark ? "Light mode" : "Dark mode";

  const btnB = document.getElementById("themeBtn");
  if (btnB) {
    btnB.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  const logo = document.getElementById("mainLogo");

  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    if (logo && logo.dataset.dark) logo.src = logo.dataset.dark;
  } else {
    root.removeAttribute("data-theme");
    if (logo && logo.dataset.light) logo.src = logo.dataset.light;
  }

  localStorage.setItem(THEME_KEY, theme);
  setFavicon(theme);
  syncThemeUi();

  if (typeof window.onAgoraThemeApplied === "function") {
    window.onAgoraThemeApplied(theme);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(isDark ? "light" : "dark");
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getPreferredTheme());

  const btnA = document.getElementById("themeToggleBtn");
  if (btnA) {
    btnA.addEventListener("click", toggleTheme);
  }

  const btnB = document.getElementById("themeBtn");
  if (btnB) {
    btnB.addEventListener("click", toggleTheme);
  }
});