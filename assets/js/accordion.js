// js/accordion.js
(function () {
  "use strict";

  /**
   * Initialize a single accordion container.
   * @param {HTMLElement} root
   */
  function initAccordion(root) {
    if (!root) return;

    const allowMultiple =
      root.getAttribute("data-allow-multiple") === "true" ||
      root.hasAttribute("data-allow-multiple");

    const items = Array.from(root.querySelectorAll(".accordion-item"));
    const headers = [];

    items.forEach((item, index) => {
      const header = item.querySelector(".accordion-header");
      const panel = item.querySelector(".accordion-content");

      if (!header || !panel) return;

      const headerId =
        header.id || `accordion-header-${root.dataset.accordionId || "main"}-${index}`;
      const panelId =
        panel.id || `accordion-panel-${root.dataset.accordionId || "main"}-${index}`;

      header.id = headerId;
      panel.id = panelId;

      // ARIA wiring
      header.setAttribute("role", "button");
      header.setAttribute("aria-controls", panelId);
      header.setAttribute("aria-expanded", "false");
      header.setAttribute("tabindex", "0");

      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", headerId);
      panel.hidden = true;

      // Click / keyboard handlers
      header.addEventListener("click", () => {
        toggleItem(item, allowMultiple);
      });

      header.addEventListener("keydown", (e) => {
        const key = e.key;

        if (key === "Enter" || key === " ") {
          e.preventDefault();
          toggleItem(item, allowMultiple);
          return;
        }

        const currentIndex = headers.indexOf(header);
        if (currentIndex === -1) return;

        if (key === "ArrowDown") {
          e.preventDefault();
          const next = headers[currentIndex + 1] || headers[0];
          next.focus();
        } else if (key === "ArrowUp") {
          e.preventDefault();
          const prev = headers[currentIndex - 1] || headers[headers.length - 1];
          prev.focus();
        } else if (key === "Home") {
          e.preventDefault();
          headers[0].focus();
        } else if (key === "End") {
          e.preventDefault();
          headers[headers.length - 1].focus();
        }
      });

      headers.push(header);
    });

    /**
     * Toggle one accordion item
     * @param {HTMLElement} item
     * @param {boolean} allowMultiple
     */
    function toggleItem(item, allowMultiple) {
      const header = item.querySelector(".accordion-header");
      const panel = item.querySelector(".accordion-content");
      if (!header || !panel) return;

      const isExpanded = header.getAttribute("aria-expanded") === "true";

      if (!allowMultiple) {
        items.forEach((otherItem) => {
          if (otherItem === item) return;
          collapseItem(otherItem);
        });
      }

      if (isExpanded) {
        collapseItem(item);
      } else {
        expandItem(item);
      }
    }

    /**
     * Collapse item
     * @param {HTMLElement} item
     */
    function collapseItem(item) {
      const header = item.querySelector(".accordion-header");
      const panel = item.querySelector(".accordion-content");
      if (!header || !panel) return;

      header.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      item.classList.remove("is-open");
    }

    /**
     * Expand item
     * @param {HTMLElement} item
     */
    function expandItem(item) {
      const header = item.querySelector(".accordion-header");
      const panel = item.querySelector(".accordion-content");
      if (!header || !panel) return;

      header.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      item.classList.add("is-open");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const accordions = document.querySelectorAll(".accordion");
    accordions.forEach((acc, index) => {
      if (!acc.dataset.accordionId) {
        acc.dataset.accordionId = String(index + 1);
      }
      initAccordion(acc);
    });
  });
})();
