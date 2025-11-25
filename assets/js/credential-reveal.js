(function () {
  "use strict";

  function initCredentialReveal() {
    // Only select cards that haven't been initialized yet
    const cards = document.querySelectorAll(".credential-card:not(.js-reveal-init)");
    if (!cards.length) {return;}

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReduced = motionQuery.matches;

    // Mark cards as initialized to prevent double-processing
    cards.forEach(card => card.classList.add("js-reveal-init"));

    // در هر حالتی که نمی‌خواهیم افکت اسکرول داشته باشیم، کارت‌ها را بلافاصله نمایش بده
    const showCardsImmediately = () => {
      cards.forEach((card) => {
        card.classList.remove("card-hidden");
        card.classList.add("card-visible");
      });
    };

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

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {return;}

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
  }

  document.addEventListener("DOMContentLoaded", initCredentialReveal);
  document.addEventListener("includesLoaded", initCredentialReveal);
})();
