// js/theme-toggle.js
// Shared, accessible, and robust theme toggle script

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const THEME_KEY = "theme";
  const DARK = "dark";
  const LIGHT = "light";

  // Safe localStorage wrapper
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
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function getStoredTheme() {
    if (!storage) return null;
    const value = storage.getItem(THEME_KEY);
    return value === DARK || value === LIGHT ? value : null;
  }

  function getSystemTheme() {
    return mediaQuery.matches ? DARK : LIGHT;
  }

  function getCurrentTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === DARK || attr === LIGHT) return attr;
    const stored = getStoredTheme();
    if (stored) return stored;
    return getSystemTheme();
  }

  function applyTheme(theme, { persist = true } = {}) {
    const isDark = theme === DARK;

    // data-theme برای CSSهای تم‌محور
    document.documentElement.setAttribute("data-theme", theme);

    // کلاس‌های عمومی تم روی html و body
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.toggle("light-mode", !isDark);
    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);

    // ساپورت سبک Tailwind: .dark
    document.documentElement.classList.toggle("dark", isDark);

    // همگام‌سازی وضعیت خود سوییچ
    if ("checked" in toggle) {
      toggle.checked = isDark;
    } else {
      toggle.setAttribute("aria-pressed", String(isDark));
    }

    if (persist && storage) {
      try {
        storage.setItem(THEME_KEY, theme);
      } catch {
        // ignore storage errors (e.g. private mode)
      }
    }
  }

  // Accessibility defaults (درصورتی که از HTML ست نشده باشن)
  if (!toggle.hasAttribute("role")) {
    // اگر input[type=checkbox] است، نقش switch براش منطقی‌تره
    const isCheckbox =
      toggle.tagName === "INPUT" &&
      (toggle.type === "checkbox" || toggle.type === "radio");
    toggle.setAttribute("role", isCheckbox ? "switch" : "button");
  }

  if (!toggle.hasAttribute("aria-label") && !toggle.hasAttribute("aria-labelledby")) {
    toggle.setAttribute("aria-label", "Toggle dark mode");
  }

  // Init theme (بدون persist، فقط sync اولیه)
  const initialTheme = getStoredTheme() ?? getSystemTheme();
  applyTheme(initialTheme, { persist: false });

  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === DARK ? LIGHT : DARK;
    applyTheme(next);
  }

  // Mouse / touch change برای checkboxها
  toggle.addEventListener("change", () => {
    if ("checked" in toggle) {
      const next = toggle.checked ? DARK : LIGHT;
      applyTheme(next);
    } else {
      toggleTheme();
    }
  });

  // برای المنت‌هایی که checkbox نیستند (مثلاً دکمه سفارشی)
  toggle.addEventListener("click", (event) => {
    if (!("checked" in toggle)) {
      event.preventDefault();
      toggleTheme();
    }
  });

  // Keyboard accessibility: Enter & Space
  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if ("checked" in toggle) {
        toggle.checked = !toggle.checked;
      }
      toggleTheme();
    }
  });

  // واکنش به تغییر تم سیستم، فقط وقتی کاربر چیزی تو localStorage نذاشته
  const handleSystemChange = (event) => {
    const hasUserPreference = !!getStoredTheme();
    if (hasUserPreference) return;
    applyTheme(event.matches ? DARK : LIGHT, { persist: false });
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleSystemChange);
  } else if (typeof mediaQuery.addListener === "function") {
    // برای مرورگرهای قدیمی‌تر
    mediaQuery.addListener(handleSystemChange);
  }
});
