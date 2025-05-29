document.getElementById("current-year").textContent = new Date().getFullYear();

AOS.init({

  disable: false,
  startEvent: "DOMContentLoaded",
  initClassName: "aos-init",
  animatedClassName: "aos-animate",
  useClassNames: false,
  disableMutationObserver: false,
  debounceDelay: 50,
  throttleDelay: 99,

  offset: 120,
  delay: 0,
  duration: 800,
  easing: "ease",
  once: false,
  mirror: false,
  anchorPlacement: "top-bottom",
});

const themeToggleInput = document.getElementById('theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');

// تابع ست‌کردن تم
function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.body.classList.toggle('light-mode', theme === 'light');
  themeToggleInput.checked = theme === 'dark';
}

if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme(prefersDark ? 'dark' : 'light');
}

themeToggleInput.addEventListener('change', () => {
  const newTheme = themeToggleInput.checked ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
});
