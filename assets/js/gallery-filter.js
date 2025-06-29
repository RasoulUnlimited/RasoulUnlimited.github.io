(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    const filterBar = document.querySelector(".filter-bar");
    if (!filterBar) return;

    const cards = document.querySelectorAll(".presskit-card");

    filterBar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      event.preventDefault();
      const filter = button.getAttribute("data-filter");

      filterBar.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn === button);
      });

      cards.forEach((card) => {
        const category = card.getAttribute("data-category");
        if (filter === "all" || filter === category) {
          card.hidden = false;
        } else {
          card.hidden = true;
        }
      });
    });
  });
})();
