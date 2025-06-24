// Inject a lightweight Person schema a few seconds after DOM is ready
// This helps reinforce identity signals without blocking the main rendering path

(function () {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(
          {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Mohammad Rasoul Sohrabi',
            url: 'https://rasoulunlimited.ir',
          },
          null,
          2
        );
        document.head.appendChild(script);
      }, 3000);
    });
  })();