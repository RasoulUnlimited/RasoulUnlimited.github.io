// Minimal FAQ search functionality for home pages
// Derived from assets/js/faq-fa.js without analytics or extras

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("faq-search");
    const clearButton = document.getElementById("clear-search");
    const faqItems = Array.from(document.querySelectorAll(".faq-item"));

    if (!searchInput || !clearButton || !faqItems.length) {return;}

    // Live region برای اعلام تعداد نتایج (a11y)
    let status = document.getElementById("faq-search-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "faq-search-status";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      status.className = "faq-search-status sr-only"; // تو CSS .sr-only رو تعریف کن
      searchInput.closest("form")?.appendChild(status) ||
        searchInput.parentNode.appendChild(status);
    }

    // مطمئن شو دکمه‌ی پاک‌کردن برای اسکرین‌ریدر واضح است
    if (!clearButton.getAttribute("aria-label")) {
      clearButton.setAttribute("aria-label", "Clear FAQ search");
    }

    let debounceTimer;

    function updateStatus(term, visibleCount) {
      const total = faqItems.length;
      const trimmed = term.trim();

      if (!trimmed) {
        status.textContent = `Showing all ${total} question${total === 1 ? "" : "s"}.`;
        return;
      }
      status.textContent =
        visibleCount === 0
          ? `No results found for “${trimmed}”.`
          : `Found ${visibleCount} result${visibleCount === 1 ? "" : "s"} for “${trimmed}”.`;
    }

    function filterFaq(term) {
      const rawTerm = term !== undefined ? term : searchInput.value;
      const searchTerm = (rawTerm || "").trim().toLowerCase();
      const hasTerm = searchTerm.length > 0;

      let visibleCount = 0;

      faqItems.forEach((item) => {
        const summary = item.querySelector("summary");
        const answerEl = item.querySelector(".faq-answer, p, .faq-body");

        const question = summary
          ? summary.textContent.toLowerCase()
          : "";
        const answer = answerEl
          ? answerEl.textContent.toLowerCase()
          : "";
        const keywords = (item.dataset.keywords || "").toLowerCase();

        const matches =
          !hasTerm ||
          question.includes(searchTerm) ||
          answer.includes(searchTerm) ||
          keywords.includes(searchTerm);

        if (matches) {
          item.hidden = false;
          visibleCount++;

          // اگر سرچ داریم، آیتم رو باز کن ولی فقط اگر قبلاً باز نبوده
          if (hasTerm && !item.open) {
            item.open = true;
            if (summary) {summary.setAttribute("aria-expanded", "true");}
            item.dataset.openedBySearch = "true";
          }

          // اگر سرچ خالی شده و این آیتم فقط به‌خاطر سرچ باز بود → ببندش
          if (!hasTerm && item.dataset.openedBySearch) {
            delete item.dataset.openedBySearch;
            if (item.open) {
              item.open = false;
              if (summary) {summary.setAttribute("aria-expanded", "false");}
            }
          }
        } else {
          item.hidden = true;
          // اگر در اثر سرچ باز شده بود، ببند
          if (item.open && item.dataset.openedBySearch) {
            item.open = false;
            if (summary) {summary.setAttribute("aria-expanded", "false");}
            delete item.dataset.openedBySearch;
          }
        }
      });

      updateStatus(searchTerm, visibleCount);
    }

    searchInput.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      clearButton.style.display = term ? "inline-flex" : "none";

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => filterFaq(term), 200);
    });

    // ESC داخل اینپوت → سرچ پاک شود
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        searchInput.value = "";
        clearButton.style.display = "none";
        clearTimeout(debounceTimer);
        filterFaq("");
      }
    });

    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      clearButton.style.display = "none";
      clearTimeout(debounceTimer);
      filterFaq("");
      searchInput.focus();
    });

    // وضعیت اولیه
    clearButton.style.display = "none";
    filterFaq("");

    // Cleanup on page unload to prevent memory leaks
    window.addEventListener("beforeunload", () => {
      clearTimeout(debounceTimer);
    });
  });
})();
