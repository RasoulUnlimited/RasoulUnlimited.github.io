// js/theme-toggle.js
// Accessible, robust, and framework-agnostic theme toggle

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const THEME_KEY = "theme";
  const DARK = "dark";
  const LIGHT = "light";

  const root = document.documentElement;
  const body = document.body;

  // --- Safe localStorage wrapper ---

  function getSafeStorage() {
    const testKey = "__theme_toggle__";
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return localStorage;
    } catch {
      return null;
    }
  }

  const storage = getSafeStorage();

  // --- System preference ---

  const mediaQuery =
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  function getStoredTheme() {
    if (!storage) return null;
    const value = storage.getItem(THEME_KEY);
    return value === DARK || value === LIGHT ? value : null;
  }

  function getSystemTheme() {
    if (!mediaQuery) return LIGHT;
    return mediaQuery.matches ? DARK : LIGHT;
  }

  function getCurrentTheme() {
    // احترام به چیزی که سرور روی data-theme ست کرده
    const attr = root.getAttribute("data-theme");
    if (attr === DARK || attr === LIGHT) return attr;

    const stored = getStoredTheme();
    if (stored) return stored;

    return getSystemTheme();
  }

  // --- Helpers ---

  function isCheckableInput(el) {
    return (
      el instanceof HTMLInputElement &&
      (el.type === "checkbox" || el.type === "radio")
    );
  }

  const isCheckable = isCheckableInput(toggle);

  function syncToggleState(isDark) {
    if (isCheckable) {
      // برای inputهای checkable
      /** @type {HTMLInputElement} */ (toggle).checked = isDark;

      // برای screen readerها
      toggle.setAttribute("aria-checked", String(isDark));
    } else {
      // برای المنت‌های غیر-input (مثلاً button سفارشی)
      toggle.setAttribute("aria-pressed", String(isDark));
    }
  }

  function persistTheme(theme) {
    if (!storage) return;
    try {
      storage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors (e.g. private mode)
    }
  }

  function dispatchThemeEvent(theme, isDark) {
    try {
      const event = new CustomEvent("themechange", {
        detail: { theme, isDark },
      });
      window.dispatchEvent(event);
    } catch {
      // برای مرورگرهای خیلی قدیمی که CustomEvent ندارند
    }
  }

  function applyTheme(theme, { persist = true } = {}) {
    if (theme !== DARK && theme !== LIGHT) return;

    const isDark = theme === DARK;

    // data-theme برای CSSهای تم‌محور
    root.setAttribute("data-theme", theme);

    // کلاس‌های عمومی تم روی html و body
    root.classList.toggle("dark-mode", isDark);
    root.classList.toggle("light-mode", !isDark);

    if (body) {
      body.classList.toggle("dark-mode", isDark);
      body.classList.toggle("light-mode", !isDark);
    }

    // ساپورت سبک Tailwind: .dark
    root.classList.toggle("dark", isDark);

    // color-scheme برای اسکرول‌بار و کنترل‌های سیستم
    try {
      root.style.colorScheme = isDark ? "dark" : "light";
    } catch {
      // اگر ساپورت نشه، نادیده بگیر
    }

    // همگام‌سازی وضعیت خود سوییچ
    syncToggleState(isDark);

    if (persist) {
      persistTheme(theme);
    }

    // اطلاع دادن به بقیه‌ی اسکریپت‌ها
    dispatchThemeEvent(theme, isDark);
  }

  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === DARK ? LIGHT : DARK;
    applyTheme(next);
  }

  // --- Accessibility defaults ---

  if (!toggle.hasAttribute("role")) {
    toggle.setAttribute("role", isCheckable ? "switch" : "button");
  }

  if (!toggle.hasAttribute("tabindex") && !(toggle instanceof HTMLInputElement)) {
    // برای المنت‌های غیر-focussable مثل <div>
    toggle.setAttribute("tabindex", "0");
  }

  if (
    !toggle.hasAttribute("aria-label") &&
    !toggle.hasAttribute("aria-labelledby")
  ) {
    toggle.setAttribute("aria-label", "Toggle dark mode");
  }

  // برای screen reader ها، اگر checkable باشد
  if (isCheckable && !toggle.hasAttribute("aria-checked")) {
    toggle.setAttribute("aria-checked", "false");
  }

  // --- Init theme ---
  // از تم فعلی (data-theme)، یا ذخیره‌شده، یا سیستم استفاده می‌کنیم
  const initialTheme = getCurrentTheme();
  applyTheme(initialTheme, { persist: false });

  // --- Event listeners ---

  if (isCheckable) {
    const input = /** @type {HTMLInputElement} */ (toggle);

    // Mouse / touch change برای input[type=checkbox]/radio
    input.addEventListener("change", () => {
      const next = input.checked ? DARK : LIGHT;
      applyTheme(next);
    });

    // Keyboard accessibility: Enter (Space خودش به‌صورت native چک‌باکس را هندل می‌کند)
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.checked = !input.checked;
        const next = input.checked ? DARK : LIGHT;
        applyTheme(next);
      }
    });
  } else {
    // برای المنت‌های غیر-checkbox (مثلاً دکمه سفارشی)
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      toggleTheme();
    });

    // Keyboard accessibility: Enter & Space برای دکمه سفارشی
    toggle.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "Spacebar"
      ) {
        event.preventDefault();
        toggleTheme();
      }
    });
  }

  // --- واکنش به تغییر تم سیستم، فقط وقتی کاربر چیزی تو localStorage نذاشته ---

  function handleSystemChange(event) {
    const hasUserPreference = !!getStoredTheme();
    if (hasUserPreference) return;

    const isDark = event.matches;
    applyTheme(isDark ? DARK : LIGHT, { persist: false });
  }

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemChange);
    } else if (typeof mediaQuery.addListener === "function") {
      // برای مرورگرهای قدیمی‌تر
      mediaQuery.addListener(handleSystemChange);
    }
  }

  // --- همگام‌سازی بین تب‌ها از طریق localStorage ---

  if (storage && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== THEME_KEY) return;

      const value = event.newValue;
      if (value === DARK || value === LIGHT) {
        // اینجا persist:false چون خود storage event یعنی از یه تب دیگه ذخیره شده
        applyTheme(value, { persist: false });
      }
    });
  }
});
