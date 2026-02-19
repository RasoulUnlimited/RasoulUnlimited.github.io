// Shared, resilient Giscus loader for FA/EN home pages.
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const ROOT_SELECTOR = "[data-giscus-root]";
  const GISCUS_SCRIPT_SRC = "https://giscus.app/client.js";
  const GISCUS_ORIGIN = "https://giscus.app";
  const DEFAULT_TIMEOUT_MS = 8000;
  const IO_ROOT_MARGIN = "320px 0px";
  const MAX_AUTO_RETRIES = 1;
  const AUTO_RETRY_DELAY_MS = 900;
  const ROOTS = [];
  const STATES = new WeakMap();

  let themeBindingsAttached = false;
  let connectivityBindingsAttached = false;

  function query(root, selector) {
    return root ? root.querySelector(selector) : null;
  }

  function showElement(element, visible) {
    if (!element) {return;}
    if (visible) {
      element.removeAttribute("hidden");
    } else {
      element.setAttribute("hidden", "");
    }
  }

  function resolveLocale(root) {
    const lang =
      root.dataset.giscusLang ||
      document.documentElement.lang ||
      "en";
    return lang.toLowerCase().startsWith("fa") ? "fa" : "en";
  }

  function resolveTheme() {
    const current =
      (document.documentElement.getAttribute("data-theme") || "")
        .trim()
        .toLowerCase();
    if (current === "dark") {return "dark";}
    if (current === "light") {return "light";}
    return "preferred_color_scheme";
  }

  function defaultErrorMessage(root) {
    return resolveLocale(root) === "fa"
      ? "بارگذاری نظرات با مشکل مواجه شد. لطفاً دوباره تلاش کنید."
      : "Comments could not be loaded. Please try again.";
  }

  function reportState(status) {
    if (typeof window.gtag !== "function") {return;}
    if (status === "idle") {return;}

    try {
      window.gtag("event", "giscus_state_change", {
        event_category: "engagement",
        event_label: status,
      });
    } catch {
      // Metrics should never block UX.
    }
  }

  function setBusyState(root, busy) {
    const container = query(root, ".giscus-container");
    if (container) {
      container.setAttribute("aria-busy", busy ? "true" : "false");
    }
    root.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function emit(root, name, detail) {
    try {
      root.dispatchEvent(
        new CustomEvent(name, {
          bubbles: true,
          detail: detail || {},
        })
      );
    } catch {
      // Silently ignore in older browsers.
    }
  }

  function setStatus(root, status, message) {
    const loading = query(root, ".giscus-loading");
    const error = query(root, ".giscus-error");
    const errorMessage = query(root, ".giscus-error-message");

    root.dataset.giscusStatus = status;

    const isLoading = status === "loading";
    if (loading) {
      loading.classList.toggle("hidden", !isLoading);
      showElement(loading, isLoading);
    }

    const isError = status === "error";
    if (error) {
      error.classList.toggle("hidden", !isError);
      showElement(error, isError);
    }

    if (isError && errorMessage) {
      errorMessage.textContent = message || defaultErrorMessage(root);
    }

    setBusyState(root, isLoading);
    emit(root, "giscus:state-change", { status });
    reportState(status);
  }

  function clearContainer(root) {
    const container = query(root, ".giscus-container");
    if (!container) {return;}
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  function clearRuntime(state) {
    if (!state) {return;}

    if (state.timeoutId) {
      window.clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }

    if (state.retryTimer) {
      window.clearTimeout(state.retryTimer);
      state.retryTimer = null;
    }

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (state.iframe && state.iframeLoadHandler) {
      state.iframe.removeEventListener("load", state.iframeLoadHandler);
      state.iframeLoadHandler = null;
    }

    state.iframe = null;
    state.script = null;
  }

  function pulseReady(root) {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {return;}

    root.classList.remove("giscus-ready-pulse");
    // Trigger reflow so a subsequent class re-add restarts animation.
    void root.offsetWidth;
    root.classList.add("giscus-ready-pulse");

    window.setTimeout(() => {
      root.classList.remove("giscus-ready-pulse");
    }, 700);
  }

  function syncTheme(root) {
    const theme = resolveTheme();
    root.dataset.giscusThemeApplied = theme;

    const iframe = query(root, "iframe.giscus-frame");
    if (!iframe || !iframe.contentWindow) {return;}

    try {
      iframe.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme,
            },
          },
        },
        GISCUS_ORIGIN
      );
      emit(root, "giscus:theme-sync", { theme });
    } catch {
      // Cross-origin sync failures should not break UX.
    }
  }

  function syncAllReadyThemes() {
    ROOTS.forEach((root) => {
      const state = STATES.get(root);
      if (!state || state.status !== "ready") {return;}
      syncTheme(root);
    });
  }

  function attachThemeBindings() {
    if (themeBindingsAttached) {return;}
    themeBindingsAttached = true;

    const observer = new MutationObserver(() => {
      syncAllReadyThemes();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("themechange", syncAllReadyThemes);
    window.addEventListener(
      "beforeunload",
      () => {
        observer.disconnect();
        window.removeEventListener("themechange", syncAllReadyThemes);
      },
      { once: true }
    );
  }

  function attachConnectivityBindings() {
    if (connectivityBindingsAttached) {return;}
    connectivityBindingsAttached = true;

    const onOnline = () => {
      ROOTS.forEach((root) => {
        const state = STATES.get(root);
        if (!state || state.status !== "error") {return;}
        startLoad(root, true, "online");
      });
    };

    window.addEventListener("online", onOnline);
    window.addEventListener(
      "beforeunload",
      () => {
        window.removeEventListener("online", onOnline);
      },
      { once: true }
    );
  }

  function getConfig(root) {
    const parsedTimeout = Number.parseInt(root.dataset.giscusTimeout || "", 10);

    return {
      repo: root.dataset.giscusRepo || "",
      repoId: root.dataset.giscusRepoId || "",
      category: root.dataset.giscusCategory || "",
      categoryId: root.dataset.giscusCategoryId || "",
      mapping: root.dataset.giscusMapping || "specific",
      term: root.dataset.giscusTerm || "",
      lang: root.dataset.giscusLang || resolveLocale(root),
      strict: root.dataset.giscusStrict || "1",
      reactionsEnabled: root.dataset.giscusReactionsEnabled || "1",
      emitMetadata: root.dataset.giscusEmitMetadata || "0",
      inputPosition: root.dataset.giscusInputPosition || "top",
      loading: root.dataset.giscusLoading || "lazy",
      timeoutMs:
        Number.isFinite(parsedTimeout) && parsedTimeout > 0
          ? parsedTimeout
          : DEFAULT_TIMEOUT_MS,
    };
  }

  function validateConfig(config) {
    if (!config.repo || !config.repoId) {return false;}
    if (!config.category || !config.categoryId) {return false;}
    if (config.mapping === "specific" && !config.term) {return false;}
    return true;
  }

  function buildScript(config) {
    const script = document.createElement("script");
    script.src = GISCUS_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";

    script.setAttribute("data-repo", config.repo);
    script.setAttribute("data-repo-id", config.repoId);
    script.setAttribute("data-category", config.category);
    script.setAttribute("data-category-id", config.categoryId);
    script.setAttribute("data-mapping", config.mapping);
    script.setAttribute("data-lang", config.lang);
    script.setAttribute("data-strict", config.strict);
    script.setAttribute("data-reactions-enabled", config.reactionsEnabled);
    script.setAttribute("data-emit-metadata", config.emitMetadata);
    script.setAttribute("data-input-position", config.inputPosition);
    script.setAttribute("data-loading", config.loading);
    script.setAttribute("data-theme", resolveTheme());
    script.setAttribute("data-ai-integration", "giscus-comments");

    if (config.mapping === "specific" && config.term) {
      script.setAttribute("data-term", config.term);
    }

    return script;
  }

  function shouldAutoRetry(state, reason) {
    if (!state) {return false;}
    if (state.autoRetryCount >= MAX_AUTO_RETRIES) {return false;}
    if (reason !== "timeout" && reason !== "script-error") {return false;}
    if (!navigator.onLine) {return false;}
    return true;
  }

  function scheduleAutoRetry(root, reason) {
    const state = STATES.get(root);
    if (!state || !shouldAutoRetry(state, reason)) {return;}

    state.autoRetryCount += 1;
    const attempt = state.autoRetryCount;
    emit(root, "giscus:retry", { reason, attempt, source: "auto" });

    state.retryTimer = window.setTimeout(() => {
      const active = STATES.get(root);
      if (!active || active.status !== "error") {return;}
      startLoad(root, true, "auto");
    }, AUTO_RETRY_DELAY_MS * attempt);
  }

  function fail(root, reason) {
    const state = STATES.get(root);
    if (!state || state.status !== "loading") {return;}

    clearRuntime(state);
    state.status = "error";
    root.dataset.giscusErrorReason = reason;

    setStatus(
      root,
      "error",
      root.dataset.giscusErrorMessage || defaultErrorMessage(root)
    );

    emit(root, "giscus:error", { reason });
    scheduleAutoRetry(root, reason);
  }

  function succeed(root) {
    const state = STATES.get(root);
    if (!state || state.status !== "loading") {return;}

    clearRuntime(state);
    state.status = "ready";
    state.autoRetryCount = 0;
    setStatus(root, "ready");
    syncTheme(root);
    pulseReady(root);

    emit(root, "giscus:ready", { theme: resolveTheme() });
  }

  function startLoad(root, forceRetry, source = "manual") {
    const state = STATES.get(root);
    if (!state) {return;}

    if (source !== "auto") {
      state.autoRetryCount = 0;
    }

    if (state.status === "loading") {return;}
    if (state.status === "ready" && !forceRetry) {return;}

    clearRuntime(state);
    clearContainer(root);

    const config = getConfig(root);
    if (!validateConfig(config)) {
      state.status = "error";
      setStatus(root, "error", defaultErrorMessage(root));
      emit(root, "giscus:error", { reason: "invalid-config" });
      return;
    }

    const container = query(root, ".giscus-container");
    if (!container) {
      state.status = "error";
      setStatus(root, "error", defaultErrorMessage(root));
      emit(root, "giscus:error", { reason: "missing-container" });
      return;
    }

    state.status = "loading";
    setStatus(root, "loading");
    root.dataset.giscusThemeApplied = resolveTheme();
    root.dataset.giscusErrorReason = "";
    emit(root, "giscus:loading", { source });

    const script = buildScript(config);
    state.script = script;

    state.timeoutId = window.setTimeout(() => {
      fail(root, "timeout");
    }, config.timeoutMs);

    script.onerror = () => {
      fail(root, "script-error");
    };

    state.observer = new MutationObserver(() => {
      const iframe = query(root, "iframe.giscus-frame");
      if (!iframe || state.iframe === iframe) {return;}

      state.iframe = iframe;
      state.iframeLoadHandler = () => {
        succeed(root);
      };
      iframe.addEventListener("load", state.iframeLoadHandler, { once: true });

      // Cross-origin iframes may not reliably fire a visible load event.
      window.setTimeout(() => {
        const active = STATES.get(root);
        if (!active || active.status !== "loading") {return;}
        succeed(root);
      }, 1200);
    });

    state.observer.observe(container, { childList: true, subtree: true });
    container.appendChild(script);
  }

  function initRoot(root) {
    if (!root || root.dataset.giscusBooted === "true") {return;}
    root.dataset.giscusBooted = "true";

    const state = {
      status: "idle",
      observer: null,
      timeoutId: null,
      retryTimer: null,
      autoRetryCount: 0,
      iframe: null,
      iframeLoadHandler: null,
      script: null,
      io: null,
    };
    STATES.set(root, state);
    ROOTS.push(root);

    const fallbackLink = query(root, ".giscus-fallback-link");
    if (fallbackLink && root.dataset.giscusFallbackUrl) {
      fallbackLink.setAttribute("href", root.dataset.giscusFallbackUrl);
    }

    const retryButton = query(root, ".giscus-retry-btn");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        emit(root, "giscus:retry", { reason: "manual-click", attempt: 0, source: "manual" });
        startLoad(root, true, "manual");
      });
    }

    setStatus(root, "idle");

    if ("IntersectionObserver" in window) {
      state.io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {return;}
            if (state.io) {
              state.io.disconnect();
              state.io = null;
            }
            startLoad(root, false, "init");
          });
        },
        { rootMargin: IO_ROOT_MARGIN, threshold: 0.01 }
      );
      state.io.observe(root);
    } else {
      startLoad(root, false, "init");
    }
  }

  function boot() {
    const roots = Array.from(document.querySelectorAll(ROOT_SELECTOR));
    if (!roots.length) {return;}

    roots.forEach(initRoot);
    attachThemeBindings();
    attachConnectivityBindings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.__giscusLoader = {
    reloadAll() {
      ROOTS.forEach((root) => startLoad(root, true, "manual"));
    },
    getStatus(root) {
      const state = STATES.get(root);
      return state ? state.status : "unknown";
    },
  };
})();
