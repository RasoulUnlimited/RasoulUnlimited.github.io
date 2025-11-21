// Minimal FAQ search functionality for home pages
// Derived from assets/js/faq-fa.js without analytics or extras

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("faq-search");
    const clearButton = document.getElementById("clear-search");
    const faqItems = Array.from(document.querySelectorAll(".faq-item"));
    const expandAllBtn = document.getElementById("expand-all-faq");
    const collapseAllBtn = document.getElementById("collapse-all-faq");

    if (!searchInput || !clearButton || !faqItems.length) {return;}

    // Live region برای اعلام تعداد نتایج (a11y)
    let status = document.getElementById("faq-search-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "faq-search-status";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      status.className = "faq-search-status sr-only"; // تو CSS .sr-only رو تعریف کن
      searchInput.closest("form")?.appendChild(status) ||
        searchInput.parentNode.appendChild(status);
    }

    // مطمئن شو دکمه‌ی پاک‌کردن برای اسکرین‌ریدر واضح است
    if (!clearButton.getAttribute("aria-label")) {
      clearButton.setAttribute("aria-label", "Clear FAQ search");
    }

    let debounceTimer;

    function updateStatus(term, visibleCount) {
      const total = faqItems.length;
      const trimmed = term.trim();

      if (!trimmed) {
        status.textContent = `Showing all ${total} question${total === 1 ? "" : "s"}.`;
        return;
      }
      status.textContent =
        visibleCount === 0
          ? `No results found for “${trimmed}”.`
          : `Found ${visibleCount} result${visibleCount === 1 ? "" : "s"} for “${trimmed}”.`;
    }

    // Helper to highlight text
    function highlightText(element, term) {
      if (!term) {
        // Remove highlights
        element.innerHTML = element.textContent;
        return;
      }
      
      const text = element.textContent;
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      if (regex.test(text)) {
        element.innerHTML = text.replace(regex, '<span class="highlight-term">$1</span>');
      } else {
        element.innerHTML = text;
      }
    }

    function filterFaq(term) {
      const rawTerm = term !== undefined ? term : searchInput.value;
      const searchTerm = (rawTerm || "").trim().toLowerCase();
      const hasTerm = searchTerm.length > 0;

      let visibleCount = 0;

      faqItems.forEach((item) => {
        // Support both <details>/<summary> and custom .accordion-item structure
        const summary = item.querySelector("summary") || item.querySelector(".accordion-header h3") || item.querySelector(".accordion-header");
        const answerEl = item.querySelector(".faq-answer, p, .faq-body, .accordion-content");
        
        // For custom accordion, the header button is the summary
        const isCustomAccordion = !item.tagName || item.tagName.toLowerCase() !== 'details';

        const question = summary
          ? summary.textContent.toLowerCase()
          : "";
        const answer = answerEl
          ? answerEl.textContent.toLowerCase()
          : "";
        const keywords = (item.dataset.keywords || "").toLowerCase();

        const matches =
          !hasTerm ||
          question.includes(searchTerm) ||
          answer.includes(searchTerm) ||
          keywords.includes(searchTerm);

        if (matches) {
          item.hidden = false;
          item.style.display = ""; // Reset display property
          visibleCount++;

          // Highlight terms
          if (summary) highlightText(summary, hasTerm ? searchTerm : null);
          if (answerEl) highlightText(answerEl, hasTerm ? searchTerm : null);

          // Open item if searching
          if (hasTerm) {
            if (isCustomAccordion) {
                if (!item.classList.contains("is-open")) {
                    item.classList.add("is-open");
                    const header = item.querySelector(".accordion-header");
                    if (header) header.setAttribute("aria-expanded", "true");
                    item.dataset.openedBySearch = "true";
                    // Ensure content is visible
                    if (answerEl) answerEl.hidden = false;
                }
            } else {
                if (!item.open) {
                    item.open = true;
                    item.dataset.openedBySearch = "true";
                }
            }
          }

          // Close if search cleared and was opened by search
          if (!hasTerm && item.dataset.openedBySearch) {
            if (isCustomAccordion) {
                item.classList.remove("is-open");
                const header = item.querySelector(".accordion-header");
                if (header) header.setAttribute("aria-expanded", "false");
                if (answerEl) answerEl.hidden = true;
            } else {
                item.open = false;
            }
            delete item.dataset.openedBySearch;
          }
        } else {
          item.hidden = true;
          item.style.display = "none"; // Force hide
        }
      });

      const noResults = document.getElementById("faq-no-results");
      if (noResults) {
        noResults.style.display = visibleCount === 0 ? "block" : "none";
      }

      clearButton.style.display = hasTerm ? "block" : "none";
      updateStatus(searchTerm, visibleCount);
    }

    searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => filterFaq(), 300);
    });

    clearButton.addEventListener("click", function () {
      searchInput.value = "";
      filterFaq();
      searchInput.focus();
    });

    // Expand/Collapse All Logic
    if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => {
        faqItems.forEach(item => {
          if (item.hidden || item.style.display === "none") return; // Skip hidden items
          
          const isCustomAccordion = !item.tagName || item.tagName.toLowerCase() !== 'details';
          if (isCustomAccordion) {
            item.classList.add("is-open");
            const header = item.querySelector(".accordion-header");
            const panel = item.querySelector(".accordion-content");
            if (header) header.setAttribute("aria-expanded", "true");
            if (panel) panel.hidden = false;
          } else {
            item.open = true;
          }
        });
        expandAllBtn.setAttribute("aria-pressed", "true");
        if (collapseAllBtn) collapseAllBtn.setAttribute("aria-pressed", "false");
      });
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener("click", () => {
        faqItems.forEach(item => {
          if (item.hidden || item.style.display === "none") return;
          
          const isCustomAccordion = !item.tagName || item.tagName.toLowerCase() !== 'details';
          if (isCustomAccordion) {
            item.classList.remove("is-open");
            const header = item.querySelector(".accordion-header");
            const panel = item.querySelector(".accordion-content");
            if (header) header.setAttribute("aria-expanded", "false");
            if (panel) panel.hidden = true;
          } else {
            item.open = false;
          }
        });
        collapseAllBtn.setAttribute("aria-pressed", "true");
        if (expandAllBtn) expandAllBtn.setAttribute("aria-pressed", "false");
      });
    }
  });
})();
