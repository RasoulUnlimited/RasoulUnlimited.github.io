(function () {
  "use strict";

  // جلوگیری از اجرا در محیط‌هایی مثل SSR/Node
  const supportsDOM =
    typeof window !== "undefined" && typeof document !== "undefined";

  if (!supportsDOM) {return;}

  const HIDDEN_CLASS = "card-hidden";
  const VISIBLE_CLASS = "card-visible";

  const OBSERVER_OPTIONS = {
    root: null,
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.1,
  };

  /**
   * یک کارت را نمایش می‌دهد (کلاس‌های لازم را ست می‌کند)
   * @param {HTMLElement} card
   */
  function revealCard(card) {
    if (!card) {return;}
    card.classList.remove(HIDDEN_CLASS);
    card.classList.add(VISIBLE_CLASS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const cardsNodeList = document.querySelectorAll(".credential-card");
    if (!cardsNodeList || !cardsNodeList.length) {return;}

    // در صورت نیاز بعداً از متدهای آرایه استفاده کنیم
    const cards = Array.from(cardsNodeList);

    let observer = null;

    /**
     * همه‌ی کارت‌ها را بدون انیمیشن اسکرول نمایش بده
     * و اگر observer فعال است آن را قطع کن.
     */
    const showCardsImmediately = () => {
      cards.forEach(revealCard);

      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    // هندلینگ prefers-reduced-motion
    const supportsMatchMedia = typeof window.matchMedia === "function";
    if (supportsMatchMedia) {
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

      // اگر از ابتدا reduce بوده، کلاً انیمیشن‌ها را غیر فعال کن
      if (motionQuery.matches) {
        showCardsImmediately();
        return;
      }

      const handleMotionChange = (e) => {
        const prefersReduced = !!(e && e.matches);
        if (prefersReduced) {
          // اگر کاربر وسط کار motion را reduce کرد، انیمیشن‌ها را متوقف کن
          showCardsImmediately();
        }
        // اگر کاربر از reduce برگشت به normal، عمداً
        // دوباره observer را راه نمی‌اندازیم تا رفتار قابل پیش‌بینی بماند.
      };

      // API جدید
      if (typeof motionQuery.addEventListener === "function") {
        motionQuery.addEventListener("change", handleMotionChange);
      }
      // برای مرورگرهای قدیمی‌تر
      else if (typeof motionQuery.addListener === "function") {
        motionQuery.addListener(handleMotionChange);
      }
    }

    const supportsIO = "IntersectionObserver" in window;
    // اگر IntersectionObserver وجود ندارد، همه کارت‌ها را بدون انیمیشن نشان بده
    if (!supportsIO) {
      showCardsImmediately();
      return;
    }

    // حالت عادی: کارت‌ها ابتدا مخفی، با اسکرول وارد می‌شوند
    cards.forEach((card) => {
      card.classList.add(HIDDEN_CLASS);
      card.classList.remove(VISIBLE_CLASS);
    });

    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {return;}

        const card = entry.target;
        revealCard(card);

        // فقط یک بار برای هر کارت کافی است
        obs.unobserve(card);
      });
    }, OBSERVER_OPTIONS);

    cards.forEach((card) => observer.observe(card));
  });
})();
