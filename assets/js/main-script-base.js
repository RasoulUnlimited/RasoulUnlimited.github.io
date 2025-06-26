(function() {
    'use strict';
  
    if (!window.langStrings) {
      console.warn('No language strings loaded');
      window.langStrings = {};
    }
  
    const themeToggleInput = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
  
    function createToast(message) {
      const toast = document.createElement('div');
      toast.className = 'dynamic-toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  
    function applyTheme(theme, showToast) {
      document.body.classList.toggle('dark-mode', theme === 'dark');
      document.body.classList.toggle('light-mode', theme === 'light');
      if (themeToggleInput) themeToggleInput.checked = theme === 'dark';
      if (showToast && window.langStrings.themeChanged) {
        createToast(window.langStrings.themeChanged(theme));
      }
    }
  
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  
    if (themeToggleInput) {
      themeToggleInput.addEventListener('change', () => {
        const newTheme = themeToggleInput.checked ? 'dark' : 'light';
        applyTheme(newTheme, true);
        localStorage.setItem('theme', newTheme);
      });
    }
  
    let endOfPageShown = false;
    let lastScrollY = 0;
    let ticking = false;

    function checkPageEnd() {
      if (
        !endOfPageShown &&
        window.innerHeight + lastScrollY >= document.body.offsetHeight - 50
      ) {
        endOfPageShown = true;
        if (window.langStrings.endOfPage) {
          createToast(window.langStrings.endOfPage);
        }
      }
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      () => {
        lastScrollY = window.scrollY;
        if (!ticking) {
          window.requestAnimationFrame(checkPageEnd);
          ticking = true;
        }
      },
      { passive: true }
    );
  
    document.getElementById('current-year').textContent = new Date().getFullYear();
  })();