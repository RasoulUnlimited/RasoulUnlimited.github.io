function includeHTML() {
    const elements = document.querySelectorAll('[data-include-html]');
    elements.forEach((el) => {
      const file = el.getAttribute('data-include-html');
      if (file) {
        fetch(file)
          .then((resp) => resp.text())
          .then((html) => {
            el.innerHTML = html;
            if (file.includes('footer.html')) {
              const yearSpan = el.querySelector('#footer-year');
              if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
              }
            }
          })
          .catch((err) => console.error('Include error:', err));
      }
    });
  }
  
  document.addEventListener('DOMContentLoaded', includeHTML);
  