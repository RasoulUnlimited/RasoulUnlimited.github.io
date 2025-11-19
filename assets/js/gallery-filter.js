(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const filterBar = document.querySelector(".filter-bar");
    if (!filterBar) return;

    const cards = Array.from(document.querySelectorAll(".presskit-card"));
    if (!cards.length) return;

    const buttons = Array.from(
      filterBar.querySelectorAll("button[data-filter]")
    );
    if (!buttons.length) return;

    // Live region برای اعلام تعداد نتایج
    let liveRegion = filterBar.querySelector('[data-filter-live="true"]');
    if (!liveRegion) {
      liveRegion = document.createElement("span");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.setAttribute("data-filter-live", "true");
      liveRegion.className = "filter-live sr-only"; // تو CSS .sr-only رو تعریف کن
      filterBar.appendChild(liveRegion);
    }

    // نرمال‌سازی categoryها (پشتیبانی از چند دسته)
    function getCardCategories(card) {
      const raw = card.getAttribute("data-category") || "";
      return raw
        .split(/\s+/)
        .map((c) => c.trim())
        .filter(Boolean);
    }

    function setActiveButton(targetBtn) {
      buttons.forEach((btn) => {
        const isActive = btn === targetBtn;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function updateLiveRegion(visibleCount) {
      const total = cards.length;
      if (!liveRegion) return;
      if (visibleCount === total) {
        liveRegion.textContent = `${visibleCount} item${
          visibleCount === 1 ? "" : "s"
        } shown`;
      } else {
        liveRegion.textContent = `${visibleCount} of ${total} item${
          total === 1 ? "" : "s"
        } shown`;
      }
    }

    function applyFilter(filterValue, sourceButton) {
      const filter = filterValue || "all";

      if (sourceButton) {
        setActiveButton(sourceButton);
      } else {
        const btn = buttons.find(
          (b) => b.getAttribute("data-filter") === filter
        );
        if (btn) setActiveButton(btn);
      }

      let visibleCount = 0;

      cards.forEach((card) => {
        const categories = getCardCategories(card);
        const show =
          filter === "all" ||
          (categories.length && categories.includes(filter));

        // برای انیمیشن، کلاس رو هم می‌تونیم کنترل کنیم
        card.hidden = !show;
        card.classList.toggle("is-filtered-out", !show);
        if (show) visibleCount += 1;
      });

      updateLiveRegion(visibleCount);
    }

    // کلیک روی filter bar (event delegation)
    filterBar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      event.preventDefault();

      const filter = button.getAttribute("data-filter") || "all";
      applyFilter(filter, button);
    });

    // اینیت اولیه: از data-initial-filter یا از دکمه‌ی active
    const initialFromAttr = filterBar.getAttribute("data-initial-filter");
    const activeBtn =
      buttons.find((b) => b.classList.contains("active")) ||
      buttons[0]; // fallback به اولین دکمه

    const initialFilter =
      initialFromAttr ||
      activeBtn?.getAttribute("data-filter") ||
      "all";

    applyFilter(initialFilter, activeBtn);
  });
})();
