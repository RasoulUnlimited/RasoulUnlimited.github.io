(function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
        .then(function (reg) {
            if (typeof createToast === 'function') {
              var msg = document.documentElement.lang.startsWith('fa')
                ? 'پشتیبانی آفلاین فعال شد'
                : 'Offline support enabled';
              createToast(msg);
            }

            function notifyUpdate() {
              if (typeof createToast !== 'function') return;
              var m = document.documentElement.lang.startsWith('fa')
                ? 'نسخهٔ جدید در دسترس است. برای بروزرسانی صفحه را تازه کنید.'
                : 'New version available. Refresh to update.';
              createToast(m);
            }

            if (reg.waiting) notifyUpdate();
            reg.addEventListener('updatefound', function () {
              var newWorker = reg.installing;
              newWorker && newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  notifyUpdate();
                }
              });
            });
          })
          .catch(function (err) {
            console.error('SW registration failed', err);
          });
      });
    }
  })();
  