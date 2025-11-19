// js/sw-register.js
// Safe, robust Service Worker registration with update notifications

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  // SW فقط روی HTTPS (یا localhost) کار می‌کند
  if (!window.isSecureContext) {
    console.warn(
      'Service workers require a secure context (HTTPS or localhost).'
    );
    return;
  }

  var root = document.documentElement;
  var lang = (root.getAttribute('lang') || '').toLowerCase();
  var isFa = lang.indexOf('fa') === 0;

  function safeToast(message) {
    if (typeof window.createToast === 'function') {
      window.createToast(message);
    }
  }

  function notifyReady() {
    safeToast(
      isFa ? 'پشتیبانی آفلاین فعال شد' : 'Offline support enabled'
    );
  }

  function notifyUpdate() {
    safeToast(
      isFa
        ? 'نسخهٔ جدید در دسترس است. برای بروزرسانی صفحه را تازه کنید.'
        : 'New version available. Refresh to update.'
    );
  }

  function handleRegistration(reg) {
    // اگر سرویس‌ورکر فعال است، یعنی می‌توانیم آفلاین کار کنیم
    if (reg.active) {
      notifyReady();
    }

    // اگر در لحظه‌ی رجیستر، worker در حالت waiting است، یعنی آپدیت آماده است
    if (reg.waiting) {
      notifyUpdate();
    }

    // لیسنر برای آپدیت‌های بعدی
    reg.addEventListener('updatefound', function () {
      var newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', function () {
        if (newWorker.state !== 'installed') return;

        // اگر controller هست، یعنی این یک آپدیت است، نه اولین نصب
        if (navigator.serviceWorker.controller) {
          notifyUpdate();
        } else {
          // اولین نصب: آفلاین فعال شد
          notifyReady();
        }
      });
    });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .then(handleRegistration)
      .catch(function (err) {
        console.error('SW registration failed:', err);
      });
  });
})();
