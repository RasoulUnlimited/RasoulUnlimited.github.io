// js/sw-register.js
// Safe, robust Service Worker registration with update notifications

(function () {
  "use strict";

  // Feature & security checks
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

  // زبان صفحه: اول lang روی <html> بعد navigator.language
  const docLang = (root.getAttribute("lang") || "").toLowerCase();
  const navLang = (navigator.language || "").toLowerCase();
  const lang = docLang || navLang;
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
    safeToast(isFa ? "پشتیبانی آفلاین فعال شد" : "Offline support enabled");
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
   * @param {ServiceWorker | null | undefined} worker
   */
  function attachInstalledListener(worker) {
    if (!worker) return;

    function onStateChange() {
      if (worker.state !== "installed") return;

      // If controller exists, this is an update
      if (navigator.serviceWorker.controller) {
        notifyUpdate();
      } else {
        // First installation: offline support enabled
        notifyReady();
      }

      // بعد از رسیدن به installed، دیگر نیازی به لیسنر نیست
      worker.removeEventListener("statechange", onStateChange);
    }

    worker.addEventListener("statechange", onStateChange);
  }

  /**
   * Handle Service Worker registration and updates
   * @param {ServiceWorkerRegistration} reg - Registration object
   */
  function handleRegistration(reg) {
    if (!reg) return;

    // If waiting worker exists, update is available (e.g. from previous visit)
    if (reg.waiting) {
      notifyUpdate();
    }

    // اگر همین الان در حال نصب باشد (before we attached 'updatefound')
    attachInstalledListener(reg.installing);

    // Listen for future updates
    if (typeof reg.addEventListener === "function") {
      reg.addEventListener("updatefound", function () {
        attachInstalledListener(reg.installing);
      });
    }

    // Edge-case: سرویس‌ورکر فعال است ولی controller نداریم
    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(function () {
          // اگر هنوز controller نداریم یعنی این تب تازه تحت کنترل قرار گرفته
          if (!navigator.serviceWorker.controller) {
            notifyReady();
          }
        })
        .catch(function () {
          // ignore
        });
    }

    // Optional: گوش دادن به تغییر controller برای توسعه‌های بعدی (auto-refresh و غیره)
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      // در صورت نیاز می‌تونی اینجا لاجیک اضافه کنی
      // مثلاً:
      // notifyUpdate();
      // یا auto-refresh: window.location.reload();
    });
  }

  // Register Service Worker when window has fully loaded
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js")
      .then(handleRegistration)
      .catch(function (err) {
        console.error("Service Worker registration failed:", err);
      });
  });
})();
