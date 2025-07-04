// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("credential-search");
    const clearButton = document.getElementById("clear-credential-search");
    const resultsInfo = document.getElementById("results-info");
    const cards = document.querySelectorAll(".credential-card");
    const lang = resultsInfo?.dataset.lang || document.documentElement.lang || "en";
  
    if (!searchInput || !clearButton) return;
  
    let debounceTimer;
  
    const updateResultsInfo = (count) => {
      if (!resultsInfo) return;
      if (lang.startsWith("fa")) {
        resultsInfo.textContent = count === 0 ? "موردی یافت نشد" : `${count} نتیجه یافت شد`;
      } else {
        const word = count === 1 ? "result" : "results";
        resultsInfo.textContent = count === 0 ? "No results found" : `${count} ${word} found`;
      }
    };
  
    const filterCards = (term) => {
      const searchTerm = term !== undefined ? term : searchInput.value.trim().toLowerCase();
      let visibleCount = 0;
  
      cards.forEach((card) => {
        const nameEl = card.querySelector("h3");
        const summaryEl = card.querySelector(".credential-summary");
        const keywords = card.dataset.keywords ? card.dataset.keywords.toLowerCase() : "";
        const name = nameEl ? nameEl.textContent.toLowerCase() : "";
        const summary = summaryEl ? summaryEl.textContent.toLowerCase() : "";
  
        if (name.includes(searchTerm) || summary.includes(searchTerm) || keywords.includes(searchTerm)) {
          card.style.display = "grid";
          visibleCount++;
        } else {
          card.style.display = "none";
        }
    });
    updateResultsInfo(visibleCount);
  };

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
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

  filterCards("");
});