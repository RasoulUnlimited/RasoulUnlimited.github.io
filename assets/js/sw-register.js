(function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
          .then(function () {
            if (typeof createToast === 'function') {
              var msg = document.documentElement.lang.startsWith('fa')
                ? 'پشتیبانی آفلاین فعال شد'
                : 'Offline support enabled';
              createToast(msg);
            }
          })
          .catch(function (err) {
            console.error('SW registration failed', err);
          });
      });
    }
  })();