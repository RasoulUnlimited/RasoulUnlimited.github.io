// Automatically update the current year in the footer
document.getElementById('current-year').textContent = new Date().getFullYear();

AOS.init({
  // Global settings:
  disable: false,
  startEvent: "DOMContentLoaded",
  initClassName: "aos-init",
  animatedClassName: "aos-animate",
  useClassNames: false,
  disableMutationObserver: false,
  debounceDelay: 50,
  throttleDelay: 99,

  // Settings that can be overridden on per-element basis, by `data-aos-*` attributes:
  offset: 120,
  delay: 0,
  duration: 800,
  easing: "ease",
  once: false,
  mirror: false,
  anchorPlacement: "top-bottom",
});

window.addEventListener('load', () => {
  const giscusContainer = document.querySelector('.giscus-container');
  const emptyState = document.querySelector('.empty-testimonials-state');

  // هر چند وقت یه بار بررسی می‌کنیم محتوای گیسکس چیه
  let attempts = 0;
  const maxAttempts = 20; // مثلا 20 بار چک کن (هر 500ms یعنی 10 ثانیه)
  const interval = setInterval(() => {
    attempts++;

    // بررسی محتوا
    const hasContent = giscusContainer.innerText.trim().length > 0;

    if (hasContent) {
      // یعنی کامنت یا حداقل چیزی دیده شده
      emptyState.style.display = 'none';
      giscusContainer.style.display = 'block';
      clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      // بعد 10 ثانیه هنوز چیزی نیومده، فرض می‌کنیم کامنتی نیست
      emptyState.style.display = 'block';
      giscusContainer.style.display = 'none';
      clearInterval(interval);
    }
  }, 500);
});