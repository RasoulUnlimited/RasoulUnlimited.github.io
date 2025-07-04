(function () {
  "use strict";

  if (!window.langStrings) {
    console.warn("No language strings loaded");
    window.langStrings = {};
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("theme");

  function createToast(message) {
    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className = "dynamic-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      toast.remove();
    }, 3000);
  }

  function applyTheme(theme, showToast) {
    document.body.classList.toggle("dark-mode", theme === "dark");
    document.body.classList.toggle("light-mode", theme === "light");
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.checked = theme === "dark";
      toggle.setAttribute("aria-checked", theme === "dark");
    }
    if (showToast && window.langStrings.themeChanged) {
      createToast(window.langStrings.themeChanged(theme));
    }
  }

  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme(prefersDark ? "dark" : "light");
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          applyTheme(e.matches ? "dark" : "light");
        }
      });
  }

  function initThemeToggle() {
    const themeToggleInput = document.getElementById("theme-toggle");
    if (!themeToggleInput) return;
    themeToggleInput.setAttribute("aria-checked", themeToggleInput.checked);
    themeToggleInput.addEventListener("change", () => {
      const newTheme = themeToggleInput.checked ? "dark" : "light";
      applyTheme(newTheme, true);
      localStorage.setItem("theme", newTheme);
    });
  }

  initThemeToggle();
  document.addEventListener("includesLoaded", initThemeToggle);

  let endOfPageShown = false;
  let lastScrollY = 0;
  let ticking = false;

  function checkPageEnd() {
    if (
      !endOfPageShown &&
      window.innerHeight + lastScrollY >= document.body.offsetHeight - 50
    ) {
      endOfPageShown = true;
      if (window.langStrings.endOfPage) {
        createToast(window.langStrings.endOfPage);
      }
    }
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      lastScrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(checkPageEnd);
        ticking = true;
      }
    },
    { passive: true }
  );

  const yearEl =
    document.getElementById("current-year") ||
    document.getElementById("footer-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
