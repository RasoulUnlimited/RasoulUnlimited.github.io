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
   * رجیستری آکاردئون‌ها برای استفاده در API سراسری
   * @type {Map<string, {
   *   root: HTMLElement,
   *   itemRefs: AccordionItemRefs[],
   *   allowMultiple: boolean,
   *   allowToggle: boolean,
   *   expandItem: (ref: AccordionItemRefs) => void,
   *   collapseItem: (ref: AccordionItemRefs) => void,
   *   toggleItem: (ref: AccordionItemRefs) => void,
   *   isItemExpanded: (ref: AccordionItemRefs) => boolean
   * }>}
   */
  const ACCORDION_REGISTRY = new Map();

  // ترجیح کاربر برای کاهش انیمیشن فقط یک بار محاسبه می‌شود
  const PREFERS_REDUCED_MOTION =
    !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // مدت‌زمان fallback برای ترنزیشن‌ها (باید با transition CSS تقریباً هماهنگ باشد)
  const TRANSITION_FALLBACK_MS = 500;

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
      root.getAttribute("data-allow-toggle") !== "false"; // اگر false باشد، حداقل یک آیتم همیشه باز می‌ماند

    /** @type {AccordionItemRefs[]} */
    const itemRefs = [];
    /** @type {HTMLElement[]} */
    const headers = [];

    const reduceMotion = PREFERS_REDUCED_MOTION;

    const items = Array.from(root.querySelectorAll(".accordion-item"));
    if (!items.length) return;

    // برای نگه‌داری هندلرهای transitionend و timeoutها
    /** @type {WeakMap<HTMLElement, (e: TransitionEvent) => void>} */
    const transitionEndHandlers = new WeakMap();
    /** @type {WeakMap<HTMLElement, number>} */
    const transitionTimeoutIds = new WeakMap();

    /**
     * پاک کردن هندلر transitionend و timeout از پنل
     * @param {HTMLElement} panel
     */
    function clearTransitionHandlers(panel) {
      const existingHandler = transitionEndHandlers.get(panel);
      if (existingHandler) {
        panel.removeEventListener("transitionend", existingHandler);
        transitionEndHandlers.delete(panel);
      }
      const timeoutId = transitionTimeoutIds.get(panel);
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        transitionTimeoutIds.delete(panel);
      }
    }

    /**
     * ثبت هندلر transitionend + fallback timeout روی پنل
     * @param {HTMLElement} panel
     * @param {(e?: TransitionEvent) => void} onEnd
     */
    function setupTransitionEnd(panel, onEnd) {
      clearTransitionHandlers(panel);

      let finished = false;

      function finish(e) {
        if (finished) return;
        finished = true;
        clearTransitionHandlers(panel);
        onEnd(e);
      }

      const handler = (e) => {
        if (e.propertyName === "max-height") {
          finish(e);
        }
      };

      panel.addEventListener("transitionend", handler);
      transitionEndHandlers.set(panel, handler);

      const timeoutId = window.setTimeout(() => {
        finish();
      }, TRANSITION_FALLBACK_MS);
      transitionTimeoutIds.set(panel, timeoutId);
    }

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
      panel.setAttribute("aria-hidden", initiallyOpen ? "false" : "true");
      panel.hidden = !initiallyOpen;

      if (initiallyOpen) {
        item.classList.add("is-open");
        panel.style.maxHeight = "none";
        panel.style.opacity = "1";
      } else {
        item.classList.remove("is-open");
        panel.style.maxHeight = "0px";
        panel.style.opacity = "0";
      }

      headers.push(header);
      itemRefs.push({ item, header, panel });
    });

    if (!itemRefs.length) return;

    /**
     * Dispatch a custom event from an item.
     * @param {HTMLElement} item
     * @param {string} type
     * @param {string} accordionId
     */
    function dispatchAccordionEvent(item, type, accordionId) {
      if (!item) return;
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

    // اگر اجازه‌ی toggle نداریم، مطمئن شو حداقل یک آیتم از ابتدا باز است
    if (!allowToggle) {
      const hasOpen = itemRefs.some((ref) => isItemExpanded(ref));
      if (!hasOpen && itemRefs[0]) {
        const { item, header, panel } = itemRefs[0];
        header.setAttribute("aria-expanded", "true");
        item.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        panel.hidden = false;
        panel.style.maxHeight = "none";
        panel.style.opacity = "1";
      }
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
      panel.setAttribute("aria-hidden", "true");

      // پاک کردن هر هندلر قبلی
      clearTransitionHandlers(panel);

      if (reduceMotion) {
        // بدون انیمیشن
        panel.style.maxHeight = "0px";
        panel.style.opacity = "0";
        panel.hidden = true;
      } else {
        // مطمئن شو برای محاسبه scrollHeight مخفی نیست
        panel.hidden = false;

        // همیشه از ارتفاع واقعی فعلی شروع می‌کنیم
        const startHeight = panel.scrollHeight;
        panel.style.maxHeight = startHeight + "px";

        // Force reflow
        void panel.offsetHeight;

        setupTransitionEnd(panel, () => {
          // بعد از پایان انیمیشن، واقعاً مخفی‌اش می‌کنیم
          panel.hidden = true;
          panel.style.maxHeight = "0px";
        });

        requestAnimationFrame(() => {
          panel.style.maxHeight = "0px";
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
      panel.setAttribute("aria-hidden", "false");
      panel.hidden = false;

      if (reduceMotion) {
        panel.style.maxHeight = "none";
        panel.style.opacity = "1";
      } else {
        // از ارتفاع صفر شروع می‌کنیم، بعد به scrollHeight انیمیت می‌کنیم
        panel.style.maxHeight = "0px";
        panel.style.opacity = "0";

        clearTransitionHandlers(panel);

        setupTransitionEnd(panel, () => {
          // بعد از انیمیشن، max-height را none می‌کنیم تا محتوا آزادانه رشد کند
          panel.style.maxHeight = "none";
        });

        requestAnimationFrame(() => {
          const targetHeight = panel.scrollHeight;
          panel.style.maxHeight = targetHeight + "px";
          panel.style.opacity = "1";
        });
      }

      dispatchAccordionEvent(item, "accordion:expand", accordionId);
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
          if (otherRef.item === item) return;
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
  }

  /**
   * Resolve registry record by id or element.
   * @param {string | HTMLElement} accordionIdOrElement
   */
  function resolveRecord(accordionIdOrElement) {
    if (!accordionIdOrElement) return null;

    if (typeof accordionIdOrElement === "string") {
      return ACCORDION_REGISTRY.get(accordionIdOrElement) || null;
    }

    if (accordionIdOrElement instanceof HTMLElement) {
      const id = accordionIdOrElement.dataset
        ? accordionIdOrElement.dataset.accordionId
        : null;
      if (!id) return null;
      return ACCORDION_REGISTRY.get(id) || null;
    }

    return null;
  }

  /**
   * Resolve item ref by index or id.
   * @param {ReturnType<typeof resolveRecord>} record
   * @param {number | string} target
   * @returns {AccordionItemRefs | null}
   */
  function resolveItemRef(record, target) {
    if (!record || target == null) return null;
    const { itemRefs } = record;

    if (typeof target === "number") {
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
      if (!acc.dataset.accordionId) {
        acc.dataset.accordionId = String(index + 1);
      }
      initAccordion(acc);
    });
  });

  // --- Global API ---
  /**
   * @typedef {Object} AccordionGlobalAPI
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => void} open
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => void} close
   * @property {(accordionIdOrElement: string | HTMLElement, target: number | string) => void} toggle
   * @property {(accordionIdOrElement: string | HTMLElement) => void} openAll
   * @property {(accordionIdOrElement: string | HTMLElement) => void} closeAll
   * @property {(rootOrSelector: string | HTMLElement) => void} init
   */

  /** @type {AccordionGlobalAPI & typeof window.Accordion} */
  window.Accordion = window.Accordion || {};

  /**
   * باز کردن یک آیتم
   */
  window.Accordion.open = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) return;
    const ref = resolveItemRef(record, target);
    if (!ref) return;
    record.expandItem(ref);
  };

  /**
   * بستن یک آیتم
   */
  window.Accordion.close = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) return;
    const ref = resolveItemRef(record, target);
    if (!ref) return;
    record.collapseItem(ref);
  };

  /**
   * تغییر وضعیت یک آیتم
   */
  window.Accordion.toggle = function (accordionIdOrElement, target) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) return;
    const ref = resolveItemRef(record, target);
    if (!ref) return;
    record.toggleItem(ref);
  };

  /**
   * باز کردن همه آیتم‌ها (فقط اگر allowMultiple = true باشد)
   */
  window.Accordion.openAll = function (accordionIdOrElement) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) return;
    const { allowMultiple, itemRefs, expandItem } = record;
    if (!allowMultiple) {
      // اگر اجازه‌ی چندتایی نداریم، فقط اولین آیتم را باز می‌کنیم
      if (itemRefs[0]) expandItem(itemRefs[0]);
      return;
    }
    itemRefs.forEach((ref) => expandItem(ref));
  };

  /**
   * بستن همه آیتم‌ها (اگر allowToggle=false، یکی را باز نگه می‌داریم)
   */
  window.Accordion.closeAll = function (accordionIdOrElement) {
    const record = resolveRecord(accordionIdOrElement);
    if (!record) return;
    const { allowToggle, itemRefs, collapseItem, isItemExpanded, expandItem } =
      record;

    if (!allowToggle) {
      // حداقل یک آیتم باید باز بماند
      let firstOpen = itemRefs.find((ref) => isItemExpanded(ref));
      if (!firstOpen && itemRefs[0]) {
        firstOpen = itemRefs[0];
      }

      // بقیه را می‌بندیم
      itemRefs.forEach((ref) => {
        if (ref === firstOpen) return;
        collapseItem(ref);
      });

      // اگر firstOpen بسته بود، دوباره بازش می‌کنیم تا قانون حفظ شود
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
    if (!rootOrSelector) return;
    if (typeof rootOrSelector === "string") {
      const nodes = document.querySelectorAll(rootOrSelector);
      nodes.forEach((node, index) => {
        if (!node.dataset.accordionId) {
          node.dataset.accordionId = String(
            ACCORDION_REGISTRY.size + index + 1
          );
        }
        initAccordion(node);
      });
    } else if (rootOrSelector instanceof HTMLElement) {
      if (!rootOrSelector.dataset.accordionId) {
        rootOrSelector.dataset.accordionId = String(
          ACCORDION_REGISTRY.size + 1
        );
      }
      initAccordion(rootOrSelector);
    }
  };
})();
