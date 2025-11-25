// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

function initCredentialSearch() {
  const searchInput = document.getElementById("credential-search");
  const clearButton = document.getElementById("clear-credential-search");
  const voiceButton = document.getElementById("voice-search-btn");
  const resultsInfo = document.getElementById("results-info");
  const cards = document.querySelectorAll(".credential-card");
  const lang =
    (resultsInfo && resultsInfo.dataset.lang) ||
    document.documentElement.lang ||
    "en";

  if (!searchInput || !clearButton || !cards.length) {return;}

  // Cleanup previous listeners if any
  if (searchInput._searchAbortController) {
    searchInput._searchAbortController.abort();
  }
  const controller = new AbortController();
  searchInput._searchAbortController = controller;
  const signal = { signal: controller.signal };

  // Make results info a live region for screen readers
  if (resultsInfo) {
    resultsInfo.setAttribute("aria-live", "polite");
    resultsInfo.setAttribute("aria-atomic", "true");
  }

  const STORAGE_KEY = "credentialSearchTerm";

  function getSafeStorage() {
    const testKey = "__credential_search__";
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return localStorage;
    } catch (err) {
      return null;
    }
  }

  const storage = getSafeStorage();

  // Safe wrapper for createToast (works with 1-arg or 2-arg versions)
  function safeToast(message, options) {
    if (typeof window.createToast !== "function") {return;}
    try {
      return window.createToast(message, options);
    } catch {
      // fallback for minimal createToast(message)
      try {
        return window.createToast(message);
      } catch {
        // ignore
      }
    }
  }

  const savedTerm = storage?.getItem(STORAGE_KEY) || "";
  if (savedTerm) {
    searchInput.value = savedTerm;
    clearButton.style.display = "block";
  }

  let debounceTimer;

  const normalizeText = (str) =>
    (str || "")
      .normalize("NFC")
      .replace(/[ي]/g, "ی")
      .replace(/[ك]/g, "ک")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/‌/g, "")
      .toLowerCase();

  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // cache original texts and HTML
  cards.forEach((card) => {
    const nameEl = card.querySelector("h3");
    const summaryEl = card.querySelector(".credential-summary");
    if (nameEl && !nameEl.dataset.original) {
      nameEl.dataset.original = nameEl.textContent || "";
      nameEl.dataset.originalHtml = nameEl.innerHTML || "";
    }
    if (summaryEl && !summaryEl.dataset.original) {
      summaryEl.dataset.original = summaryEl.textContent || "";
      summaryEl.dataset.originalHtml = summaryEl.innerHTML || "";
    }
  });

  const highlightText = (el, term) => {
    if (!el) {return;}
    
    // Remove existing highlights first to preserve event listeners
    // This replaces the destructive innerHTML restoration
    const highlights = el.querySelectorAll("mark.search-highlight");
    highlights.forEach(mark => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });

    if (!term) {
      return;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    
    // Normalize term to base characters first to match filter logic
    const normalizedTerm = normalizeText(term);
    
    // Build regex that allows for diacritics and ZWNJ between characters
    const noise = "[\\u064B-\\u065F\\u0670\\u200c\\u200d]*";
    const pattern = normalizedTerm.split("").map(char => {
      const escaped = escapeRegExp(char);
      if (char === "ی") return "[یي]";
      if (char === "ک") return "[کك]";
      return escaped;
    }).join(noise);

    // Remove 'g' flag to avoid stateful behavior with test() in loop
    const regex = new RegExp(`(${pattern})`, "i");

    while (walker.nextNode()) {
      const node = walker.currentNode;
      // Skip if parent is already a highlight
      if (node.parentNode.classList.contains("search-highlight")) continue;

      if (node.nodeValue && regex.test(node.nodeValue)) {
        nodesToReplace.push(node);
      }
    }

    nodesToReplace.forEach(node => {
      const fragment = document.createDocumentFragment();
      const parts = node.nodeValue.split(regex);
      
      parts.forEach((part, index) => {
        if (index % 2 === 1) { // Matched part
          const mark = document.createElement("mark");
          mark.className = "search-highlight"; // Add class for safe removal
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
    if (!resultsInfo) {return;}
    if (lang.startsWith("fa")) {
      resultsInfo.textContent =
        count === 0 ? "موردی یافت نشد" : `${count} نتیجه یافت شد`;
    } else {
      const word = count === 1 ? "result" : "results";
      resultsInfo.textContent =
        count === 0 ? "No results found" : `${count} ${word} found`;
    }
  };

  const filterCards = (term) => {
    const searchTerm = term !== undefined ? term : searchInput.value.trim();
    const searchNormalized = normalizeText(searchTerm).toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const nameEl = card.querySelector("h3");
      const summaryEl = card.querySelector(".credential-summary");

      // Cache normalized values to avoid redundant normalization calls
      const normalizedName = nameEl && nameEl.dataset.original
        ? normalizeText(nameEl.dataset.original).toLowerCase()
        : "";
      const normalizedSummary = summaryEl && summaryEl.dataset.original
        ? normalizeText(summaryEl.dataset.original).toLowerCase()
        : "";
      const normalizedKeywords = normalizeText(card.dataset.keywords || "").toLowerCase();

      const matches =
        !searchNormalized ||
        normalizedName.includes(searchNormalized) ||
        normalizedSummary.includes(searchNormalized) ||
        normalizedKeywords.includes(searchNormalized);

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

  function persistTerm(term) {
    if (!storage) {return;}
    try {
      if (term) {
        storage.setItem(STORAGE_KEY, term);
      } else {
        storage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors (e.g. Safari private mode)
    }
  }

  function clearSearch() {
    searchInput.value = "";
    clearButton.style.display = "none";
    clearTimeout(debounceTimer);
    persistTerm("");
    filterCards("");
    searchInput.focus();
  }

  // text search
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim();
    clearButton.style.display = term ? "block" : "none";
    persistTerm(term);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filterCards(term), 200);
  }, { signal: controller.signal });

  clearButton.addEventListener("click", clearSearch, { signal: controller.signal });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      clearSearch();
    }
  }, { signal: controller.signal });

  // Voice search
  if (voiceButton) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = lang.startsWith("fa") ? "fa-IR" : "en-US";
      recognition.interimResults = false;

      // Define event handlers with proper cleanup capability
      const handleClickStart = () => recognition.start();
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
        
        // Clear any pending debounce timers to prevent memory buildup
        clearTimeout(debounceTimer);
        // Immediately filter without debounce for voice results (more responsive UX)
        filterCards(transcript);
      };
      const handleError = (err) => {
        // ignore "no-speech" / "aborted" noise
        if (err && (err.error === "no-speech" || err.error === "aborted"))
        {return;}
        safeToast(
          lang.startsWith("fa")
            ? "امکان دریافت صدا نیست."
            : "Voice recognition unavailable."
        );
      };

      voiceButton.addEventListener("click", handleClickStart, { signal: controller.signal });
      recognition.addEventListener("start", handleStart);
      recognition.addEventListener("end", handleEnd);
      recognition.addEventListener("result", handleResult);
      recognition.addEventListener("error", handleError);

      // Cleanup on page unload or re-init
      const cleanup = () => {
        try {
          recognition.abort();
        } catch (e) {
          // Ignore errors during abort
        }
        // voiceButton listener is removed by signal
        recognition.removeEventListener("start", handleStart);
        recognition.removeEventListener("end", handleEnd);
        recognition.removeEventListener("result", handleResult);
        recognition.removeEventListener("error", handleError);
      };

      controller.signal.addEventListener('abort', cleanup);
      window.addEventListener("beforeunload", cleanup, { signal: controller.signal });
    } else {
      voiceButton.style.display = "none";
      safeToast(
        lang.startsWith("fa")
          ? "مرورگر شما از جستجوی صوتی پشتیبانی نمی‌کند."
          : "Voice search isn't supported."
      );
    }
  }

  // Global keyboard shortcuts: / or Ctrl/Cmd+K to focus search
  document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    const tag = active && active.tagName;

    const isTextField =
      active &&
      (tag === "INPUT" ||
        tag === "TEXTAREA" ||
        active.isContentEditable === true);

    if (
      (e.key === "/" ||
        (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) &&
      !isTextField &&
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
  }, { signal: controller.signal });

  // Initial filter with saved term (if any)
  filterCards(savedTerm);

  // Cleanup on page unload to prevent memory leaks
  window.addEventListener("beforeunload", () => {
    clearTimeout(debounceTimer);
  }, { signal: controller.signal });
}

document.addEventListener("DOMContentLoaded", initCredentialSearch);
document.addEventListener("includesLoaded", initCredentialSearch);
