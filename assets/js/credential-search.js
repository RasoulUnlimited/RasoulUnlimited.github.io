// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

(function () {
  "use strict";

  // جلوگیری از ارور در محیط‌هایی مثل SSR/Node
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("credential-search");
    const clearButton = document.getElementById("clear-credential-search");
    const voiceButton = document.getElementById("voice-search-btn");
    const resultsInfo = document.getElementById("results-info");
    const cards = document.querySelectorAll(".credential-card");

    const lang =
      (resultsInfo && resultsInfo.dataset.lang) ||
      document.documentElement.lang ||
      "en";

    if (!searchInput || !clearButton || !cards.length) return;

    const isFarsi = lang.toLowerCase().startsWith("fa");
    const STORAGE_KEY = "credentialSearchTerm";

    // Make results info a live region for screen readers
    if (resultsInfo) {
      resultsInfo.setAttribute("aria-live", "polite");
      resultsInfo.setAttribute("aria-atomic", "true");
    }

    function getSafeStorage() {
      const testKey = "__credential_search__";
      try {
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return localStorage;
      } catch {
        return null;
      }
    }

    const storage = getSafeStorage();

    /**
     * Safe wrapper for createToast (works with 1-arg or 2-arg versions)
     * @param {string} message
     * @param {any} [options]
     */
    function safeToast(message, options) {
      if (!message || typeof window.createToast !== "function") return;
      try {
        return window.createToast(message, options);
      } catch {
        try {
          return window.createToast(message);
        } catch {
          // ignore
        }
      }
    }

    // نرمالایز برای سرچ (فارسی + حذف حرکات و ZWNJ)
    const normalizeText = (str) =>
      (str || "")
        .normalize("NFC")
        .replace(/[ي]/g, "ی")
        .replace(/[ك]/g, "ک")
        .replace(/[\u064B-\u065F\u0670]/g, "") // حذف حرکات
        .replace(/‌/g, "") // حذف ZWNJ
        .toLowerCase();

    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const isInputLike = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        el.isContentEditable === true
      );
    };

    /**
     * حذف هایلایت‌های قبلی و اعمال هایلایت جدید روی متن
     * هایلایت طوری انجام می‌شود که ساختار DOM کلی حفظ شود (کمترین تخریب)
     * @param {HTMLElement | null} el
     * @param {string} term
     */
    const highlightText = (el, term) => {
      if (!el) return;

      // حذف هایلایت‌های قبلی
      const highlights = el.querySelectorAll("mark.search-highlight");
      highlights.forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(
          document.createTextNode(mark.textContent || ""),
          mark
        );
        parent.normalize();
      });

      if (!term) return;

      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const nodesToReplace = [];
      const normalizedTerm = normalizeText(term);

      // ساخت pattern که اجازهٔ حرکات / ZWNJ بین کاراکترها را می‌دهد
      const noise = "[\\u064B-\\u065F\\u0670\\u200c\\u200d]*";
      const pattern = normalizedTerm
        .split("")
        .map((char) => {
          const escaped = escapeRegExp(char);
          if (char === "ی") return "[یي]";
          if (char === "ک") return "[کك]";
          return escaped;
        })
        .join(noise);

      if (!pattern) return;

      // از g استفاده می‌کنیم ولی قبل از هر استفاده lastIndex را صفر می‌کنیم تا stateful بودن اذیت نکند
      const regex = new RegExp(`(${pattern})`, "gi");

      while (walker.nextNode()) {
        const node = walker.currentNode;

        if (
          !node.nodeValue ||
          (node.parentNode &&
            node.parentNode.classList &&
            node.parentNode.classList.contains("search-highlight"))
        ) {
          continue;
        }

        regex.lastIndex = 0;
        if (regex.test(node.nodeValue)) {
          nodesToReplace.push(node);
        }
      }

      nodesToReplace.forEach((node) => {
        if (!node.parentNode) return;

        const fragment = document.createDocumentFragment();
        regex.lastIndex = 0;
        const parts = node.nodeValue.split(regex);

        parts.forEach((part, index) => {
          if (index % 2 === 1) {
            // matched segment
            const mark = document.createElement("mark");
            mark.className = "search-highlight";
            mark.textContent = part;
            fragment.appendChild(mark);
          } else if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
        });

        node.parentNode.replaceChild(fragment, node);
      });
    };

    const updateResultsInfo = (count) => {
      if (!resultsInfo) return;
      if (isFarsi) {
        resultsInfo.textContent =
          count === 0 ? "موردی یافت نشد" : `${count} نتیجه یافت شد`;
      } else {
        const word = count === 1 ? "result" : "results";
        resultsInfo.textContent =
          count === 0 ? "No results found" : `${count} ${word} found`;
      }
    };

    // --- Precompute card meta to avoid repeated querySelector در هر سرچ ---

    /**
     * @typedef {Object} CredentialItem
     * @property {HTMLElement} card
     * @property {HTMLElement | null} nameEl
     * @property {HTMLElement | null} summaryEl
     * @property {string} searchIndex
     */

    /** @type {CredentialItem[]} */
    const credentialItems = [];

    cards.forEach((card) => {
      const nameEl = card.querySelector("h3");
      const summaryEl = card.querySelector(".credential-summary");

      if (nameEl && !nameEl.dataset.original) {
        nameEl.dataset.original = nameEl.textContent || "";
      }
      if (summaryEl && !summaryEl.dataset.original) {
        summaryEl.dataset.original = summaryEl.textContent || "";
      }

      const normalizedName = nameEl?.dataset.original
        ? normalizeText(nameEl.dataset.original)
        : "";
      const normalizedSummary = summaryEl?.dataset.original
        ? normalizeText(summaryEl.dataset.original)
        : "";
      const normalizedKeywords = normalizeText(card.dataset.keywords || "");

      const searchIndex = [normalizedName, normalizedSummary, normalizedKeywords]
        .filter(Boolean)
        .join(" ");

      card.dataset.searchIndex = searchIndex;

      credentialItems.push({
        card,
        nameEl: nameEl || null,
        summaryEl: summaryEl || null,
        searchIndex,
      });
    });

    let debounceTimer;

    const persistTerm = (term) => {
      if (!storage) return;
      try {
        if (term) {
          storage.setItem(STORAGE_KEY, term);
        } else {
          storage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore storage errors (e.g. Safari private mode)
      }
    };

    const filterCards = (term) => {
      const searchTerm =
        term !== undefined ? term : searchInput.value.trim() || "";
      const searchNormalized = normalizeText(searchTerm);
      let visibleCount = 0;

      credentialItems.forEach((item) => {
        const { card, nameEl, summaryEl, searchIndex } = item;
        const matches =
          !searchNormalized || searchIndex.includes(searchNormalized);

        if (matches) {
          card.style.display = "grid";
          highlightText(nameEl, searchTerm);
          highlightText(summaryEl, searchTerm);
          visibleCount++;
        } else {
          card.style.display = "none";
          highlightText(nameEl, "");
          highlightText(summaryEl, "");
        }
      });

      updateResultsInfo(visibleCount);
    };

    const clearSearch = () => {
      searchInput.value = "";
      clearButton.style.display = "none";
      clearTimeout(debounceTimer);
      persistTerm("");
      filterCards("");
      searchInput.focus();
    };

    // --- Initial state from storage ---
    const initStorageAndInitialState = () => {
      const savedTerm = storage?.getItem(STORAGE_KEY) || "";
      if (savedTerm) {
        searchInput.value = savedTerm;
        clearButton.style.display = "block";
      }
      filterCards(savedTerm);
    };

    // --- Text search events ---
    const initTextSearch = () => {
      searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim();
        clearButton.style.display = term ? "block" : "none";
        persistTerm(term);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => filterCards(term), 200);
      });

      clearButton.addEventListener("click", clearSearch);

      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          clearSearch();
        }
      });
    };

    // --- Voice search ---
    let recognition = null;

    // --- Cleanup handler list ---
    const cleanupHandlers = [];

    const initVoiceSearch = () => {
      if (!voiceButton) return;

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        voiceButton.style.display = "none";
        safeToast(
          isFarsi
            ? "مرورگر شما از جستجوی صوتی پشتیبانی نمی‌کند."
            : "Voice search isn't supported."
        );
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = isFarsi ? "fa-IR" : "en-US";
      recognition.interimResults = false;

      const handleClickStart = () => {
        try {
          recognition.start();
        } catch {
          // اگر در حال اجرا بود، خطا را نادیده می‌گیریم
        }
      };

      const handleStart = () => {
        voiceButton.classList.add("listening");
        voiceButton.setAttribute("aria-pressed", "true");
      };

      const handleEnd = () => {
        voiceButton.classList.remove("listening");
        voiceButton.setAttribute("aria-pressed", "false");
      };

      const handleResult = (e) => {
        const transcript = (e.results[0][0].transcript || "").trim();
        searchInput.value = transcript;
        clearButton.style.display = transcript ? "block" : "none";
        persistTerm(transcript);

        clearTimeout(debounceTimer);
        // برای تجربه‌ی بهتر، نتایج صوتی را بدون debounce اعمال می‌کنیم
        filterCards(transcript);
      };

      const handleError = (err) => {
        if (err && (err.error === "no-speech" || err.error === "aborted")) {
          return;
        }
        safeToast(
          isFarsi
            ? "امکان دریافت صدا نیست."
            : "Voice recognition unavailable."
        );
      };

      voiceButton.addEventListener("click", handleClickStart);
      recognition.addEventListener("start", handleStart);
      recognition.addEventListener("end", handleEnd);
      recognition.addEventListener("result", handleResult);
      recognition.addEventListener("error", handleError);

      // ثبت برای cleanup
      cleanupHandlers.push(() => {
        try {
          recognition.abort();
        } catch {
          // Ignore errors during abort
        }
        voiceButton.removeEventListener("click", handleClickStart);
        recognition.removeEventListener("start", handleStart);
        recognition.removeEventListener("end", handleEnd);
        recognition.removeEventListener("result", handleResult);
        recognition.removeEventListener("error", handleError);
      });
    };

    // --- Global keyboard shortcuts: / or Ctrl/Cmd+K to focus search ---
    const initKeyboardShortcuts = () => {
      const handler = (e) => {
        const active = document.activeElement;

        if (
          (e.key === "/" ||
            (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) &&
          !isInputLike(active) &&
          active !== searchInput
        ) {
          e.preventDefault();
          searchInput.focus();
          return;
        }

        if (e.key === "Escape" && active === searchInput) {
          e.preventDefault();
          clearSearch();
        }
      };

      document.addEventListener("keydown", handler);

      cleanupHandlers.push(() => {
        document.removeEventListener("keydown", handler);
      });
    };

    const initGlobalCleanup = () => {
      window.addEventListener("beforeunload", () => {
        clearTimeout(debounceTimer);
        cleanupHandlers.forEach((fn) => {
          try {
            fn();
          } catch {
            // ignore individual cleanup errors
          }
        });
      });
    };

    // --- Init all ---
    initStorageAndInitialState();
    initTextSearch();
    initVoiceSearch();
    initKeyboardShortcuts();
    initGlobalCleanup();
  });
})();
