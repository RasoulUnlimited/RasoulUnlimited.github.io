(function () {
  "use strict";

  // جلوگیری از ارور در محیط‌هایی مثل SSR/Node
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

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
    card.classList.remove(HIDDEN_CLASS);
    card.classList.add(VISIBLE_CLASS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".credential-card");
    if (!cards.length) return;

    let observer = null;
    let motionQuery = null;
    let prefersReduced = false;

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
    if ("matchMedia" in window) {
      motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReduced = motionQuery.matches;

      const handleMotionChange = (e) => {
        prefersReduced = !!e.matches;
        if (prefersReduced) {
          // اگر کاربر وسط کار motion را reduce کرد، انیمیشن‌ها را متوقف کن
          showCardsImmediately();
        }
      };

      if (typeof motionQuery.addEventListener === "function") {
        motionQuery.addEventListener("change", handleMotionChange);
      } else if (typeof motionQuery.addListener === "function") {
        // برای مرورگرهای قدیمی‌تر
        motionQuery.addListener(handleMotionChange);
      }
    }

    // اگر IntersectionObserver نیست یا کاربر motion را کم کرده، انیمیشن اسکرول نداشته باش
    const hasIntersectionObserver = "IntersectionObserver" in window;
    if (!hasIntersectionObserver || prefersReduced) {
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
        if (!entry.isIntersecting) return;

        const card = entry.target;
        revealCard(card);

        // فقط یک بار برای هر کارت کافی است
        obs.unobserve(card);
      });
    }, OBSERVER_OPTIONS);

    cards.forEach((card) => observer.observe(card));
  });
})();
