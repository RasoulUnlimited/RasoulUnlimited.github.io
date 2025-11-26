// js/accordion.js
(function () {
  "use strict";

  /**
   * @typedef {Object} AccordionItemRefs
   * @property {HTMLElement} item
   * @property {HTMLElement} header
   * @property {HTMLElement} panel
   */

  /**
   * Initialize a single accordion container.
   * @param {HTMLElement} root
   */
  function initAccordion(root) {
    if (!root) return;

    const accordionId = root.dataset.accordionId || "main";

    const allowMultiple =
      root.getAttribute("data-allow-multiple") === "true" ||
      root.hasAttribute("data-allow-multiple");

    const allowToggle =
      root.getAttribute("data-allow-toggle") !== "false"; // اگر false ست شود، آخرین باز را نمی‌بندد

    /** @type {AccordionItemRefs[]} */
    const itemRefs = [];
    /** @type {HTMLElement[]} */
    const headers = [];

    const reduceMotion =
      !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const items = Array.from(root.querySelectorAll(".accordion-item"));

    if (!items.length) return;

    // --- First pass: setup ARIA / state ---
    items.forEach((item, index) => {
      const header = /** @type {HTMLElement|null} */ (
        item.querySelector(".accordion-header")
      );
      const panel = /** @type {HTMLElement|null} */ (
        item.querySelector(".accordion-content")
      );

      if (!header || !panel) return;

      const headerId = header.id || `accordion-header-${accordionId}-${index}`;
      const panelId = panel.id || `accordion-panel-${accordionId}-${index}`;

      header.id = headerId;
      panel.id = panelId;

      const initiallyOpen =
        item.classList.contains("is-open") || item.hasAttribute("data-open");

      // ARIA wiring
      header.setAttribute("role", "button");
      header.setAttribute("aria-controls", panelId);
      header.setAttribute("aria-expanded", initiallyOpen ? "true" : "false");
      header.setAttribute("tabindex", "0");

      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", headerId);

      if (initiallyOpen) {
        item.classList.add("is-open");
        panel.style.maxHeight = "none";
        panel.style.opacity = "1";
      } else {
        item.classList.remove("is-open");
        panel.style.maxHeight = null;
        panel.style.opacity = "0";
      }

      headers.push(header);
      itemRefs.push({ item, header, panel });
    });

    if (!itemRefs.length) return;

    // --- Helpers ---

    /**
     * Dispatch a custom event from an item.
     * @param {HTMLElement} item
     * @param {string} type
     * @param {string} accordionId
     */
    function dispatchAccordionEvent(item, type, accordionId) {
      item.dispatchEvent(
        new CustomEvent(type, {
          bubbles: true,
          detail: { item, accordionId },
        })
      );
    }

    /**
     * Collapse a single item.
     * @param {AccordionItemRefs} ref
     */
    function collapseItem(ref) {
      const { item, header, panel } = ref;
      if (!header || !panel) return;

      header.setAttribute("aria-expanded", "false");
      item.classList.remove("is-open");

      if (reduceMotion) {
        panel.style.maxHeight = null;
        panel.style.opacity = "0";
      } else {
        // اگر max-height = "none" بود، اول height فعلی رو ست می‌کنیم برای transition
        if (panel.style.maxHeight === "none") {
          panel.style.maxHeight = panel.scrollHeight + "px";
          // Force reflow
          void panel.offsetHeight;
        }

        requestAnimationFrame(() => {
          panel.style.maxHeight = null;
          panel.style.opacity = "0";
        });
      }

      dispatchAccordionEvent(item, "accordion:collapse", accordionId);
    }

    /**
     * Expand a single item.
     * @param {AccordionItemRefs} ref
     */
    function expandItem(ref) {
      const { item, header, panel } = ref;
      if (!header || !panel) return;

      header.setAttribute("aria-expanded", "true");
      item.classList.add("is-open");

      if (reduceMotion) {
        panel.style.maxHeight = "none";
        panel.style.opacity = "1";
      } else {
        // ابتدا max-height را به ارتفاع واقعی تنظیم می‌کنیم
        panel.style.maxHeight = panel.scrollHeight + "px";
        panel.style.opacity = "1";

        const onTransitionEnd = (e) => {
          if (e.propertyName === "max-height") {
            // برای اینکه بعداً با تغییر محتوا به‌راحتی ریسایز شود
            panel.style.maxHeight = "none";
            panel.removeEventListener("transitionend", onTransitionEnd);
          }
        };

        panel.addEventListener("transitionend", onTransitionEnd);
      }

      dispatchAccordionEvent(item, "accordion:expand", accordionId);
    }

    /**
     * Toggle one accordion item
     * @param {AccordionItemRefs} ref
     */
    function toggleItem(ref) {
      const { item, header } = ref;
      const isExpanded = header.getAttribute("aria-expanded") === "true";

      // اگر تنها آیتم باز است و اجازه‌ی toggle نداریم، هیچی نکن
      if (!allowMultiple && !allowToggle && isExpanded) {
        return;
      }

      if (!allowMultiple) {
        itemRefs.forEach((otherRef) => {
          if (otherRef.item === item) return;
          const otherExpanded =
            otherRef.header.getAttribute("aria-expanded") === "true";
          if (otherExpanded) {
            collapseItem(otherRef);
          }
        });
      }

      if (isExpanded) {
        collapseItem(ref);
      } else {
        expandItem(ref);
      }
    }

    // --- Events: click + keyboard ---

    itemRefs.forEach((ref) => {
      const { header } = ref;

      // Click handler
      header.addEventListener("click", () => {
        if (header.hasAttribute("aria-disabled")) return;
        toggleItem(ref);
      });

      // Keyboard handler
      header.addEventListener("keydown", (e) => {
        const key = e.key;

        if (header.hasAttribute("aria-disabled")) return;

        if (key === "Enter" || key === " ") {
          e.preventDefault();
          toggleItem(ref);
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
    });
  }

  // Auto-init on DOMContentLoaded
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
