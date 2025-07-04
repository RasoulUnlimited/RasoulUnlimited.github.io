// Minimal credential search functionality
// Similar to faq-search.js but for proof pages

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("credential-search");
    const clearButton = document.getElementById("clear-credential-search");
    const cards = document.querySelectorAll(".credential-card");
  
    if (!searchInput || !clearButton) return;
  
    let debounceTimer;
  
    const filterCards = (term) => {
      const searchTerm = term !== undefined ? term : searchInput.value.trim().toLowerCase();
  
      cards.forEach((card) => {
        const nameEl = card.querySelector("h3");
        const summaryEl = card.querySelector(".credential-summary");
        const keywords = card.dataset.keywords ? card.dataset.keywords.toLowerCase() : "";
        const name = nameEl ? nameEl.textContent.toLowerCase() : "";
        const summary = summaryEl ? summaryEl.textContent.toLowerCase() : "";
  
        if (
          name.includes(searchTerm) ||
          summary.includes(searchTerm) ||
          keywords.includes(searchTerm)
        ) {
          card.style.display = "grid";
        } else {
          card.style.display = "none";
        }
      });
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
  });