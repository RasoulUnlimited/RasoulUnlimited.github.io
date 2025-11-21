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

    // Live region for announcing search results (a11y)
    let status = document.getElementById("faq-search-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "faq-search-status";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      status.className = "faq-search-status sr-only";
      (searchInput.closest("form") || searchInput.parentNode).appendChild(status);
    }

    // Ensure clear button has accessible label
    if (!clearButton.getAttribute("aria-label")) {
      clearButton.setAttribute("aria-label", "پاک کردن جستجو");
    }

    let debounceTimer;
    // Store original content to restore after search clears
    const originalContent = new Map();

    faqItems.forEach(item => {
      const summary = item.querySelector(".accordion-header h3") || item.querySelector("summary");
      const answer = item.querySelector(".accordion-content") || item.querySelector(".faq-answer");
      if (summary) originalContent.set(summary, summary.innerHTML);
      if (answer) originalContent.set(answer, answer.innerHTML);
    });

    function updateStatus(term, visibleCount) {
      const total = faqItems.length;
      const trimmed = term.trim();

      if (!trimmed) {
        status.textContent = `نمایش همه ${total} سوال.`;
        return;
      }
      status.textContent =
        visibleCount === 0
          ? `نتیجه‌ای برای «${trimmed}» یافت نشد.`
          : `${visibleCount} نتیجه برای «${trimmed}» پیدا شد.`;
    }

    // Helper to highlight text safely
    function highlightText(element, term) {
      if (!element) return;
      
      // Always restore original first to avoid nested spans
      if (originalContent.has(element)) {
        element.innerHTML = originalContent.get(element);
      }

      if (!term) return;
      
      const text = element.innerHTML;
      // Simple regex for text content - be careful with HTML tags
      // This is a simple implementation. For robust highlighting in HTML, a tree walker is better.
      // But for this specific use case (h3 and p), simple replacement is usually acceptable if no complex nested tags.
      
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      
      // Only replace text nodes ideally, but innerHTML replace is faster for simple content
      // We use a negative lookahead to avoid replacing inside HTML tags (attributes)
      const newHtml = text.replace(new RegExp(`(?![^<]+>)(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight-term">$1</span>');
      
      element.innerHTML = newHtml;
    }

    function filterFaq(term) {
      const rawTerm = term !== undefined ? term : searchInput.value;
      const searchTerm = (rawTerm || "").trim().toLowerCase();
      const hasTerm = searchTerm.length > 0;

      let visibleCount = 0;

      faqItems.forEach((item) => {
        // Support both <details>/<summary> and custom .accordion-item structure
        const summaryEl = item.querySelector(".accordion-header h3") || item.querySelector("summary");
        const answerEl = item.querySelector(".accordion-content") || item.querySelector(".faq-answer");
        
        // For custom accordion, the header button is the summary
        const isCustomAccordion = !item.tagName || item.tagName.toLowerCase() !== 'details';

        const questionText = summaryEl ? summaryEl.textContent.toLowerCase() : "";
        const answerText = answerEl ? answerEl.textContent.toLowerCase() : "";
        const keywords = (item.dataset.keywords || "").toLowerCase();

        const matches =
          !hasTerm ||
          questionText.includes(searchTerm) ||
          answerText.includes(searchTerm) ||
          keywords.includes(searchTerm);

        if (matches) {
          item.hidden = false;
          item.style.display = ""; // Reset display property
          visibleCount++;

          // Highlight terms
          if (summaryEl) highlightText(summaryEl, hasTerm ? searchTerm : null);
          if (answerEl) highlightText(answerEl, hasTerm ? searchTerm : null);

          // Open item if searching
          if (hasTerm) {
            if (isCustomAccordion) {
                if (!item.classList.contains("is-open")) {
                    item.classList.add("is-open");
                    const header = item.querySelector(".accordion-header");
                    if (header) header.setAttribute("aria-expanded", "true");
                    item.dataset.openedBySearch = "true";
                    // Ensure content is visible (handled by CSS usually, but explicit doesn't hurt)
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

    // ESC to clear
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        searchInput.value = "";
        filterFaq();
        searchInput.focus();
      }
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

    // --- New Features Logic ---

    // 1. Copy Link Functionality
    document.querySelectorAll('.copy-faq-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent accordion toggle
        const link = btn.dataset.link;
        if (!link) return;

        const url = window.location.origin + window.location.pathname + link;
        
        navigator.clipboard.writeText(url).then(() => {
          // Visual feedback
          const originalIcon = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i>';
          btn.style.color = '#2ecc71';
          
          // Show toast if available
          if (window.createToast) {
            window.createToast('لینک کپی شد!');
          }

          setTimeout(() => {
            btn.innerHTML = originalIcon;
            btn.style.color = '';
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy: ', err);
        });
      });
    });

    // 2. Feedback Functionality
    document.querySelectorAll('.btn-feedback').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.closest('.faq-feedback');
        
        // Remove active class from siblings
        parent.querySelectorAll('.btn-feedback').forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Optional: Send analytics event here
        const isUp = btn.classList.contains('up');
        const questionId = btn.closest('.faq-item').id;
        console.log(`Feedback for ${questionId}: ${isUp ? 'Positive' : 'Negative'}`);
        
        if (window.createToast) {
          window.createToast('بازخورد شما ثبت شد. ممنون!');
        }
      });
    });

    // 3. Handle Hash Navigation
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const targetItem = document.getElementById(targetId);
      if (targetItem && targetItem.classList.contains('faq-item')) {
        setTimeout(() => {
          // Open the item
          const isCustomAccordion = !targetItem.tagName || targetItem.tagName.toLowerCase() !== 'details';
          if (isCustomAccordion) {
            targetItem.classList.add("is-open");
            const header = targetItem.querySelector(".accordion-header");
            const panel = targetItem.querySelector(".accordion-content");
            if (header) header.setAttribute("aria-expanded", "true");
            if (panel) panel.hidden = false;
          } else {
            targetItem.open = true;
          }
          
          // Scroll to it
          targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight effect
          targetItem.style.transition = 'background-color 0.5s';
          const originalBg = targetItem.style.backgroundColor;
          targetItem.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
          setTimeout(() => {
            targetItem.style.backgroundColor = originalBg;
          }, 1500);
        }, 500); // Delay to ensure page load
      }
    }

  });
})();
