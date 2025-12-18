(function () {
  "use strict";

  // جلوگیری از اجرا در محیط‌های SSR/Node
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const filterBar = document.querySelector(".filter-bar");
    if (!filterBar) {return;}

    const cards = Array.from(document.querySelectorAll(".presskit-card"));
    if (!cards.length) {return;}

    const buttons = Array.from(
      filterBar.querySelectorAll("button[data-filter]")
    );
    if (!buttons.length) {return;}

    const ALL_FILTER = "all";
    let currentFilter = ALL_FILTER;

    // تشخیص زبان
    const langAttr =
      filterBar.dataset.lang ||
      document.documentElement.lang ||
      "en";
    const isFarsi = langAttr.toLowerCase().startsWith("fa");

    // Live region برای اعلام تعداد نتایج
    let liveRegion = filterBar.querySelector('[data-filter-live="true"]');
    if (!liveRegion) {
      liveRegion = document.createElement("span");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.setAttribute("role", "status");
      liveRegion.dataset.filterLive = "true";
      liveRegion.className = "filter-live sr-only"; // .sr-only باید در CSS تعریف شود
      filterBar.appendChild(liveRegion);
    }

    /**
     * دریافت دسته‌های یک کارت از data-category
     * پشتیبانی از چند دسته با جداکننده‌ی space
     */
    function getCardCategories(card) {
      const raw = card.dataset.category || "";
      return raw
        .split(/\s+/)
        .map((c) => c.trim())
        .filter(Boolean);
    }

    /**
     * ساختار داده‌ی داخلی برای کارت‌ها
     */
    const items = cards.map((card) => ({
      card,
      categories: getCardCategories(card),
    }));
    const totalItems = items.length;

    function setActiveButton(targetBtn) {
      if (!targetBtn) {return;}

      buttons.forEach((btn) => {
        const isActive = btn === targetBtn;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function updateLiveRegion(visibleCount) {
      if (!liveRegion) {return;}

      if (isFarsi) {
        if (visibleCount === totalItems) {
          liveRegion.textContent =
            visibleCount === 0
              ? "هیچ موردی نمایش داده نمی‌شود"
              : `${visibleCount} مورد نمایش داده شد`;
        } else {
          liveRegion.textContent =
            visibleCount === 0
              ? "هیچ موردی با این فیلتر یافت نشد"
              : `${visibleCount} مورد از ${totalItems} مورد نمایش داده شد`;
        }
        return;
      }

      // حالت انگلیسی
      const itemWord = visibleCount === 1 ? "item" : "items";
      const totalWord = totalItems === 1 ? "item" : "items";

      if (visibleCount === totalItems) {
        liveRegion.textContent =
          visibleCount === 0
            ? "No items shown"
            : `${visibleCount} ${itemWord} shown`;
      } else {
        liveRegion.textContent =
          visibleCount === 0
            ? "No items match this filter"
            : `${visibleCount} of ${totalItems} ${totalWord} shown`;
      }
    }

    function applyFilter(filterValue, sourceButton) {
      const filter = filterValue || ALL_FILTER;
      const isAllFilter = filter === ALL_FILTER;

      // اگر فیلتر تغییری نکرده، لازم نیست دوباره همه‌چیز رندر شود
      if (filter === currentFilter && !sourceButton) {
        return;
      }
      currentFilter = filter;

      // اگر از سمت دکمه صدا زده نشد، سعی کن دکمه‌ی مربوط به این فیلتر را پیدا کنی
      const activeButton =
        sourceButton ||
        buttons.find((b) => (b.dataset.filter || ALL_FILTER) === filter) ||
        buttons[0];

      setActiveButton(activeButton);

      let visibleCount = 0;

      items.forEach(({ card, categories }) => {
        const show =
          isAllFilter ||
          (categories.length > 0 && categories.includes(filter));

        card.hidden = !show;
        card.classList.toggle("is-filtered-out", !show);

        if (show) {visibleCount += 1;}
      });

      updateLiveRegion(visibleCount);
    }

    // کلیک روی filter bar (event delegation)
    filterBar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) {return;}

      event.preventDefault();

      const filter = button.dataset.filter || ALL_FILTER;
      applyFilter(filter, button);
    });

    // اینیت اولیه:
    // ۱. data-initial-filter روی خود filter-bar
    // ۲. اگر نبود، دکمه‌ی active
    // ۳. اگر هیچ‌کدام نبود، اولین دکمه
    const initialFromAttr = filterBar.dataset.initialFilter;
    const defaultBtn =
      buttons.find((b) => b.classList.contains("active")) || buttons[0];

    const initialFilter =
      initialFromAttr ||
      (defaultBtn ? defaultBtn.dataset.filter : ALL_FILTER) ||
      ALL_FILTER;

    // اینجا دکمه را به applyFilter پاس نمی‌دهیم تا خودش براساس initialFilter دکمه‌ی درست را پیدا کند
    applyFilter(initialFilter);
  });
})();
