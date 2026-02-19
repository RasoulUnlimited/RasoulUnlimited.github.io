(function () {
  "use strict";

  // Ensure language strings object exists
  if (!window.langStrings) {
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

  // Motion preference (for smooth scroll, etc.)
  const reduceMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const prefersReducedMotion = !!(reduceMotionQuery && reduceMotionQuery.matches);

  /**
   * Enhanced toast helper with types and icons
   * @param {string} message
   * @param {"success"|"error"|"info"|"default"} [type="default"]
   */
  function createToast(message, type = "default") {
    if (!message) {return;}
    if (!document.body) {
      console.warn("Cannot show toast: document.body not ready");
      return;
    }

    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className = `dynamic-toast ${type}`;

    // Add icon based on type
    let iconHtml = "";
    if (type === "success") {
      iconHtml = '<i class="fas fa-check-circle" aria-hidden="true"></i> ';
    } else if (type === "error") {
      iconHtml = '<i class="fas fa-exclamation-circle" aria-hidden="true"></i> ';
    } else if (type === "info") {
      iconHtml = '<i class="fas fa-info-circle" aria-hidden="true"></i> ';
    }

    toast.innerHTML = `${iconHtml}<span>${String(message)}</span>`;

    // Optional: prevent infinite stacking by removing oldest toast if too many
    const existingToasts = document.querySelectorAll(".dynamic-toast");
    if (existingToasts.length > 3) {
      existingToasts.forEach((t, index) => {
        if (index === 0 && t.parentNode) {t.remove();}
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
        if (toast.parentNode) {toast.remove();}
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
    const shouldShowToast = !!showToast;

    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);

    // Optional: expose theme on <html> for CSS theming
    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.checked = isDark;
      toggle.setAttribute("aria-checked", String(isDark));
    }

    if (
      shouldShowToast &&
      typeof window.langStrings.themeChanged === "function"
    ) {
      // themeChanged(theme) → localized message
      const msg = window.langStrings.themeChanged(theme);
      if (msg) {createToast(msg);}
    }
  }

  // Initial theme: stored preference > system preference
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
  } else {
    applyTheme(prefersDark ? "dark" : "light");
  }

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

  /**
   * Initialize theme toggle (can be called multiple times safely).
   */
  function initThemeToggle() {
    const themeToggleInput = document.getElementById("theme-toggle");
    if (!themeToggleInput) {return;}

    // Avoid attaching listeners multiple times on dynamic includes
    if (themeToggleInput.dataset.themeToggleInit === "true") {
      return;
    }
    themeToggleInput.dataset.themeToggleInit = "true";

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
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      ) || 0;

    // Reset flag if user scrolls back up (more than 100px from bottom)
    if (scrollPosition < docHeight - 100) {
      endOfPageShown = false;
    }

    if (!endOfPageShown && scrollPosition >= docHeight - 50 && docHeight > 0) {
      endOfPageShown = true;
      if (typeof window.langStrings.endOfPage === "string") {
        createToast(window.langStrings.endOfPage);
      } else if (typeof window.langStrings.endOfPage === "function") {
        const msg = window.langStrings.endOfPage();
        if (msg) {createToast(msg);}
      }
    }
    ticking = false;
  }

  function updateProgressBar() {
    const progressBar = document.getElementById("scroll-progress-bar");
    if (!progressBar) {return;}

    const scrollTop =
      window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    if (docHeight <= 0) {
      progressBar.style.width = "0%";
      progressBar.setAttribute("aria-valuenow", "0");
      return;
    }

    const scrollPercent = (scrollTop / docHeight) * 100;
    const clamped = Math.max(0, Math.min(100, scrollPercent));

    progressBar.style.width = clamped + "%";
    progressBar.setAttribute("aria-valuenow", Math.round(clamped));
  }

  window.addEventListener(
    "scroll",
    () => {
      lastScrollY = window.scrollY || window.pageYOffset || 0;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkPageEnd();
          updateProgressBar();
        });
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

  // Back to Top Button Logic
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    window.addEventListener(
      "scroll",
      () => {
        if (window.scrollY > 300) {
          backToTopBtn.classList.add("show");
        } else {
          backToTopBtn.classList.remove("show");
        }
      },
      { passive: true }
    );

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }

  function resolveCopyToastMessage(kind) {
    const strings = window.langStrings || {};
    const keyOrder = {
      success: ["copySuccess", "emailCopied"],
      error: ["copyError", "emailCopyError"],
      unsupported: ["copyUnsupported", "clipboardUnsupported"],
    };

    const keys = keyOrder[kind] || [];
    for (const key of keys) {
      const value = strings[key];
      if (typeof value === "function") {
        const message = value();
        if (typeof message === "string" && message.trim()) {return message;}
      } else if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    const isFa = (document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("fa");

    const fallback = {
      success: isFa
        ? "\u0627\u06cc\u0645\u06cc\u0644 \u06a9\u067e\u06cc \u0634\u062f."
        : "Email copied.",
      error: isFa
        ? "\u06a9\u067e\u06cc \u0628\u0627 \u0645\u0634\u06a9\u0644 \u0645\u0648\u0627\u062c\u0647 \u0634\u062f."
        : "Copy failed.",
      unsupported: isFa
        ? "\u0645\u0631\u0648\u0631\u06af\u0631 \u0634\u0645\u0627 \u0627\u0632 \u06a9\u067e\u06cc \u062e\u0648\u062f\u06a9\u0627\u0631 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc \u0646\u0645\u06cc\u200c\u06a9\u0646\u062f."
        : "Your browser does not support automatic copy.",
    };

    return fallback[kind] || fallback.error;
  }

  // Copy to Clipboard Logic
  const copyBtns = document.querySelectorAll(".copy-btn");
  copyBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const textToCopy = btn.getAttribute("data-copy");
      if (!textToCopy) {
        console.warn("No data-copy attribute found on .copy-btn");
        return;
      }

      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        console.warn("Clipboard API not available");
        if (window.createToast) {
          window.createToast(resolveCopyToastMessage("unsupported"));
        }
        return;
      }

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          const originalIcon = btn.innerHTML;
          btn.innerHTML =
            '<i class="fas fa-check" aria-hidden="true"></i>';
          btn.classList.add("copied");

          if (window.createToast) {
            window.createToast(resolveCopyToastMessage("success"));
          }

          setTimeout(() => {
            btn.innerHTML = originalIcon;
            btn.classList.remove("copied");
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          if (window.createToast) {
            window.createToast(resolveCopyToastMessage("error"));
          }
        });
    });
  });

  // ---- Neurodesign Enhancements Initialization ----

  // 1. Scroll Progress Bar Logic is handled by updateProgressBar() and existing HTML

  // 2. Ripple Effect for Buttons
  document.addEventListener("click", function (e) {
    const target = e.target.closest(".btn, button, .cta-button, .hero-btn");
    if (target) {
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      target.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  });

  // 3. Success Trigger Helper
  window.triggerSuccess = function (element) {
    if (!element) {return;}
    element.classList.add("success-trigger");
    setTimeout(() => {
      element.classList.remove("success-trigger");
    }, 300);
  };

})();
