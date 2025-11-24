// js/sw-register.js
// Safe, robust Service Worker registration with update notifications

(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) {
    return;
  }

  // SW only works on HTTPS (or localhost)
  if (!window.isSecureContext) {
    console.warn(
      "Service workers require a secure context (HTTPS or localhost)."
    );
    return;
  }

  const root = document.documentElement;
  const lang = (root.getAttribute("lang") || "").toLowerCase();
  const isFa = lang.indexOf("fa") === 0;

  /**
   * Safely display toast notification
   * @param {string} message - Message to display
   */
  function safeToast(message) {
    if (typeof window.createToast === "function") {
      window.createToast(message);
    }
  }

  function notifyReady() {
    safeToast(
      isFa ? "پشتیبانی آفلاین فعال شد" : "Offline support enabled"
    );
  }

  function notifyUpdate() {
    safeToast(
      isFa
        ? "نسخهٔ جدید در دسترس است. برای بروزرسانی صفحه را تازه کنید."
        : "New version available. Refresh to update."
    );
  }

  /**
   * Handle Service Worker registration and updates
   * @param {ServiceWorkerRegistration} reg - Registration object
   */
  function handleRegistration(reg) {
    // If waiting worker exists, update is available
    if (reg.waiting) {
      notifyUpdate();
    }

    // Listen for future updates
    reg.addEventListener("updatefound", function () {
      const newWorker = reg.installing;
      if (!newWorker) {
        return;
      }

      newWorker.addEventListener("statechange", function () {
        if (newWorker.state !== "installed") {
          return;
        }

        // If controller exists, this is an update
        if (navigator.serviceWorker.controller) {
          notifyUpdate();
        } else {
          // First installation: offline support enabled
          notifyReady();
        }
      });
    });
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js")
      .then(handleRegistration)
      .catch(function (err) {
        console.error("Service Worker registration failed:", err);
      });
  });
})();
