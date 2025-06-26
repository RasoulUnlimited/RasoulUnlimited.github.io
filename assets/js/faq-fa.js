document.addEventListener("DOMContentLoaded", () => {
  const faqItems = document.querySelectorAll(".faq-item");
  const faqNavigation = document.querySelector(".faq-navigation");
  const searchInput = document.getElementById("faq-search");
  const clearSearchButton = document.getElementById("clear-search");
  const allSections = document.querySelectorAll(".faq-section");

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
  // (Behavioral Data Analysis: Hotjar for heatmaps/recordings, GA4 for structured events)

  // Track clicks on navigation links
  if (faqNavigation) {
    faqNavigation.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const category = link.dataset.category;
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
          `faq_nav_clicked_category_${category
            .replace(/\s/g, "_")
            .toLowerCase()}`
        );
      }
    });
  }

  // Track Clicks on Call-to-Action Buttons
  document.querySelectorAll(".button-link").forEach((button) => {
    button.addEventListener("click", () => {
      const ctaType = button.dataset.ctaType;
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
      const linkType = link.dataset.linkType;
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
  const handleSearch = () => {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (searchTerm.length > 0) {
      clearSearchButton.style.display = "block";
    } else {
      clearSearchButton.style.display = "none";
    }

    let visibleItemsCount = 0;

    allSections.forEach((section) => {
      let sectionHasVisibleItems = false;
      const itemsInSection = section.querySelectorAll(".faq-item");

      itemsInSection.forEach((item) => {
        const questionText = item
          .querySelector("summary")
          .textContent.toLowerCase();
        const answerTextElement = item.querySelector(".faq-answer");
        const answerText = answerTextElement
          ? answerTextElement.textContent.toLowerCase()
          : "";
        const keywords = item.dataset.keywords
          ? item.dataset.keywords.toLowerCase()
          : "";

        if (
          questionText.includes(searchTerm) ||
          answerText.includes(searchTerm) ||
          keywords.includes(searchTerm)
        ) {
          item.style.display = "block";
          sectionHasVisibleItems = true;
          visibleItemsCount++;

          // If item is not open, and it was NOT opened by user previously, open it and mark it as opened by search
          if (!item.open && !item.hasAttribute("data-opened-by-user")) {
            item.open = true;
            item.setAttribute("data-opened-by-search", "true");
          }
        } else {
          item.style.display = "none";
          // If hiding, and it was opened by search, close it
          if (item.open && item.hasAttribute("data-opened-by-search")) {
            item.open = false;
            item.removeAttribute("data-opened-by-search");
          }
        }
      });

      // Show/hide sections based on whether they contain any visible FAQ items
      if (sectionHasVisibleItems) {
        section.style.display = "block";
      } else {
        section.style.display = "none";
      }
    });

    // Track search event in GA4
    if (typeof gtag === "function") {
      gtag("event", "faq_search", {
        event_category: "FAQ Search",
        search_term: searchTerm,
        results_count: visibleItemsCount,
      });
    }
    if (typeof hj === "function") {
      hj(
        "event",
        `faq_searched_${searchTerm.replace(/\s/g, "_").toLowerCase()}`
      );
    }
  };

  const debouncedSearch = debounce(handleSearch, 200);
  searchInput.addEventListener("input", debouncedSearch);

  clearSearchButton.addEventListener("click", () => {
    searchInput.value = ""; // Clear input
    clearSearchButton.style.display = "none"; // Hide clear button

    // Show all FAQ items and sections again and collapse items that were opened by search
    faqItems.forEach((item) => {
      item.style.display = "block";
      if (item.open && item.hasAttribute("data-opened-by-search")) {
        item.open = false;
        item.removeAttribute("data-opened-by-search");
      }
    });
    allSections.forEach((section) => {
      section.style.display = "block"; // Show all sections
    });

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
  });

  // --- Accordion Logic ---
  const faqContainer = document.querySelector(".main-content");

  if (faqContainer) {
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
      const questionId = item.dataset.questionId;
      const wasAlreadyOpen = item.open;

      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.open = false;
          otherItem.removeAttribute("data-opened-by-user");
        }
      });

      if (wasAlreadyOpen) {
        item.open = false;
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
        item.removeAttribute("data-opened-by-search");
        item.removeAttribute("data-opened-by-user");
      } else {
        item.open = true;

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
        item.setAttribute("data-opened-by-user", "true");
        item.removeAttribute("data-opened-by-search"); 
      }
    });
  }

  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    summary.addEventListener("focus", () => {
      summary.style.outline = `3px solid ${getComputedStyle(
        document.documentElement
      ).getPropertyValue("--primary-blue")}66`;
      summary.style.outlineOffset = "5px";
    });

    summary.addEventListener("blur", () => {
      summary.style.outline = "none";
      summary.style.outlineOffset = "0";
    });
  });

  // Implement a subtle page entry animation for immediate delight and professionalism
  // (Cognitive Psychology: Primacy Effect, Perceived Performance)
  const header = document.querySelector(".page-header");
  const mainContent = document.querySelector(".main-content");

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
});
