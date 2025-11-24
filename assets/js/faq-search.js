// Minimal FAQ search functionality for home pages
// Derived from assets/js/faq-fa.js without analytics or extras

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // Toast fallback
    if (typeof window.createToast !== 'function') {
      window.createToast = function(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.3s;
          font-family: inherit;
          font-size: 0.9rem;
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.style.opacity = '1');
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      };
    }

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
      
      // Use TreeWalker for safe highlighting
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      const nodesToReplace = [];
      // Escape regex special characters in term
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, "gi");

      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeValue && regex.test(node.nodeValue)) {
          nodesToReplace.push(node);
        }
      }

      nodesToReplace.forEach(node => {
        const fragment = document.createDocumentFragment();
        const parts = node.nodeValue.split(regex);
        
        parts.forEach((part, index) => {
          if (index % 2 === 1) { // Matched part
            const span = document.createElement("span");
            span.className = "highlight-term";
            span.textContent = part;
            fragment.appendChild(span);
          } else if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
        });
        
        node.parentNode.replaceChild(fragment, node);
      });
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
                    // Ensure content is visible
                    if (answerEl) {
                        answerEl.style.maxHeight = answerEl.scrollHeight + 50 + "px";
                        answerEl.style.opacity = "1";
                    }
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
                if (answerEl) {
                    answerEl.style.maxHeight = null;
                    answerEl.style.opacity = "0";
                }
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
            if (panel) {
                panel.style.maxHeight = (panel.scrollHeight + 500) + "px";
                panel.style.opacity = "1";
            }
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
            if (panel) {
                panel.style.maxHeight = null;
                panel.style.opacity = "0";
            }
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
    // Restore feedback state
    document.querySelectorAll('.faq-item').forEach(item => {
        const id = item.id;
        const storedFeedback = localStorage.getItem(`faq-feedback-${id}`);
        if (storedFeedback) {
            const btn = item.querySelector(`.btn-feedback.${storedFeedback}`);
            if (btn) btn.classList.add('active');
        }
    });

    document.querySelectorAll('.btn-feedback').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.closest('.faq-feedback');
        const item = btn.closest('.faq-item');
        const id = item.id;
        
        // Remove active class from siblings
        parent.querySelectorAll('.btn-feedback').forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        const isUp = btn.classList.contains('up');
        localStorage.setItem(`faq-feedback-${id}`, isUp ? 'up' : 'down');
        
        // Visual feedback
        const label = parent.querySelector(".feedback-label");
        if (label) {
            const originalText = "آیا این پاسخ مفید بود؟";
            label.textContent = "بازخورد شما ثبت شد. ممنون!";
            label.style.color = "#27ae60";
            label.style.fontWeight = "bold";
            
            setTimeout(() => {
                label.textContent = originalText;
                label.style.color = "";
                label.style.fontWeight = "";
                btn.classList.remove("active");
            }, 3000);
        }
        
        // Optional: Send analytics event here
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
            if (panel) {
                panel.style.maxHeight = (panel.scrollHeight + 500) + "px";
                panel.style.opacity = "1";
            }
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
