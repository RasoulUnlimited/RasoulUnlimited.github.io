// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("credential-search");
  const clearButton = document.getElementById("clear-credential-search");
  const voiceButton = document.getElementById("voice-search-btn");
  const resultsInfo = document.getElementById("results-info");
  const cards = document.querySelectorAll(".credential-card");
  const lang =
    resultsInfo?.dataset.lang || document.documentElement.lang || "en";

  if (!searchInput || !clearButton) return;

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

  cards.forEach((card) => {
    const nameEl = card.querySelector("h3");
    const summaryEl = card.querySelector(".credential-summary");
    if (nameEl) nameEl.dataset.original = nameEl.textContent;
    if (summaryEl) summaryEl.dataset.original = summaryEl.textContent;
  });

  const highlightText = (el, term) => {
    if (!el || !el.dataset.original) return;
    if (!term) {
      el.innerHTML = el.dataset.original;
      return;
    }
    const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
    el.innerHTML = el.dataset.original.replace(regex, "<mark>$1</mark>");
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

      if (
        name.includes(searchNormalized) ||
        summary.includes(searchNormalized) ||
        keywords.includes(searchNormalized)
      ) {
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

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim();
    clearButton.style.display = term ? "block" : "none";
    if (storage) {
      try {
        if (term) {
          storage.setItem(STORAGE_KEY, term);
        } else {
          storage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        // ignore storage errors (e.g. Safari private mode)
      }
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filterCards(term), 200);
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    clearButton.style.display = "none";
    if (storage) {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch (err) {}
    }
    clearTimeout(debounceTimer);
    filterCards("");
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      clearButton.style.display = "none";
      if (storage) {
        try {
          storage.removeItem(STORAGE_KEY);
        } catch (err) {}
      }
      clearTimeout(debounceTimer);
      filterCards("");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      searchInput.value = "";
      clearButton.style.display = "none";
      if (storage) {
        try {
          storage.removeItem(STORAGE_KEY);
        } catch (err) {}
      }
      clearTimeout(debounceTimer);
      filterCards("");
    }
  });

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
      });

      recognition.addEventListener("end", () => {
        voiceButton.classList.remove("listening");
      });

      recognition.addEventListener("result", (e) => {
        const transcript = e.results[0][0].transcript.trim();
        searchInput.value = transcript;
        clearButton.style.display = transcript ? "block" : "none";
        if (storage) {
          try {
            if (transcript) {
              storage.setItem(STORAGE_KEY, transcript);
            } else {
              storage.removeItem(STORAGE_KEY);
            }
          } catch (err) {}
        }
        filterCards(transcript);
      });

      recognition.addEventListener("error", () => {
        window.createToast?.(
          lang.startsWith("fa")
            ? "امکان دریافت صدا نیست."
            : "Voice recognition unavailable.",
          {
            id: `voice-error-${Date.now()}`,
            iconClass: "fas fa-exclamation-triangle",
            iconColor: "red",
            duration: 3000,
          }
        );
      });
    } else {
      voiceButton.style.display = "none";
      window.createToast?.(
        lang.startsWith("fa")
          ? "مرورگر شما از جستجوی صوتی پشتیبانی نمی‌کند."
          : "Voice search isn't supported.",
        {
          id: "voice-unsupported",
          iconClass: "fas fa-exclamation-triangle",
          iconColor: "red",
          duration: 3000,
        }
      );
    }
  }

  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "/" ||
        (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) &&
      document.activeElement !== searchInput
    ) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      clearButton.style.display = "none";
      if (storage) {
        try {
          storage.removeItem(STORAGE_KEY);
        } catch (err) {}
      }
      filterCards("");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      searchInput.value = "";
      clearButton.style.display = "none";
      localStorage.removeItem(STORAGE_KEY);
      filterCards("");
    }
  });

  filterCards(savedTerm);
});
