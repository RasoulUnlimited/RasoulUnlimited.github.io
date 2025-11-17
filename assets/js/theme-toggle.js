// js/theme-toggle.js
// Shared theme toggle script

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  function getSafeStorage() {
    const testKey = "__theme_toggle__";
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return localStorage;
    } catch (err) {
      return null;
    }
  }

  const storage = getSafeStorage();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedTheme = storage?.getItem("theme");

  function getInitialTheme() {
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return prefersDark.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);
    toggle.checked = isDark;
    document.documentElement.setAttribute("data-theme", theme);
  }

  // Initialize
  applyTheme(getInitialTheme());

  toggle.addEventListener("change", () => {
    const newTheme = toggle.checked ? "dark" : "light";
    applyTheme(newTheme);
    try {
      storage?.setItem("theme", newTheme);
    } catch (err) {
      // ignore storage failures (e.g., private mode)
    }
  });

  // Optional: react to OS theme changes if user نذاشته تو localStorage
  prefersDark.addEventListener("change", (event) => {
    const hasUserPreference = !!storage?.getItem("theme");
    if (hasUserPreference) return;
    applyTheme(event.matches ? "dark" : "light");
  });

  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle.checked = !toggle.checked;
      const newTheme = toggle.checked ? "dark" : "light";
      applyTheme(newTheme);
      try {
        storage?.setItem("theme", newTheme);
      } catch (err) {
        // ignore storage failures (e.g., private mode)
      }
    }
  });
});
