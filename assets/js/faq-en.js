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
            const answerContent = item.querySelector(".faq-answer");
            if (answerContent) {
              answerContent.style.maxHeight = answerContent.scrollHeight + "px";
              answerContent.style.paddingTop = "1.6rem";
              answerContent.style.paddingBottom = "2.8rem";
              answerContent.style.opacity = "1";
            }
          }
        } else {
          item.style.display = "none";
          // If hiding, and it was opened by search, close it
          if (item.open && item.hasAttribute("data-opened-by-search")) {
            item.open = false;
            const answerContent = item.querySelector(".faq-answer");
            if (answerContent) {
              answerContent.style.maxHeight = "0px";
              answerContent.style.paddingTop = "0";
              answerContent.style.paddingBottom = "0";
              answerContent.style.opacity = "0";
            }
            item.removeAttribute("data-opened-by-search"); // Remove the flag
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
      // Only close items that were opened by search, not manually opened ones
      if (item.open && item.hasAttribute("data-opened-by-search")) {
        item.open = false;
        const answerContent = item.querySelector(".faq-answer");
        if (answerContent) {
          answerContent.style.maxHeight = "0px";
          answerContent.style.paddingTop = "0";
          answerContent.style.paddingBottom = "0";
          answerContent.style.opacity = "0";
        }
        item.removeAttribute("data-opened-by-search"); // Remove the flag
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

  // --- Accordion Logic & Cognitive Psychology Principles ---
  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".faq-answer");
    const questionId = item.dataset.questionId;

    // Initial state for smooth animation
    if (answer) {
      // Ensure answer element exists
      answer.style.maxHeight = "0px";
      answer.style.overflow = "hidden";
      answer.style.transition =
        "max-height 0.4s var(--ease-bezier), padding 0.4s var(--ease-bezier), opacity 0.4s ease-out";
      answer.style.paddingTop = "0";
      answer.style.paddingBottom = "0";
      answer.style.opacity = "0";

      // Check initial open state (for cases where details is open on load or after search)
      if (item.open) {
        answer.style.maxHeight = answer.scrollHeight + "px";
        answer.style.paddingTop = "1.6rem";
        answer.style.paddingBottom = "2.8rem";
        answer.style.opacity = "1";
      }
    }

    summary.addEventListener("click", (event) => {
      // Prevent default toggle behavior if it's an interactive element inside summary (e.g., a link)
      if (event.target.tagName === "A") {
        event.preventDefault();
        window.location.href = event.target.href;
        return;
      }

      event.preventDefault(); // Prevent default details toggle

      const wasAlreadyOpen = item.open; // Check current state BEFORE toggling

      faqItems.forEach((otherItem) => {
        // Only close other items if they are currently open AND they were not opened by the search
        if (
          otherItem !== item &&
          otherItem.open &&
          !otherItem.hasAttribute("data-opened-by-search")
        ) {
          otherItem.open = false;
          otherItem.removeAttribute("data-opened-by-user"); // Remove the flag
          const otherAnswer = otherItem.querySelector(".faq-answer");
          if (otherAnswer) {
            // Ensure otherAnswer exists
            otherAnswer.style.maxHeight = "0px";
            otherAnswer.style.paddingTop = "0";
            otherAnswer.style.paddingBottom = "0";
            otherAnswer.style.opacity = "0";
          }
          // Track collapse of other items if they were opened by user
          if (typeof gtag === "function") {
            gtag("event", "faq_auto_collapse", {
              event_category: "FAQ Interaction",
              event_label: `Question auto-collapsed: ${otherItem.dataset.questionId}`,
              question_text: otherItem
                .querySelector("summary")
                .textContent.trim(),
            });
          }
          if (typeof hj === "function") {
            hj("event", `faq_auto_collapsed_${otherItem.dataset.questionId}`);
          }
        }
      });

      if (wasAlreadyOpen) {
        // If it was open and user clicked to close it
        if (answer) {
          answer.style.maxHeight = "0px";
          answer.style.paddingTop = "0";
          answer.style.paddingBottom = "0";
          answer.style.opacity = "0";
          setTimeout(() => {
            item.open = false;
          }, 400); // Match CSS transition duration
        } else {
          item.open = false; // Fallback if no answer element
        }

        // GA4 Event: Track FAQ collapse
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
        item.removeAttribute("data-opened-by-search"); // Reset flag if manually closed
        item.removeAttribute("data-opened-by-user"); // Reset flag if manually closed
      } else {
        // If it was closed and user clicked to open it
        item.open = true; // Set open immediately to apply summary styles
        if (answer) {
          answer.style.maxHeight = answer.scrollHeight + "px";
          answer.style.paddingTop = "1.6rem";
          answer.style.paddingBottom = "2.8rem";
          answer.style.opacity = "1";
        }

        // For accessibility and better UX, scroll to the opened item if it's off-screen
        setTimeout(() => {
          const rect = item.getBoundingClientRect();
          // Check if top is above viewport OR bottom is below viewport (partially or fully off screen)
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            item.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }, 450); // Delay slightly after animation starts

        // GA4 Event: Track FAQ expand
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
        // Mark this item as opened by user
        item.setAttribute("data-opened-by-user", "true");
        item.removeAttribute("data-opened-by-search"); // Ensure it's not marked as opened by search if user interacts
      }
    });

    // Add a visual indicator for keyboard focus (Cognitive Psychology: Affordance)
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
