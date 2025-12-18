// js/accordion.js
(function () {
  "use strict";

  // اگر در محیطی مثل SSR/Node اجرا شد، هیچ کاری نکنیم
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  /**
   * @typedef {Object} AccordionItemRefs
   * @property {HTMLElement} item
   * @property {HTMLElement} header
   * @property {HTMLElement} panel
   */

  /**
   * @typedef {Object} AccordionRecord
   * @property {HTMLElement} root
   * @property {AccordionItemRefs[]} itemRefs
   * @property {boolean} allowMultiple
   * @property {boolean} allowToggle
   * @property {(ref: AccordionItemRefs) => void} expandItem
   * @property {(ref: AccordionItemRefs) => void} collapseItem
   * @property {(ref: AccordionItemRefs) => void} toggleItem
   * @property {(ref: AccordionItemRefs) => boolean} isItemExpanded
   */

  /** @type {Map<string, AccordionRecord>} */
  const ACCORDION_REGISTRY = new Map();
  const ACCORDION_ATTR = "accordionId";

  // ترجیح کاربر برای کاهش انیمیشن + گوش دادن به تغییرات سیستم
  let PREFERS_REDUCED_MOTION = false;
  const motionQuery =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)");

  if (motionQuery) {
    PREFERS_REDUCED_MOTION = motionQuery.matches;
    const motionListener = (e) => {
      PREFERS_REDUCED_MOTION = Boolean(e.matches);
    };

    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", motionListener);
    } else if (typeof motionQuery.addListener === "function") {
      // برای مرورگرهای قدیمی‌تر
      motionQuery.addListener(motionListener);
    }
  }

  /**
   * سازنده‌ی امن CustomEvent برای مرورگرهای قدیمی‌تر
   * @param {string} type
   * @param {any} detail
   * @returns {CustomEvent}
   */
  function createAccordionEvent(type, detail) {
    if (typeof window.CustomEvent === "function") {
      return new CustomEvent(type, {
        bubbles: true,
        detail,
      });
    }
    const evt = document.createEvent("CustomEvent");
    evt.initCustomEvent(type, true, false, detail);
    return evt;
  }

  // NOTE: JS-driven transition timing helpers were removed to keep the
  // accordion CSP-safe (no inline style manipulation).

  /**
   * Initialize a single accordion container.
   * @param {HTMLElement} root
   */
  function initAccordion(root) {
    if (!root) {return;}

    // جلوگیری از دوباره‌سازی
    if (root.dataset.accordionInitialized === "true") {
      return;
    }

    const accordionId = root.dataset[ACCORDION_ATTR] || "main";

    const allowMultiple =
      root.getAttribute("data-allow-multiple") === "true" ||
      root.hasAttribute("data-allow-multiple");

    const allowToggle =
      root.getAttribute("data-allow-toggle") !== "false"; // اگر false باشد، حداقل یک آیتم همیشه باز می‌ماند

    /** @type {AccordionItemRefs[]} */
    const itemRefs = [];
    /** @type {HTMLElement[]} */
    const headers = [];

    const reduceMotion = PREFERS_REDUCED_MOTION;

    const items = Array.from(root.querySelectorAll(".accordion-item"));
    if (!items.length) {
      root.dataset.accordionInitialized = "true";
      return;
    }

    // NOTE: we used to use JS transition hooks here, but the site runs with a
    // strict Content-Security-Policy and we avoid inline style manipulation.

    /**
     * Dispatch a custom event from an item.
     * @param {HTMLElement} item
     * @param {string} type
     */
    function dispatchAccordionEvent(item, type) {
      if (!item) {return;}
      const event = createAccordionEvent(type, { item, accordionId });
      item.dispatchEvent(event);
    }

    /**
     * Check if an item is expanded.
     * @param {AccordionItemRefs} ref
     * @returns {boolean}
     */
    function isItemExpanded(ref) {
      return ref.header.getAttribute("aria-expanded") === "true";
    }

    /**
     * تعداد آیتم‌های باز در این آکاردئون.
     * @returns {number}
     */
    function getExpandedCount() {
      return itemRefs.reduce(
        (count, ref) => (isItemExpanded(ref) ? count + 1 : count),
        0
      );
    }

    /**
     * تنظیم وضعیت ARIA و کلاس is-open
     * @param {AccordionItemRefs} ref
     * @param {boolean} expanded
     */
    function setExpandedState(ref, expanded) {
      const { item, header, panel } = ref;
      header.setAttribute("aria-expanded", expanded ? "true" : "false");
      panel.setAttribute("aria-hidden", expanded ? "false" : "true");
      item.classList.toggle("is-open", expanded);
      panel.hidden = !expanded;
    }

    /**
     * برای حالت بدون انیمیشن (reduceMotion = true)
     * @param {AccordionItemRefs} ref
     * @param {boolean} expanded
     */
    function applyInstantState(ref, expanded) {
      const { panel } = ref;
      setExpandedState(ref, expanded);
      if (!panel) {return;}

      // CSP note: avoid inline styles (panel.style.*) because strict policies
      // may block style attributes. We rely on CSS rules driven by aria-expanded
      // and the `.is-open` class.
      panel.hidden = !expanded;
    }

    // --- First pass: setup ARIA / state ---
    items.forEach((item, index) => {
      const header = /** @type {HTMLElement|null} */ (
        item.querySelector(".accordion-header")
      );
      const panel = /** @type {HTMLElement|null} */ (
        item.querySelector(".accordion-content")
      );

      if (!header || !panel) {return;}

      const headerId = header.id || `accordion-header-${accordionId}-${index}`;
      const panelId = panel.id || `accordion-panel-${accordionId}-${index}`;

      header.id = headerId;
      panel.id = panelId;

      const initiallyOpen =
        item.classList.contains("is-open") || item.hasAttribute("data-open");

      // ARIA wiring
      header.setAttribute("role", "button");
      header.setAttribute("aria-controls", panelId);
      header.setAttribute("tabindex", "0");

      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", headerId);

      if (reduceMotion) {
        applyInstantState({ item, header, panel }, initiallyOpen);
      } else {
        setExpandedState({ item, header, panel }, initiallyOpen);
      }

      headers.push(header);
      itemRefs.push({ item, header, panel });
    });

    if (!itemRefs.length) {
      root.dataset.accordionInitialized = "true";
      return;
    }

    // اگر اجازه‌ی toggle نداریم، مطمئن شو حداقل یک آیتم از ابتدا باز است
    if (!allowToggle) {
      const hasOpen = itemRefs.some((ref) => isItemExpanded(ref));
      if (!hasOpen && itemRefs[0]) {
        const ref = itemRefs[0];
        if (reduceMotion) {
          applyInstantState(ref, true);
        } else {
          setExpandedState(ref, true);
        }
      }
    }

    /**
     * Collapse a single item.
     * @param {AccordionItemRefs} ref
     */
    function collapseItem(ref) {
      const { panel } = ref;
      if (!panel) {return;}

      if (reduceMotion) {
        applyInstantState(ref, false);
      } else {
        setExpandedState(ref, false);

        // CSP-safe behavior: skip JS-driven height/opacity transitions.
        // Hide immediately; CSS handles animation where possible.
        panel.hidden = true;
      }

      dispatchAccordionEvent(ref.item, "accordion:collapse");
    }

    /**
     * Expand a single item.
     * @param {AccordionItemRefs} ref
     */
    function expandItem(ref) {
      const { panel } = ref;
      if (!panel) {return;}

      if (reduceMotion) {
        applyInstantState(ref, true);
      } else {
        setExpandedState(ref, true);

        // show panel; CSS (accordion.css) expands content via `.is-open`
        panel.hidden = false;
      }

      dispatchAccordionEvent(ref.item, "accordion:expand");
    }

    /**
     * Toggle one accordion item
     * @param {AccordionItemRefs} ref
     */
    function toggleItem(ref) {
      const { item } = ref;
      const currentlyExpanded = isItemExpanded(ref);

      // اگر اجازه‌ی toggle نداریم و این تنها آیتم باز است، نبندش
      if (!allowToggle && currentlyExpanded && getExpandedCount() <= 1) {
        return;
      }

      if (!allowMultiple) {
        itemRefs.forEach((otherRef) => {
          if (otherRef.item === item) {return;}
          if (isItemExpanded(otherRef)) {
            collapseItem(otherRef);
          }
        });
      }

      if (currentlyExpanded) {
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
        if (header.hasAttribute("aria-disabled")) {return;}
        toggleItem(ref);
      });

      // Keyboard handler
      header.addEventListener("keydown", (e) => {
        const key = e.key;

        if (header.hasAttribute("aria-disabled")) {return;}

        if (key === "Enter" || key === " ") {
          e.preventDefault();
          toggleItem(ref);
          return;
        }

        const currentIndex = headers.indexOf(header);
        if (currentIndex === -1) {return;}

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

    // ثبت در رجیستری برای استفاده‌ی API بیرونی
    ACCORDION_REGISTRY.set(accordionId, {
      root,
      itemRefs,
      allowMultiple,
      allowToggle,
      expandItem,
      collapseItem,
      toggleItem,
      isItemExpanded,
    });

    root.dataset.accordionInitialized = "true";
  }

  /**
   * Resolve registry record by id or element.
   * @param {string | HTMLElement} accordionIdOrElement
   * @returns {AccordionRecord | null}
   */
  function resolveRecord(accordionIdOrElement) {
    if (!accordionIdOrElement) {return null;}

    if (typeof accordionIdOrElement === "string") {
      const id = accordionIdOrElement.trim();
      if (!id) {return null;}
      const record = ACCORDION_REGISTRY.get(id);
      return record || null;
    }

    if (accordionIdOrElement instanceof HTMLElement) {
      // اگر خود روت نبود، نزدیک‌ترین والد با کلاس accordion را پیدا کن
      const root = accordionIdOrElement.matches(".accordion")
        ? accordionIdOrElement
        : accordionIdOrElement.closest(".accordion");

      if (!root) {return null;}

      const id = root.dataset[ACCORDION_ATTR];
      if (!id) {return null;}
      const record = ACCORDION_REGISTRY.get(id);
      return record || null;
    }

    return null;
  }

  /**
   * Resolve item ref by index or id.
   * @param {AccordionRecord | null} record
   * @param {number | string} target
   * @returns {AccordionItemRefs | null}
   */
  function resolveItemRef(record, target) {
    if (!record || target === null || target === undefined) {return null;}
    const { itemRefs } = record;

    if (typeof target === "number") {
      if (target < 0 || target >= itemRefs.length) {return null;}
      return itemRefs[target] || null;
    }

    if (typeof target === "string") {
      return (
        itemRefs.find(
          (ref) =>
            ref.item.id === target ||
            ref.header.id === target ||
            ref.panel.id === target
        ) || null
      );
    }

    return null;
  }

  // Auto-init on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    const accordions = document.querySelectorAll(".accordion");
    accordions.forEach((acc, index) => {
      if (!acc.dataset[ACCORDION_ATTR]) {
        acc.dataset[ACCORDION_ATTR] = String(index + 1);
      }
      initAccordion(acc);
    });
  });

  // --- Global API ---
  /**
   * @typedef {Object} AccordionGlobalAPI
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => boolean} open
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => boolean} close
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => boolean} toggle
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => (boolean | null)} isOpen
   * @property {(accordionIdOrElement: string | HTMLElement) => void} openAll
   * @property {(accordionIdOrElement: string | HTMLElement) => void} closeAll
   * @property {(rootOrSelector: string | HTMLElement) => void} init
   */

  /** @type {AccordionGlobalAPI & (typeof window.Accordion)} */
  window.Accordion = window.Accordion || {};

  /**
   * باز کردن یک آیتم
   */
  window.Accordion.open = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) {return false;}
    const ref = resolveItemRef(record, target);
    if (!ref) {return false;}
    record.expandItem(ref);
    return true;
  };

  /**
   * بستن یک آیتم
   */
  window.Accordion.close = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) {return false;}
    const ref = resolveItemRef(record, target);
    if (!ref) {return false;}
    record.collapseItem(ref);
    return true;
  };

  /**
   * تغییر وضعیت یک آیتم
   */
  window.Accordion.toggle = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) {return false;}
    const ref = resolveItemRef(record, target);
    if (!ref) {return false;}
    record.toggleItem(ref);
    return true;
  };

  /**
   * وضعیت باز/بسته بودن یک آیتم
   * @returns {boolean | null} true/false اگر آیتم پیدا شود، null اگر پیدا نشود
   */
  window.Accordion.isOpen = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) {return null;}
    const ref = resolveItemRef(record, target);
    if (!ref) {return null;}
    return record.isItemExpanded(ref);
  };

  /**
   * باز کردن همه آیتم‌ها (فقط اگر allowMultiple = true باشد)
   */
  window.Accordion.openAll = function (accordionIdOrElement) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) {return;}
    const { allowMultiple, itemRefs, expandItem } = record;
    if (!allowMultiple) {
      if (itemRefs[0]) {expandItem(itemRefs[0]);}
      return;
    }
    itemRefs.forEach((ref) => expandItem(ref));
  };

  /**
   * بستن همه آیتم‌ها (اگر allowToggle=false، یکی را باز نگه می‌داریم)
   */
  window.Accordion.closeAll = function (accordionIdOrElement) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) {return;}
    const { allowToggle, itemRefs, collapseItem, isItemExpanded, expandItem } =
      record;

    if (!allowToggle) {
      // حداقل یک آیتم باید باز بماند
      let firstOpen = itemRefs.find((ref) => isItemExpanded(ref));
      if (!firstOpen && itemRefs[0]) {
        firstOpen = itemRefs[0];
      }

      itemRefs.forEach((ref) => {
        if (ref === firstOpen) {return;}
        collapseItem(ref);
      });

      if (firstOpen && !isItemExpanded(firstOpen)) {
        expandItem(firstOpen);
      }
      return;
    }

    itemRefs.forEach((ref) => collapseItem(ref));
  };

  /**
   * init دستی برای آکاردئون‌هایی که بعداً به DOM اضافه می‌کنی
   * @param {string | HTMLElement} rootOrSelector
   */
  window.Accordion.init = function (rootOrSelector) {
    if (!rootOrSelector) {return;}

    if (typeof rootOrSelector === "string") {
      const nodes = document.querySelectorAll(rootOrSelector);
      nodes.forEach((node, index) => {
        if (!node.dataset[ACCORDION_ATTR]) {
          node.dataset[ACCORDION_ATTR] = String(
            ACCORDION_REGISTRY.size + index + 1
          );
        }
        initAccordion(node);
      });
    } else if (rootOrSelector instanceof HTMLElement) {
      if (!rootOrSelector.dataset[ACCORDION_ATTR]) {
        rootOrSelector.dataset[ACCORDION_ATTR] = String(
          ACCORDION_REGISTRY.size + 1
        );
      }
      initAccordion(rootOrSelector);
    }
  };
})();
