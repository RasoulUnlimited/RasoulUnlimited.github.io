// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

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
    if (typeof window.createToast !== "function") return;
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
      .replace(/‌/g, "");

  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // cache original texts
  cards.forEach((card) => {
    const nameEl = card.querySelector("h3");
    const summaryEl = card.querySelector(".credential-summary");
    if (nameEl && !nameEl.dataset.original) {
      nameEl.dataset.original = nameEl.textContent || "";
    }
    if (summaryEl && !summaryEl.dataset.original) {
      summaryEl.dataset.original = summaryEl.textContent || "";
    }
  });

  const highlightText = (el, term) => {
    if (!el || !el.dataset.original) return;
    if (!term) {
      el.textContent = el.dataset.original;
      return;
    }
    const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
    const parts = el.dataset.original.split(regex);
    el.innerHTML = "";
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        el.appendChild(mark);
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
  };

  const updateResultsInfo = (count) => {
    if (!resultsInfo) return;
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
      const keywords = normalizeText(card.dataset.keywords || "").toLowerCase();
      const name = nameEl
        ? normalizeText(nameEl.dataset.original).toLowerCase()
        : "";
      const summary = summaryEl
        ? normalizeText(summaryEl.dataset.original).toLowerCase()
        : "";

      const matches =
        !searchNormalized ||
        name.includes(searchNormalized) ||
        summary.includes(searchNormalized) ||
        keywords.includes(searchNormalized);

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
  });

  clearButton.addEventListener("click", clearSearch);

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      clearSearch();
    }
  });

  // Voice search
  if (voiceButton) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = lang.startsWith("fa") ? "fa-IR" : "en-US";
      recognition.interimResults = false;

      voiceButton.addEventListener("click", () => recognition.start());

      recognition.addEventListener("start", () => {
        voiceButton.classList.add("listening");
        voiceButton.setAttribute("aria-pressed", "true");
      });

      recognition.addEventListener("end", () => {
        voiceButton.classList.remove("listening");
        voiceButton.setAttribute("aria-pressed", "false");
      });

      recognition.addEventListener("result", (e) => {
        const transcript = (e.results[0][0].transcript || "").trim();
        searchInput.value = transcript;
        clearButton.style.display = transcript ? "block" : "none";
        persistTerm(transcript);
        filterCards(transcript);
      });

      recognition.addEventListener("error", (err) => {
        // ignore "no-speech" / "aborted" noise
        if (err && (err.error === "no-speech" || err.error === "aborted"))
          return;
        safeToast(
          lang.startsWith("fa")
            ? "امکان دریافت صدا نیست."
            : "Voice recognition unavailable."
        );
      });
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
  });

  // Initial filter with saved term (if any)
  filterCards(savedTerm);
});
