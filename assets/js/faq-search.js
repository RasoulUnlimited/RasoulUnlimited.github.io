// FAQ search and interaction logic for homepage FAQ section.

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const faqRoot = document.getElementById("faq");
    if (!faqRoot) {return;}

    const lang =
      document.body.getAttribute("data-lang") ||
      document.documentElement.lang ||
      "";
    const isFa = String(lang).toLowerCase().startsWith("fa");

    const STRINGS = isFa
      ? {
        clearSearch: "پاک کردن جستجو",
        showAll: (total) => `نمایش همه ${total} سوال.`,
        noResult: (term) => `نتیجه‌ای برای «${term}» یافت نشد.`,
        matchCount: (count, term) => `${count} نتیجه برای «${term}» پیدا شد.`,
        copyUnsupported: "مرورگر شما از کپی پشتیبانی نمی‌کند.",
        copySuccess: "لینک کپی شد.",
        copyFailed: "کپی لینک انجام نشد.",
        feedbackSaved: "بازخورد شما ثبت شد. ممنون!",
      }
      : {
        clearSearch: "Clear search",
        showAll: (total) => `Showing all ${total} questions.`,
        noResult: (term) => `No results found for \"${term}\".`,
        matchCount: (count, term) => `${count} result(s) found for \"${term}\".`,
        copyUnsupported: "Your browser does not support clipboard copy.",
        copySuccess: "Link copied.",
        copyFailed: "Could not copy the link.",
        feedbackSaved: "Your feedback was saved. Thank you!",
      };

    function getSafeStorage() {
      try {
        const key = "__faq_storage_probe__";
        localStorage.setItem(key, "1");
        localStorage.removeItem(key);
        return localStorage;
      } catch {
        return null;
      }
    }

    const safeStorage = getSafeStorage();

    function readStoredValue(key) {
      if (!safeStorage) {return null;}
      try {
        return safeStorage.getItem(key);
      } catch {
        return null;
      }
    }

    function writeStoredValue(key, value) {
      if (!safeStorage) {return false;}
      try {
        safeStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }

    if (typeof window.createToast !== "function") {
      window.createToast = function (message) {
        const toast = document.createElement("div");
        toast.className = "toast-notification";
        toast.textContent = message;
        toast.style.cssText = [
          "position:fixed",
          "bottom:20px",
          "left:50%",
          "transform:translateX(-50%)",
          "background:rgba(0,0,0,0.8)",
          "color:#fff",
          "padding:10px 20px",
          "border-radius:20px",
          "z-index:10000",
          "opacity:0",
          "transition:opacity 0.3s",
          "font-family:inherit",
          "font-size:0.9rem",
        ].join(";");

        document.body.appendChild(toast);
        requestAnimationFrame(() => {
          toast.style.opacity = "1";
        });
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 300);
        }, 2200);
      };
    }

    const normalizeText = (input) =>
      String(input || "")
        .normalize("NFC")
        .replace(/[ي]/g, "ی")
        .replace(/[ك]/g, "ک")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[\u200c\u200d]/g, "")
        .toLowerCase();

    const escapeRegExp = (input) =>
      String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const searchInput = faqRoot.querySelector("#faq-search");
    const clearButton = faqRoot.querySelector("#clear-search");
    const faqItems = Array.from(faqRoot.querySelectorAll(".faq-item"));
    const expandAllBtn = faqRoot.querySelector("#expand-all-faq");
    const collapseAllBtn = faqRoot.querySelector("#collapse-all-faq");
    const noResults = faqRoot.querySelector("#faq-no-results");
    const accordionRoot =
      faqRoot.querySelector("#faq-container.accordion") ||
      faqRoot.querySelector(".faq-container.accordion");

    if (!searchInput || !clearButton || !faqItems.length) {return;}

    if (accordionRoot && !accordionRoot.hasAttribute("data-allow-multiple")) {
      accordionRoot.setAttribute("data-allow-multiple", "true");
    }

    let status = faqRoot.querySelector("#faq-search-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "faq-search-status";
      status.className = "visually-hidden";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      (searchInput.closest("form") || searchInput.parentNode).appendChild(status);
    }

    if (!clearButton.getAttribute("aria-label")) {
      clearButton.setAttribute("aria-label", STRINGS.clearSearch);
    }

    const isVisible = (item) => !item.hidden && item.style.display !== "none";

    const getHeader = (item) => item.querySelector(".accordion-header");
    const getPanel =
      (item) =>
        item.querySelector(".accordion-content") ||
        item.querySelector(".faq-answer");

    const isOpen = (item) => {
      if (window.Accordion && accordionRoot && item.id) {
        const state = window.Accordion.isOpen(accordionRoot, item.id);
        if (typeof state === "boolean") {return state;}
      }
      const header = getHeader(item);
      return (
        item.classList.contains("is-open") ||
        (header && header.getAttribute("aria-expanded") === "true")
      );
    };

    const openItem = (item) => {
      if (window.Accordion && accordionRoot && item.id) {
        const ok = window.Accordion.open(accordionRoot, item.id);
        if (ok) {return;}
      }
      item.classList.add("is-open");
      const header = getHeader(item);
      const panel = getPanel(item);
      if (header) {
        header.setAttribute("aria-expanded", "true");
      }
      if (panel) {
        panel.setAttribute("aria-hidden", "false");
      }
    };

    const closeItem = (item) => {
      if (window.Accordion && accordionRoot && item.id) {
        const ok = window.Accordion.close(accordionRoot, item.id);
        if (ok) {return;}
      }
      item.classList.remove("is-open");
      const header = getHeader(item);
      const panel = getPanel(item);
      if (header) {
        header.setAttribute("aria-expanded", "false");
      }
      if (panel) {
        panel.setAttribute("aria-hidden", "true");
      }
    };

    const updateStatus = (term, visibleCount) => {
      const total = faqItems.length;
      const trimmed = String(term || "").trim();
      if (!trimmed) {
        status.textContent = STRINGS.showAll(total);
        return;
      }
      status.textContent =
        visibleCount === 0
          ? STRINGS.noResult(trimmed)
          : STRINGS.matchCount(visibleCount, trimmed);
    };

    const clearHighlights = (root) => {
      if (!root) {return;}
      root.querySelectorAll(".highlight-term").forEach((node) => {
        const parent = node.parentNode;
        if (!parent) {return;}
        parent.replaceChild(document.createTextNode(node.textContent || ""), node);
        parent.normalize();
      });
    };

    function copyWithExecCommand(text) {
      if (!document.body) {return false;}

      const probe = document.createElement("textarea");
      probe.value = text;
      probe.setAttribute("readonly", "");
      probe.setAttribute("aria-hidden", "true");
      probe.style.position = "absolute";
      probe.style.left = "-9999px";
      probe.style.top = "0";
      document.body.appendChild(probe);
      probe.select();

      try {
        return !!document.execCommand("copy");
      } catch {
        return false;
      } finally {
        probe.remove();
      }
    }

    async function copyText(text) {
      const hasClipboardApi = !!(navigator.clipboard && navigator.clipboard.writeText);
      if (hasClipboardApi) {
        try {
          await navigator.clipboard.writeText(text);
          return { ok: true, mode: "clipboard" };
        } catch {
          // Fallback to legacy copy path below.
        }
      }

      const legacySuccess = copyWithExecCommand(text);
      if (legacySuccess) {
        return { ok: true, mode: "execCommand" };
      }

      return {
        ok: false,
        mode: hasClipboardApi ? "clipboard-failed" : "unsupported",
      };
    }

    const highlightText = (root, term) => {
      if (!root) {return;}
      clearHighlights(root);
      if (!term) {return;}

      const normalizedTerm = normalizeText(term);
      if (!normalizedTerm) {return;}

      const pattern = normalizedTerm
        .split("")
        .map((ch) => {
          const escaped = escapeRegExp(ch);
          if (ch === "ی") {return "[یي]";}
          if (ch === "ک") {return "[کك]";}
          return escaped;
        })
        .join("[\\u064B-\\u065F\\u0670\\u200c\\u200d]*");
      const regex = new RegExp(`(${pattern})`, "i");

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      const matches = [];

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentNode;
        if (!parent || !node.nodeValue) {continue;}
        if (parent.classList && parent.classList.contains("highlight-term")) {continue;}
        if (regex.test(node.nodeValue)) {
          matches.push(node);
        }
      }

      matches.forEach((node) => {
        const fragment = document.createDocumentFragment();
        node.nodeValue.split(regex).forEach((part, index) => {
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
    };

    const filterFaq = (inputValue) => {
      const rawTerm = inputValue !== undefined ? inputValue : searchInput.value;
      const searchTerm = normalizeText(rawTerm);
      const hasTerm = searchTerm.length > 0;
      let visibleCount = 0;

      faqItems.forEach((item) => {
        const questionEl =
          item.querySelector(".accordion-header .faq-question") ||
          item.querySelector(".faq-question");
        const answerEl = getPanel(item);
        const questionText = normalizeText(questionEl?.textContent || "");
        const answerText = normalizeText(answerEl?.textContent || "");
        const keywords = normalizeText(item.dataset.keywords || "");

        const matched =
          !hasTerm ||
          questionText.includes(searchTerm) ||
          answerText.includes(searchTerm) ||
          keywords.includes(searchTerm);

        if (!matched) {
          item.hidden = true;
          item.style.display = "none";
          return;
        }

        visibleCount += 1;
        item.hidden = false;
        item.style.display = "";
        highlightText(questionEl, hasTerm ? searchTerm : "");
        highlightText(answerEl, hasTerm ? searchTerm : "");

        if (hasTerm && !isOpen(item)) {
          openItem(item);
          item.dataset.openedBySearch = "true";
        }
        if (!hasTerm && item.dataset.openedBySearch) {
          closeItem(item);
          delete item.dataset.openedBySearch;
        }
      });

      if (noResults) {
        noResults.hidden = visibleCount !== 0;
        noResults.style.display = visibleCount === 0 ? "block" : "none";
      }

      clearButton.style.display = hasTerm ? "block" : "none";
      updateStatus(rawTerm, visibleCount);
    };

    let timer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => filterFaq(), 280);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {return;}
      event.preventDefault();
      searchInput.value = "";
      filterFaq("");
      searchInput.focus();
    });

    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      filterFaq("");
      searchInput.focus();
    });

    if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => {
        faqItems.forEach((item) => {
          if (!isVisible(item)) {return;}
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
          if (!isVisible(item)) {return;}
          closeItem(item);
          delete item.dataset.openedBySearch;
        });
        collapseAllBtn.setAttribute("aria-pressed", "true");
        if (expandAllBtn) {
          expandAllBtn.setAttribute("aria-pressed", "false");
        }
      });
    }

    faqRoot.querySelectorAll(".copy-faq-link").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const hash = button.dataset.link;
        if (!hash) {return;}
        const url = window.location.origin + window.location.pathname + hash;

        copyText(url)
          .then((result) => {
            if (!result.ok) {
              if (result.mode === "unsupported") {
                window.createToast(STRINGS.copyUnsupported);
              } else {
                window.createToast(STRINGS.copyFailed);
              }
              return;
            }

            const original = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
            button.classList.add("copied");
            window.createToast(STRINGS.copySuccess);
            setTimeout(() => {
              button.innerHTML = original;
              button.classList.remove("copied");
            }, 1800);
          })
          .catch(() => window.createToast(STRINGS.copyFailed));
      });
    });

    faqRoot.querySelectorAll(".faq-item").forEach((item) => {
      const key = `faq-feedback-${item.id}`;
      const stored = readStoredValue(key);
      if (!stored) {return;}
      const btn = item.querySelector(`.btn-feedback.${stored}`);
      if (btn) {
        btn.classList.add("active");
      }
    });

    faqRoot.querySelectorAll(".btn-feedback").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const wrapper = button.closest(".faq-feedback");
        const item = button.closest(".faq-item");
        if (!wrapper || !item) {return;}

        wrapper.querySelectorAll(".btn-feedback").forEach((node) => {
          node.classList.remove("active");
        });
        button.classList.add("active");

        const value = button.classList.contains("up") ? "up" : "down";
        writeStoredValue(`faq-feedback-${item.id}`, value);

        const label = wrapper.querySelector(".feedback-label");
        if (label) {
          const original = label.dataset.originalText || label.textContent || "";
          label.dataset.originalText = original;
          label.textContent = STRINGS.feedbackSaved;
          setTimeout(() => {
            label.textContent = original;
            button.classList.remove("active");
          }, 3000);
        }

        window.createToast(STRINGS.feedbackSaved);
      });
    });

    if (window.location.hash) {
      const targetId = window.location.hash.slice(1);
      const escaped =
        window.CSS && typeof window.CSS.escape === "function"
          ? window.CSS.escape(targetId)
          : targetId.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");
      const target = faqRoot.querySelector(`#${escaped}`);
      if (target && target.classList.contains("faq-item")) {
        setTimeout(() => {
          openItem(target);
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 360);
      }
    }

    filterFaq("");
  });
})();
