// Minimal FAQ search functionality for home pages
// Derived from assets/js/faq-fa.js without analytics or extras

document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('faq-search');
  const clearButton = document.getElementById('clear-search');
  const faqItems = document.querySelectorAll('.faq-item');

  if (!searchInput || !clearButton) return;

  let debounceTimer;

  const filterFaq = (term) => {
    const searchTerm = term !== undefined ? term : searchInput.value.trim().toLowerCase();

    faqItems.forEach((item) => {
      const summary = item.querySelector('summary');
      const question = summary ? summary.textContent.toLowerCase() : '';
      const answerEl = item.querySelector('.faq-answer');
      const answer = answerEl ? answerEl.textContent.toLowerCase() : '';
      const keywords = item.dataset.keywords ? item.dataset.keywords.toLowerCase() : '';

      if (question.includes(searchTerm) || answer.includes(searchTerm) || keywords.includes(searchTerm)) {
        item.style.display = 'block';
        if (!item.open) {
          item.open = true;
          if (summary) summary.setAttribute('aria-expanded', 'true');
        }
      } else {
        item.style.display = 'none';
        if (item.open) {
          item.open = false;
          if (summary) summary.setAttribute('aria-expanded', 'false');
        }
      }
    });
  };

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    clearButton.style.display = term ? 'block' : 'none';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filterFaq(term), 200);
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.style.display = 'none';
    clearTimeout(debounceTimer);
    filterFaq('');
  });
});