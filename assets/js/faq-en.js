document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const faqItems = Array.from(document.querySelectorAll(".faq-item"));
  const faqNavigation = document.querySelector(".faq-navigation");
  const searchInput = document.getElementById("faq-search");
  const clearSearchButton = document.getElementById("clear-search");
  const allSections = Array.from(document.querySelectorAll(".faq-section"));
  const faqContainer = document.querySelector(".main-content");
  const header = document.querySelector(".page-header");
  const mainContent = document.querySelector(".main-content");

  // اگر کلاً FAQ نداریم، ادامه دادن لازم نیست
  if (!faqItems.length && !header && !mainContent) return;

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
      if (!link) return;
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
  if (searchInput && clearSearchButton && allSections.length) {
    // live region برای اعلام نتایج سرچ
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

    if (!clearSearchButton.getAttribute("aria-label")) {
      clearSearchButton.setAttribute("aria-label", "Clear FAQ search");
    }

    const updateStatus = (term, count) => {
      const total = faqItems.length;
      const trimmed = term.trim();
      if (!trimmed) {
        status.textContent = `Showing all ${total} questions.`;
      } else if (!count) {
        status.textContent = `No results found for “${trimmed}”.`;
      } else {
        status.textContent = `${count} result${
          count === 1 ? "" : "s"
        } found for “${trimmed}”.`;
      }
    };

    const handleSearch = () => {
      const rawTerm = searchInput.value || "";
      const searchTerm = rawTerm.trim().toLowerCase();
      clearSearchButton.style.display = searchTerm ? "block" : "none";

      let visibleItemsCount = 0;

      allSections.forEach((section) => {
        let sectionHasVisibleItems = false;
        const itemsInSection = section.querySelectorAll(".faq-item");

        itemsInSection.forEach((item) => {
          const summary = item.querySelector("summary");
          const questionText = summary
            ? summary.textContent.toLowerCase()
            : "";
          const answerEl = item.querySelector(".faq-answer");
          const answerText = answerEl ? answerEl.textContent.toLowerCase() : "";
          const keywords = (item.dataset.keywords || "").toLowerCase();

          const matches =
            !searchTerm ||
            questionText.includes(searchTerm) ||
            answerText.includes(searchTerm) ||
            keywords.includes(searchTerm);

          if (matches) {
            item.hidden = false;
            sectionHasVisibleItems = true;
            visibleItemsCount++;

            // اگر سرچ فعال است و آیتم توسط یوزر باز نشده، با سرچ بازش کن
            if (searchTerm && !item.open && !item.dataset.openedByUser) {
              item.open = true;
              item.dataset.openedBySearch = "true";
              if (summary) summary.setAttribute("aria-expanded", "true");
            }
          } else {
            item.hidden = true;
            // اگر با سرچ باز شده بود، الان که می‌ره بیرون نتیجه، ببندش
            if (item.open && item.dataset.openedBySearch) {
              item.open = false;
              delete item.dataset.openedBySearch;
              if (summary) summary.setAttribute("aria-expanded", "false");
            }
          }
        });

        section.hidden = !sectionHasVisibleItems;
      });

      // Track search event in GA4
      if (typeof gtag === "function") {
        gtag("event", "faq_search", {
          event_category: "FAQ Search",
          search_term: searchTerm,
          results_count: visibleItemsCount,
        });
      }
      if (typeof hj === "function" && searchTerm) {
        hj(
          "event",
          `faq_searched_${searchTerm.replace(/\s/g, "_").toLowerCase()}`
        );
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
        clearSearchButton.style.display = "none";
        handleSearch();
      }
    });

    clearSearchButton.addEventListener("click", () => {
      searchInput.value = "";
      clearSearchButton.style.display = "none";

      // Show all FAQ items and sections again and collapse items that were opened by search
      faqItems.forEach((item) => {
        item.hidden = false;
        if (item.open && item.dataset.openedBySearch) {
          item.open = false;
          delete item.dataset.openedBySearch;
        }
        const summary = item.querySelector("summary");
        if (summary) {
          summary.setAttribute("aria-expanded", item.open ? "true" : "false");
        }
      });
      allSections.forEach((section) => {
        section.hidden = false;
      });

      updateStatus("", faqItems.length);

      // Track clear search event in GA4
      if (typeof gtag === "function") {
        gtag("event", "faq_search_cleared", {
          event_category: "FAQ Search",
          event_label: "Search input cleared",
        });
      }
      if (typeof hj === "function") {
        hj("event", "faq_search_cleared");
      }

      searchInput.focus();
    });

    // وضعیت اولیه
    clearSearchButton.style.display = "none";
    updateStatus("", faqItems.length);
  }

  // --- Accordion Logic ---
  if (faqContainer && faqItems.length) {
    faqContainer.addEventListener("click", (event) => {
      const summary = event.target.closest(".faq-item summary");
      if (!summary) return;

      if (event.target.tagName === "A") {
        event.preventDefault();
        window.location.href = event.target.href;
        return;
      }

      event.preventDefault();

      const item = summary.parentElement;
      const questionId = item.dataset.questionId || "unknown";
      const wasAlreadyOpen = item.open;

      // بستن بقیه
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.open = false;
          delete otherItem.dataset.openedByUser;
          delete otherItem.dataset.openedBySearch;
          const otherSummary = otherItem.querySelector("summary");
          if (otherSummary) {
            otherSummary.setAttribute("aria-expanded", "false");
          }
        }
      });

      if (wasAlreadyOpen) {
        item.open = false;
        summary.setAttribute("aria-expanded", "false");

        if (typeof gtag === "function") {
          gtag("event", "faq_collapse", {
            event_category: "FAQ Interaction",
            event_label: `Question collapsed: ${questionId}`,
            question_text: summary.textContent.trim(),
          });
        }
        if (typeof hj === "function") {
          hj("event", `faq_collapsed_${questionId}`);
        }
        delete item.dataset.openedBySearch;
        delete item.dataset.openedByUser;
      } else {
        item.open = true;
        summary.setAttribute("aria-expanded", "true");
        item.dataset.openedByUser = "true";
        delete item.dataset.openedBySearch;

        setTimeout(() => {
          const rect = item.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            item.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }, 450);

        if (typeof gtag === "function") {
          gtag("event", "faq_expand", {
            event_category: "FAQ Interaction",
            event_label: `Question expanded: ${questionId}`,
            question_text: summary.textContent.trim(),
          });
        }
        if (typeof hj === "function") {
          hj("event", `faq_expanded_${questionId}`);
        }
      }
    });
  }

  // Focus outlines + aria-expanded initial sync
  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    if (!summary) return;

    // sync aria-expanded on load
    summary.setAttribute("aria-expanded", item.open ? "true" : "false");

    summary.addEventListener("focus", () => {
      const primary =
        getComputedStyle(document.documentElement).getPropertyValue(
          "--primary-blue"
        ) || "#007bff";
      summary.style.outline = `3px solid ${primary.trim()}66`;
      summary.style.outlineOffset = "5px";
    });

    summary.addEventListener("blur", () => {
      summary.style.outline = "none";
      summary.style.outlineOffset = "0";
    });
  });

  // --- Page entry animation (Primacy Effect) با احترام به prefers-reduced-motion ---
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  if (!prefersReducedMotion) {
    if (header) {
      header.style.opacity = "0";
      header.style.transform = "translateY(-20px)";
      setTimeout(() => {
        header.style.transition = "opacity 1s ease-out, transform 1s ease-out";
        header.style.opacity = "1";
        header.style.transform = "translateY(0)";
      }, 100);
    }

    if (mainContent) {
      mainContent.style.opacity = "0";
      mainContent.style.transform = "translateY(20px)";
      setTimeout(() => {
        mainContent.style.transition =
          "opacity 1s ease-out, transform 1s ease-out";
        mainContent.style.opacity = "1";
        mainContent.style.transform = "translateY(0)";
      }, 300);
    }
  }
});
