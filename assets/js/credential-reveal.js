(function () {
  "use strict";

  // جلوگیری از ارور در محیط‌هایی مثل SSR/Node
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".credential-card");
    if (!cards.length) return;

    let observer = null;

    const showCardsImmediately = () => {
      cards.forEach((card) => {
        card.classList.remove("card-hidden");
        card.classList.add("card-visible");
      });

      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    // هندلینگ prefers-reduced-motion
    let prefersReduced = false;
    let motionQuery = null;

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
    if (!("IntersectionObserver" in window) || prefersReduced) {
      showCardsImmediately();
      return;
    }

    // حالت عادی: کارت‌ها ابتدا مخفی، با اسکرول وارد می‌شوند
    cards.forEach((card) => {
      card.classList.add("card-hidden");
      card.classList.remove("card-visible");
    });

    observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const card = entry.target;
          card.classList.add("card-visible");
          card.classList.remove("card-hidden");

          obs.unobserve(card);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1,
      }
    );

    cards.forEach((card) => observer.observe(card));
  });
})();
