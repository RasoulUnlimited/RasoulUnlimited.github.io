// js/sw-register.js
// Robust Service Worker registration with periodic update checks.

(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (!window.isSecureContext) {
    console.warn("Service workers require HTTPS (or localhost).");
    return;
  }

  const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
  const root = document.documentElement;

  const docLang = (root.getAttribute("lang") || "").toLowerCase();
  const navLang = (navigator.language || "").toLowerCase();
  const lang = docLang || navLang;
  const isFa = lang.indexOf("fa") === 0;

  let activeRegistration = null;
  let updateCheckTimer = null;
  let readyNotified = false;
  let updateNotified = false;

  function safeToast(message, options = {}) {
    if (!message || typeof window.createToast !== "function") {
      return;
    }
    const settings = {
      kind: "info",
      duration: 2600,
      ...options,
    };
    window.createToast(message, settings);
  }

  function notifyReady() {
    if (readyNotified) {
      return;
    }
    readyNotified = true;
    safeToast(isFa ? "Offline support enabled" : "Offline support enabled", {
      id: "sw-ready-toast",
      kind: "success",
      duration: 2200,
    });
  }

  function notifyUpdate() {
    if (updateNotified) {
      return;
    }
    updateNotified = true;
    safeToast(
      isFa
        ? "A new version is available. Refresh to update."
        : "A new version is available. Refresh to update.",
      {
        id: "sw-update-toast",
        kind: "info",
        duration: 3200,
      }
    );
  }

  function attachInstalledListener(worker) {
    if (!worker) {
      return;
    }

    function onStateChange() {
      if (worker.state !== "installed") {
        return;
      }

      if (navigator.serviceWorker.controller) {
        notifyUpdate();
      } else {
        notifyReady();
      }

      worker.removeEventListener("statechange", onStateChange);
    }

    worker.addEventListener("statechange", onStateChange);
  }

  function safeUpdateCheck(reason) {
    if (!activeRegistration || !navigator.onLine) {
      return;
    }

    activeRegistration.update().catch((err) => {
      console.warn("Service worker update check failed (" + reason + "):", err);
    });
  }

  function setupUpdateTriggers() {
    if (updateCheckTimer) {
      return;
    }

    updateCheckTimer = window.setInterval(() => {
      safeUpdateCheck("interval");
    }, UPDATE_CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        safeUpdateCheck("visibility");
      }
    });

    window.addEventListener("online", () => {
      safeUpdateCheck("online");
    });

    window.addEventListener("beforeunload", () => {
      if (updateCheckTimer) {
        window.clearInterval(updateCheckTimer);
        updateCheckTimer = null;
      }
    });
  }

  function handleRegistration(reg) {
    if (!reg) {
      return;
    }

    activeRegistration = reg;

    if (reg.waiting) {
      notifyUpdate();
    }

    attachInstalledListener(reg.installing);

    if (typeof reg.addEventListener === "function") {
      reg.addEventListener("updatefound", () => {
        attachInstalledListener(reg.installing);
      });
    }

    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(() => {
          if (navigator.serviceWorker.controller) {
            notifyReady();
          }
        })
        .catch(() => {
          // Ignore ready failures.
        });
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      updateNotified = false;
    });

    setupUpdateTriggers();
    safeUpdateCheck("post-register");
  }

  function registerServiceWorker() {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(handleRegistration)
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
  }

  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", registerServiceWorker, { once: true });
  }
})();
