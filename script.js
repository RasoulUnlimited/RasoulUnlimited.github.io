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
themeToggleInput.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', themeToggleInput.checked);
    localStorage.setItem('theme', themeToggleInput.checked ? 'dark' : 'light');
});

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
    themeToggleInput.checked = true;
}
