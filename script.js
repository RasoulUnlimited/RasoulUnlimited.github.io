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

  // بعد از 5 ثانیه بررسی می‌کنیم که آیا iframe گیسکس لود شده یا نه
  setTimeout(() => {
    // آیا iframe وجود دارد؟
    const iframe = giscusContainer.querySelector('iframe');

    if (!iframe) {
      // iframe نیومده یعنی کامنت‌ها هنوز بارگذاری نشده یا خالیه
      emptyState.style.display = 'block';
      giscusContainer.style.display = 'none';
      return;
    }

    // اگر iframe هست، ممکنه کامنت داشته باشه، پس حالت خالی را مخفی کن
    emptyState.style.display = 'none';
    giscusContainer.style.display = 'block';
  }, 5000);
});