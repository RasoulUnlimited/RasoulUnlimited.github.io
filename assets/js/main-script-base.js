(function () {
  "use strict";

  // Ensure language strings object exists
  if (!window.langStrings) {
    console.warn("No language strings loaded");
    window.langStrings = {};
  }

  /**
   * Safe localStorage accessor with feature / privacy mode detection
   */
  function getSafeStorage() {
    const testKey = "__theme_pref__";
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return localStorage;
    } catch (err) {
      // e.g. Safari private mode or blocked storage
      return null;
    }
  }

  const storage = getSafeStorage();

  // Reuse a single MediaQueryList if available
  const darkMediaQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  const prefersDark = !!(darkMediaQuery && darkMediaQuery.matches);
  const savedTheme = storage?.getItem("theme") || null;

  /**
   * Basic toast helper (string-only API to stay compatible)
   * Other scripts can call window.createToast("message").
   */
  function createToast(message) {
    if (!message) return;

    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className = "dynamic-toast";
    toast.textContent = String(message);

    // Optional: prevent infinite stacking by removing old non-visible toasts
    const existingToasts = document.querySelectorAll(".dynamic-toast");
    if (existingToasts.length > 3) {
      existingToasts.forEach((t, index) => {
        if (index === 0) t.remove();
      });
    }

    document.body.appendChild(toast);

    // Trigger CSS transition
    requestAnimationFrame(() => toast.classList.add("show"));

    // Auto-hide
    setTimeout(() => {
      toast.classList.remove("show");
      // Wait for CSS transition to finish if any
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  }

  // Expose toast helper globally if not already defined
  if (typeof window.createToast !== "function") {
    window.createToast = createToast;
  }

  /**
   * Apply theme and sync toggle + a11y attributes.
   * @param {"dark"|"light"} theme
   * @param {boolean} [showToast=false]
   */
  function applyTheme(theme, showToast) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);

    // Optional: expose theme on <html> for CSS theming
    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.checked = isDark;
      toggle.setAttribute("aria-checked", String(isDark));
    }

    if (showToast && typeof window.langStrings.themeChanged === "function") {
      // themeChanged(theme) → localized message
      const msg = window.langStrings.themeChanged(theme);
      if (msg) createToast(msg);
    }
  }

  // Initial theme: stored preference > system preference
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
  } else {
    applyTheme(prefersDark ? "dark" : "light");

    // React to OS theme changes only if user has not explicitly chosen a theme
    if (darkMediaQuery) {
      const handleThemeSystemChange = function (e) {
        // If user later sets a theme, this check prevents overriding it
        if (!storage?.getItem("theme")) {
          applyTheme(e.matches ? "dark" : "light");
        }
      };

      if (typeof darkMediaQuery.addEventListener === "function") {
        darkMediaQuery.addEventListener("change", handleThemeSystemChange);
      } else if (typeof darkMediaQuery.addListener === "function") {
        // Older browsers
        darkMediaQuery.addListener(handleThemeSystemChange);
      }
    }
  }

  /**
   * Initialize theme toggle (can be called multiple times safely).
   */
  function initThemeToggle() {
    const themeToggleInput = document.getElementById("theme-toggle");
    if (!themeToggleInput) return;

    // Sync ARIA
    themeToggleInput.setAttribute(
      "aria-checked",
      String(!!themeToggleInput.checked)
    );
    themeToggleInput.setAttribute("role", "switch");

    // Change by click
    themeToggleInput.addEventListener("change", () => {
      const newTheme = themeToggleInput.checked ? "dark" : "light";
      applyTheme(newTheme, true);
      try {
        storage?.setItem("theme", newTheme);
      } catch (err) {
        // Ignore storage failures (e.g., private mode)
      }
    });

    // Keyboard accessibility (Space / Enter)
    themeToggleInput.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        themeToggleInput.checked = !themeToggleInput.checked;
        const newTheme = themeToggleInput.checked ? "dark" : "light";
        applyTheme(newTheme, true);
        try {
          storage?.setItem("theme", newTheme);
        } catch (err) {}
      }
    });
  }

  // Init theme toggle on first load
  initThemeToggle();
  // Re-init if header/footer includes loaded dynamically
  document.addEventListener("includesLoaded", initThemeToggle, false);

  // ---- End-of-page toast logic ----

  let endOfPageShown = false;
  let lastScrollY = 0;
  let ticking = false;

  function checkPageEnd() {
    const scrollPosition = window.innerHeight + lastScrollY;
    const docHeight =
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) || document.body.offsetHeight;

    if (!endOfPageShown && scrollPosition >= docHeight - 50) {
      endOfPageShown = true;
      if (typeof window.langStrings.endOfPage === "string") {
        createToast(window.langStrings.endOfPage);
      } else if (typeof window.langStrings.endOfPage === "function") {
        const msg = window.langStrings.endOfPage();
        if (msg) createToast(msg);
      }
    }
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      lastScrollY = window.scrollY || window.pageYOffset || 0;
      if (!ticking) {
        window.requestAnimationFrame(checkPageEnd);
        ticking = true;
      }
    },
    { passive: true }
  );

  // Footer year
  const yearEl =
    document.getElementById("current-year") ||
    document.getElementById("footer-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
