document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const faqItems = Array.from(document.querySelectorAll(".faq-item"));
  const faqNavigation = document.querySelector(".faq-navigation");
  const searchInput = document.getElementById("faq-search");
  const clearSearchButton = document.getElementById("clear-search");
  const allSections = Array.from(document.querySelectorAll(".faq-section"));
  // Support both FAQ page structure and Home page structure
  const mainContent = document.querySelector(".main-content") || document.getElementById("faq-container")?.parentElement;
  const header = document.querySelector(".page-header");
  const expandAllBtn = document.getElementById("expand-all-faq");
  const collapseAllBtn = document.getElementById("collapse-all-faq");

  // اگر هیچ FAQی نداریم، ادامه نده
  if (!faqItems.length) {return;}

  // Utility: simple debounce helper
  function debounce(func, delay) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  // --- GA4 & Hotjar Event Tracking Integration ---

  // Track clicks on navigation links
  if (faqNavigation) {
    faqNavigation.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) {return;}
      const category = link.dataset.category || "unknown";

      if (typeof gtag === "function") {
        gtag("event", "faq_nav_click", {
          event_category: "FAQ Navigation",
          event_label: `Clicked category: ${category}`,
          value: 1,
        });
      }
      if (typeof hj === "function") {
        hj(
          "event",
          `faq_nav_clicked_category_${category.replace(/\s/g, "_").toLowerCase()}`
        );
      }
    });
  }

  // Track Clicks on Call-to-Action Buttons
  document.querySelectorAll(".button-link").forEach((button) => {
    button.addEventListener("click", () => {
      const ctaType = button.dataset.ctaType || "generic";
      if (typeof gtag === "function") {
        gtag("event", "faq_cta_click", {
          event_category: "FAQ Call to Action",
          event_label: `CTA Clicked: ${ctaType}`,
          value: 1,
        });
      }
      if (typeof hj === "function") {
        hj("event", `faq_cta_clicked_${ctaType}`);
      }
    });
  });

  // Track Clicks on Internal Text Links
  document.querySelectorAll(".faq-answer .text-link").forEach((link) => {
    link.addEventListener("click", () => {
      const linkType = link.dataset.linkType || "generic";
      if (typeof gtag === "function") {
        gtag("event", "faq_text_link_click", {
          event_category: "FAQ Internal Link",
          event_label: `Text link clicked: ${linkType}`,
          value: 1,
        });
      }
      if (typeof hj === "function") {
        hj("event", `faq_text_link_clicked_${linkType}`);
      }
    });
  });

  // --- FAQ Search Functionality (Cognitive Load Reduction - Information Foraging) ---

  if (searchInput) {
    // live region برای اعلام تعداد نتایج (برای اسکرین‌ریدر)
    let status = document.getElementById("faq-search-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "faq-search-status";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      status.className = "faq-search-status sr-only";
      (searchInput.closest("form") || searchInput.parentNode).appendChild(
        status
      );
    }

    if (clearSearchButton && !clearSearchButton.getAttribute("aria-label")) {
      clearSearchButton.setAttribute("aria-label", "پاک کردن جستجوی پرسش‌ها");
    }

    const updateStatus = (term, count) => {
      const total = faqItems.length;
      const trimmed = term.trim();
      const noResultsMsg = document.getElementById("faq-no-results");
      
      if (!trimmed) {
        status.textContent = `نمایش ${total} پرسش موجود.`;
        if(noResultsMsg) noResultsMsg.style.display = 'none';
      } else if (!count) {
        status.textContent = `هیچ نتیجه‌ای برای «${trimmed}» پیدا نشد.`;
        if(noResultsMsg) {
            noResultsMsg.style.display = 'block';
            noResultsMsg.textContent = `نتیجه‌ای برای «${trimmed}» یافت نشد. لطفاً کلمات کلیدی دیگری را امتحان کنید.`;
        }
      } else {
        status.textContent = `${count} نتیجه برای «${trimmed}» یافت شد.`;
        if(noResultsMsg) noResultsMsg.style.display = 'none';
      }
    };

    const handleSearch = () => {
      const rawTerm = searchInput.value || "";
      const searchTerm = rawTerm.trim().toLowerCase();

      if (clearSearchButton) {
        clearSearchButton.style.display = searchTerm ? "block" : "none";
      }

      let visibleItemsCount = 0;

      // Handle sections if they exist (FAQ page), otherwise just items (Home page)
      const containers = allSections.length ? allSections : [document.getElementById("faq-container") || document.body];

      containers.forEach((container) => {
        let sectionHasVisibleItems = false;
        const itemsInContainer = container.querySelectorAll(".faq-item");

        itemsInContainer.forEach((item) => {
          const headerBtn = item.querySelector(".accordion-header");
          const questionText = headerBtn
            ? headerBtn.textContent.toLowerCase()
            : "";
          const answerTextElement = item.querySelector(".faq-answer");
          const answerText = answerTextElement
            ? answerTextElement.textContent.toLowerCase()
            : "";
          const keywords = (item.dataset.keywords || "").toLowerCase();

          const matches =
            !searchTerm ||
            questionText.includes(searchTerm) ||
            answerText.includes(searchTerm) ||
            keywords.includes(searchTerm);

          if (matches) {
            item.style.display = ""; // Reset display
            sectionHasVisibleItems = true;
            visibleItemsCount++;

            // Highlight logic could go here

            // Open item if searching
            if (searchTerm && !item.classList.contains("is-open")) {
              toggleItem(item, true);
              item.dataset.openedBySearch = "true";
            }
          } else {
            item.style.display = "none";
            // Close if it was opened by search
            if (item.classList.contains("is-open") && item.dataset.openedBySearch) {
              toggleItem(item, false);
              delete item.dataset.openedBySearch;
            }
          }
        });

        if (container.classList.contains("faq-section")) {
            container.hidden = !sectionHasVisibleItems;
        }
      });

      // Track search event in GA4
      if (typeof gtag === "function" && searchTerm.length > 2) {
        gtag("event", "faq_search", {
          event_category: "FAQ Search",
          search_term: searchTerm,
          results_count: visibleItemsCount,
        });
      }
      
      updateStatus(searchTerm, visibleItemsCount);
    };

    const debouncedSearch = debounce(handleSearch, 200);
    searchInput.addEventListener("input", debouncedSearch);

    // ESC برای پاک کردن سریع سرچ
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        searchInput.value = "";
        if(clearSearchButton) clearSearchButton.style.display = "none";
        handleSearch();
      }
    });

    if (clearSearchButton) {
        clearSearchButton.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchButton.style.display = "none";

        faqItems.forEach((item) => {
            item.style.display = "";
            if (item.classList.contains("is-open") && item.dataset.openedBySearch) {
            toggleItem(item, false);
            delete item.dataset.openedBySearch;
            }
        });
        allSections.forEach((section) => {
            section.hidden = false;
        });

        updateStatus("", faqItems.length);
        searchInput.focus();
        });
    }
  }

  // --- Accordion Logic ---
  
  function toggleItem(item, forceOpen = null) {
      const headerBtn = item.querySelector(".accordion-header");
      const content = item.querySelector(".accordion-content");
      if (!headerBtn || !content) return;

      const isOpen = item.classList.contains("is-open");
      const shouldOpen = forceOpen !== null ? forceOpen : !isOpen;

      if (shouldOpen) {
          item.classList.add("is-open");
          headerBtn.setAttribute("aria-expanded", "true");
          content.style.maxHeight = content.scrollHeight + 50 + "px"; // Add buffer for padding
      } else {
          item.classList.remove("is-open");
          headerBtn.setAttribute("aria-expanded", "false");
          content.style.maxHeight = null;
      }
  }

  // Handle resize to adjust max-height of open items
  window.addEventListener('resize', debounce(() => {
      faqItems.forEach(item => {
          if (item.classList.contains("is-open")) {
              const content = item.querySelector(".accordion-content");
              if (content) {
                  content.style.maxHeight = content.scrollHeight + 50 + "px";
              }
          }
      });
  }, 200));

  // Event Delegation for Accordion Clicks
  const accordionContainer = document.getElementById("faq-container") || document.querySelector(".main-content");
  if (accordionContainer) {
      accordionContainer.addEventListener("click", (event) => {
          const headerBtn = event.target.closest(".accordion-header");
          if (!headerBtn) return;

          // Ignore clicks on interactive elements inside header (like copy link)
          if (event.target.closest(".copy-faq-link") || event.target.closest("a")) return;

          const item = headerBtn.closest(".accordion-item");
          if (!item) return;

          // Close others (Accordion behavior) - Optional, can be toggle behavior
          // faqItems.forEach(otherItem => {
          //     if (otherItem !== item && otherItem.classList.contains("is-open")) {
          //         toggleItem(otherItem, false);
          //     }
          // });

          toggleItem(item);
          
          // Analytics
          const questionId = item.dataset.questionId || "unknown";
          const action = item.classList.contains("is-open") ? "expand" : "collapse";
          if (typeof gtag === "function") {
              gtag("event", `faq_${action}`, {
                  event_category: "FAQ Interaction",
                  event_label: `Question ${action}ed: ${questionId}`,
              });
          }
      });

      // Keyboard support for accordion headers
      accordionContainer.addEventListener("keydown", (event) => {
          const headerBtn = event.target.closest(".accordion-header");
          if (!headerBtn) return;

          if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              // Trigger click logic
              headerBtn.click();
          }
      });
  }

  // Expand/Collapse All
  if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => {
          faqItems.forEach(item => {
              if (item.style.display !== "none") toggleItem(item, true);
          });
      });
  }

  if (collapseAllBtn) {
      collapseAllBtn.addEventListener("click", () => {
          faqItems.forEach(item => toggleItem(item, false));
      });
  }

  // Copy Link Functionality
  document.querySelectorAll(".copy-faq-link").forEach(btn => {
      btn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent accordion toggle
          const link = btn.dataset.link; // e.g. #faq-item-fa-1
          if (!link) return;
          
          const url = window.location.origin + window.location.pathname + link;
          navigator.clipboard.writeText(url).then(() => {
              const originalIcon = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-check"></i>';
              btn.classList.add("copied");
              setTimeout(() => {
                  btn.innerHTML = originalIcon;
                  btn.classList.remove("copied");
              }, 2000);
          });
      });
  });

  // Feedback Buttons
  document.querySelectorAll(".btn-feedback").forEach(btn => {
      btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const parent = btn.closest(".faq-feedback");
          parent.querySelectorAll(".btn-feedback").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          
          // Visual feedback
          const label = parent.querySelector(".feedback-label");
          if (label) {
              const originalText = "آیا این پاسخ مفید بود؟"; // Default text
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

          // Analytics
          if (typeof gtag === "function") {
              gtag("event", "faq_feedback", {
                  event_category: "FAQ Feedback",
                  event_label: btn.classList.contains("up") ? "helpful" : "not_helpful",
              });
          }
      });
  });

  // Check for hash on load to open specific FAQ
  if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const targetItem = document.getElementById(targetId);
      if (targetItem && targetItem.classList.contains("faq-item")) {
          setTimeout(() => {
              toggleItem(targetItem, true);
              targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
              // Add a temporary highlight effect
              targetItem.style.borderColor = "var(--faq-primary)";
              targetItem.style.boxShadow = "0 0 0 4px rgba(52, 152, 219, 0.2)";
              setTimeout(() => {
                  targetItem.style.borderColor = "";
                  targetItem.style.boxShadow = "";
              }, 2000);
          }, 500);
      }
  }

  // --- Page entry animation ---
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  if (!prefersReducedMotion && header) {
      // Simple fade in if not already handled by CSS
  }
});
