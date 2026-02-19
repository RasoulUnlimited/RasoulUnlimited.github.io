// Minimal FAQ search and interaction logic for homepage FAQ section

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const faqRoot = document.getElementById("faq");
    if (!faqRoot) {return;}

    // Toast fallback for pages where main toast helper is not loaded yet.
    if (typeof window.createToast !== "function") {
      window.createToast = function (message) {
        const toast = document.createElement("div");
        toast.className = "toast-notification";
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
        requestAnimationFrame(() => {
          toast.style.opacity = "1";
        });
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => {
            toast.remove();
          }, 300);
        }, 3000);
      };
    }

    const normalizeText = (str) =>
      (str || "")
        .normalize("NFC")
        .replace(/[ي]/g, "ی")
        .replace(/[ك]/g, "ک")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[\u200c\u200d]/g, "")
        .toLowerCase();

    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const searchInput = faqRoot.querySelector("#faq-search");
    const clearButton = faqRoot.querySelector("#clear-search");
    const faqItems = Array.from(faqRoot.querySelectorAll(".faq-item"));
    const expandAllBtn = faqRoot.querySelector("#expand-all-faq");
    const collapseAllBtn = faqRoot.querySelector("#collapse-all-faq");
    const noResults = faqRoot.querySelector("#faq-no-results");
    const accordionRoot = faqRoot.querySelector("#faq-container.accordion") || faqRoot.querySelector(".faq-container.accordion");

    if (!searchInput || !clearButton || !faqItems.length) {return;}

    if (accordionRoot && !accordionRoot.hasAttribute("data-allow-multiple")) {
      accordionRoot.setAttribute("data-allow-multiple", "true");
    }

    let status = faqRoot.querySelector("#faq-search-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "faq-search-status";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      status.className = "faq-search-status visually-hidden";
      (searchInput.closest("form") || searchInput.parentNode).appendChild(status);
    } else if (!status.classList.contains("visually-hidden")) {
      status.classList.add("visually-hidden");
      status.classList.remove("sr-only");
    }

    if (!clearButton.getAttribute("aria-label")) {
      clearButton.setAttribute("aria-label", "پاک کردن جستجو");
    }

    let debounceTimer;

    function isItemVisible(item) {
      return !item.hidden && item.style.display !== "none";
    }

    function isItemOpen(item) {
      if (window.Accordion && accordionRoot && item.id) {
        const state = window.Accordion.isOpen(accordionRoot, item.id);
        if (typeof state === "boolean") {return state;}
      }
      const header = item.querySelector(".accordion-header");
      return item.classList.contains("is-open") ||
        (header && header.getAttribute("aria-expanded") === "true");
    }

    function openItem(item) {
      if (window.Accordion && accordionRoot && item.id) {
        const opened = window.Accordion.open(accordionRoot, item.id);
        if (opened) {return;}
      }

      item.classList.add("is-open");
      const header = item.querySelector(".accordion-header");
      if (header) {
        header.setAttribute("aria-expanded", "true");
      }
    }

    function closeItem(item) {
      if (window.Accordion && accordionRoot && item.id) {
        const closed = window.Accordion.close(accordionRoot, item.id);
        if (closed) {return;}
      }

      item.classList.remove("is-open");
      const header = item.querySelector(".accordion-header");
      if (header) {
        header.setAttribute("aria-expanded", "false");
      }
    }

    function updateStatus(term, visibleCount) {
      const total = faqItems.length;
      const trimmed = (term || "").trim();

      if (!trimmed) {
        status.textContent = `نمایش همه ${total} سوال.`;
        return;
      }

      status.textContent = visibleCount === 0
        ? `نتیجه‌ای برای «${trimmed}» یافت نشد.`
        : `${visibleCount} نتیجه برای «${trimmed}» پیدا شد.`;
    }

    function clearHighlights(element) {
      if (!element) {return;}
      element.querySelectorAll(".highlight-term").forEach((span) => {
        const parent = span.parentNode;
        if (!parent) {return;}
        parent.replaceChild(document.createTextNode(span.textContent || ""), span);
        parent.normalize();
      });
    }

    function highlightText(element, term) {
      if (!element) {return;}
      clearHighlights(element);
      if (!term) {return;}

      const normalizedTerm = normalizeText(term);
      if (!normalizedTerm) {return;}

      const pattern = normalizedTerm
        .split("")
        .map((char) => {
          const escaped = escapeRegExp(char);
          if (char === "ی") {return "[یي]";}
          if (char === "ک") {return "[کك]";}
          return escaped;
        })
        .join("[\\u064B-\\u065F\\u0670\\u200c\\u200d]*");

      const regex = new RegExp(`(${pattern})`, "i");
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      const nodesToReplace = [];

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentNode;
        if (!parent || !node.nodeValue) {continue;}
        if (parent.classList && parent.classList.contains("highlight-term")) {continue;}
        if (regex.test(node.nodeValue)) {
          nodesToReplace.push(node);
        }
      }

      nodesToReplace.forEach((node) => {
        const fragment = document.createDocumentFragment();
        const parts = node.nodeValue.split(regex);

        parts.forEach((part, index) => {
          if (!part) {return;}
          if (index % 2 === 1) {
            const span = document.createElement("span");
            span.className = "highlight-term";
            span.textContent = part;
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(part));
          }
        });

        if (node.parentNode) {
          node.parentNode.replaceChild(fragment, node);
        }
      });
    }

    function filterFaq(term) {
      const rawTerm = term !== undefined ? term : searchInput.value;
      const searchTerm = normalizeText(rawTerm);
      const hasTerm = searchTerm.length > 0;
      let visibleCount = 0;

      faqItems.forEach((item) => {
        const summaryEl = item.querySelector(".accordion-header .faq-question") || item.querySelector(".faq-question");
        const answerEl = item.querySelector(".accordion-content") || item.querySelector(".faq-answer");
        const questionText = summaryEl ? normalizeText(summaryEl.textContent) : "";
        const answerText = answerEl ? normalizeText(answerEl.textContent) : "";
        const keywords = normalizeText(item.dataset.keywords || "");

        const matches = !hasTerm ||
          questionText.includes(searchTerm) ||
          answerText.includes(searchTerm) ||
          keywords.includes(searchTerm);

        if (matches) {
          item.hidden = false;
          item.style.display = "";
          visibleCount += 1;

          highlightText(summaryEl, hasTerm ? searchTerm : null);
          highlightText(answerEl, hasTerm ? searchTerm : null);

          if (hasTerm && !isItemOpen(item)) {
            openItem(item);
            item.dataset.openedBySearch = "true";
          }

          if (!hasTerm && item.dataset.openedBySearch) {
            closeItem(item);
            delete item.dataset.openedBySearch;
          }
        } else {
          item.hidden = true;
          item.style.display = "none";
        }
      });

      if (noResults) {
        noResults.style.display = visibleCount === 0 ? "block" : "none";
      }

      clearButton.style.display = hasTerm ? "block" : "none";
      updateStatus(rawTerm, visibleCount);
    }

    searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterFaq();
      }, 300);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
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

    if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => {
        faqItems.forEach((item) => {
          if (!isItemVisible(item)) {return;}
          openItem(item);
          delete item.dataset.openedBySearch;
        });
        expandAllBtn.setAttribute("aria-pressed", "true");
        if (collapseAllBtn) {
          collapseAllBtn.setAttribute("aria-pressed", "false");
        }
      });
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener("click", () => {
        faqItems.forEach((item) => {
          if (!isItemVisible(item)) {return;}
          closeItem(item);
          delete item.dataset.openedBySearch;
        });
        collapseAllBtn.setAttribute("aria-pressed", "true");
        if (expandAllBtn) {
          expandAllBtn.setAttribute("aria-pressed", "false");
        }
      });
    }

    faqRoot.querySelectorAll(".copy-faq-link").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const link = btn.dataset.link;
        if (!link) {return;}

        const url = window.location.origin + window.location.pathname + link;
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          window.createToast("مرورگر شما از کپی پشتیبانی نمی‌کند.");
          return;
        }

        navigator.clipboard.writeText(url)
          .then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
            btn.classList.add("copied");
            window.createToast("لینک کپی شد!");

            setTimeout(() => {
              btn.innerHTML = originalHTML;
              btn.classList.remove("copied");
            }, 2000);
          })
          .catch(() => {
            window.createToast("کپی لینک انجام نشد.");
          });
      });
    });

    faqRoot.querySelectorAll(".faq-item").forEach((item) => {
      const id = item.id;
      const storedFeedback = localStorage.getItem(`faq-feedback-${id}`);
      if (!storedFeedback) {return;}
      const btn = item.querySelector(`.btn-feedback.${storedFeedback}`);
      if (btn) {
        btn.classList.add("active");
      }
    });

    faqRoot.querySelectorAll(".btn-feedback").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const parent = btn.closest(".faq-feedback");
        const item = btn.closest(".faq-item");
        if (!parent || !item) {return;}

        parent.querySelectorAll(".btn-feedback").forEach((siblingBtn) => {
          siblingBtn.classList.remove("active");
        });
        btn.classList.add("active");

        const isUp = btn.classList.contains("up");
        localStorage.setItem(`faq-feedback-${item.id}`, isUp ? "up" : "down");

        const label = parent.querySelector(".feedback-label");
        if (label) {
          const originalText = label.dataset.originalText || label.textContent;
          label.dataset.originalText = originalText;
          label.textContent = "بازخورد شما ثبت شد. ممنون!";

          setTimeout(() => {
            label.textContent = originalText;
            btn.classList.remove("active");
          }, 3000);
        }

        window.createToast("بازخورد شما ثبت شد. ممنون!");
      });
    });

    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const escapedId = window.CSS && typeof window.CSS.escape === "function"
        ? window.CSS.escape(targetId)
        : targetId.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, "\\$1");
      const targetItem = faqRoot.querySelector(`#${escapedId}`);
      if (targetItem && targetItem.classList.contains("faq-item")) {
        setTimeout(() => {
          openItem(targetItem);
          targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 400);
      }
    }
  });
})();
