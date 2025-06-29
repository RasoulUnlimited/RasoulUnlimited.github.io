// Shared theme toggle script
// Applies dark or light mode based on toggle state and saved preference

document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
  
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
  
    function applyTheme(theme) {
      document.body.classList.toggle('dark-mode', theme === 'dark');
      document.body.classList.toggle('light-mode', theme === 'light');
      toggle.checked = theme === 'dark';
    }
  
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  
    toggle.addEventListener('change', () => {
      const newTheme = toggle.checked ? 'dark' : 'light';
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    });
  
    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle.checked = !toggle.checked;
        const newTheme = toggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
      }
    });
  });