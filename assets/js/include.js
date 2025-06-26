async function includeHTML(callback) {
  const elements = document.querySelectorAll('[data-include-html]');
  const fetches = [];
  elements.forEach((el) => {
    const file = el.getAttribute('data-include-html');
    if (file) {
      const fetchPromise = (async () => {
        try {
          const resp = await fetch(file);
          const html = await resp.text();
          el.innerHTML = html;
          if (file.includes('footer.html')) {
            const yearSpan = el.querySelector('#footer-year');
            if (yearSpan) {
              yearSpan.textContent = new Date().getFullYear();
            }
          }
        } catch (err) {
          console.error('Include error:', err);
        }
      })();
      fetches.push(fetchPromise);
    }
  });
  await Promise.all(fetches);
  if (typeof callback === 'function') {
    callback();
  }
}

function setActiveNavLink() {
  const normalize = (path) =>
    path.replace(/\/index\.html$/, '/').replace(/\/$/, '/');
  const current = normalize(window.location.pathname);
  document.querySelectorAll('.navbar nav a').forEach((link) => {
    const linkPath = normalize(new URL(link.href).pathname);
    const isActive = linkPath === current;
    link.classList.toggle('active', isActive);
    if (link.parentElement && link.parentElement.tagName === 'LI') {
      link.parentElement.classList.toggle('active', isActive);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  includeHTML(setActiveNavLink);
});
