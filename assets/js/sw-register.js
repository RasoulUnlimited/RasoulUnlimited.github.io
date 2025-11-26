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
   * Attach "installed" listener to a worker (if present)
   * @param {ServiceWorker} worker
   */
  function attachInstalledListener(worker) {
    if (!worker) return;

    worker.addEventListener("statechange", function () {
      if (worker.state !== "installed") return;

      // If controller exists, this is an update
      if (navigator.serviceWorker.controller) {
        notifyUpdate();
      } else {
        // First installation: offline support enabled
        notifyReady();
      }
    });
  }

  /**
   * Handle Service Worker registration and updates
   * @param {ServiceWorkerRegistration} reg - Registration object
   */
  function handleRegistration(reg) {
    // If waiting worker exists, update is available (e.g. from previous visit)
    if (reg.waiting) {
      notifyUpdate();
    }

    // اگر همین الان در حال نصب باشد (before we attached 'updatefound')
    attachInstalledListener(reg.installing);

    // Listen for future updates
    reg.addEventListener("updatefound", function () {
      attachInstalledListener(reg.installing);
    });

    // اگر سرویس‌ورکر فعال است ولی کنترلی نداریم (سناریوی لبه‌ای)
    // می‌توانیم وقتی آماده شد، پیام ready بدهیم
    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(function () {
          // هنوز controller نداریم؟ یعنی این تب تازه تحت کنترل قرار گرفته
          if (!navigator.serviceWorker.controller) {
            notifyReady();
          }
        })
        .catch(function () {
          // ignore
        });
    }
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
