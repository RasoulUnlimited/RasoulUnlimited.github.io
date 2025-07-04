// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("credential-search");
    const clearButton = document.getElementById("clear-credential-search");
    const voiceButton = document.getElementById("voice-search-btn");
    const resultsInfo = document.getElementById("results-info");
    const cards = document.querySelectorAll(".credential-card");
    const lang = resultsInfo?.dataset.lang || document.documentElement.lang || "en";
  
    if (!searchInput || !clearButton) return;
  
    let debounceTimer;
  
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
        resultsInfo.textContent = count === 0
          ? "موردی یافت نشد"
          : `${count} نتیجه یافت شد`;
      } else {
        const word = count === 1 ? "result" : "results";
        resultsInfo.textContent = count === 0
          ? "No results found"
          : `${count} ${word} found`;
      }
    };
  
    const filterCards = (term) => {
      const searchTerm = term !== undefined ? term : searchInput.value.trim();
      const searchLower = searchTerm.toLowerCase();
      let visibleCount = 0;
  
      cards.forEach((card) => {
        const nameEl = card.querySelector("h3");
        const summaryEl = card.querySelector(".credential-summary");
        const keywords = card.dataset.keywords ? card.dataset.keywords.toLowerCase() : "";
        const name = nameEl ? nameEl.dataset.original.toLowerCase() : "";
        const summary = summaryEl ? summaryEl.dataset.original.toLowerCase() : "";
  
        if (name.includes(searchLower) || summary.includes(searchLower) || keywords.includes(searchLower)) {
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

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filterCards(term), 200);
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    clearButton.style.display = "none";
    clearTimeout(debounceTimer);
    filterCards("");
  });

  if (voiceButton) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = lang.startsWith("fa") ? "fa-IR" : "en-US";
      recognition.interimResults = false;
      voiceButton.addEventListener("click", () => recognition.start());
      recognition.addEventListener("result", (e) => {
        const transcript = e.results[0][0].transcript.trim();
        searchInput.value = transcript;
        clearButton.style.display = transcript ? "block" : "none";
        filterCards(transcript);
      });
    } else {
      voiceButton.style.display = "none";
    }
  }

  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "/" || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) &&
      document.activeElement !== searchInput
    ) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  filterCards("");
});