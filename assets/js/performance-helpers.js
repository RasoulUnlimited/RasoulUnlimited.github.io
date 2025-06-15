document.querySelectorAll('link[rel="preload"][as="style"][data-make-stylesheet]').forEach(link => {
    link.addEventListener('load', function () {
      this.rel = 'stylesheet';
    });
  });
  