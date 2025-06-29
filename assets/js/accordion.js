(function () {
  "use strict";

  function initAccordion(accordion) {
    const items = Array.from(accordion.querySelectorAll(".accordion-item"));
    const headers = [];

    items.forEach((item, index) => {
      const header = item.querySelector(".accordion-header");
      const content = item.querySelector(".accordion-content");
      if (!header || !content) return;

      const headerId = header.id || `accordion-header-${index}`;
      const contentId = content.id || `accordion-content-${index}`;
      header.id = headerId;
      content.id = contentId;
      header.setAttribute("aria-controls", contentId);
      header.setAttribute("aria-expanded", "false");
      content.setAttribute("aria-labelledby", headerId);
      content.hidden = true;

      function closeOthers() {
        items.forEach((other) => {
          if (other !== item) {
            const oh = other.querySelector(".accordion-header");
            const oc = other.querySelector(".accordion-content");
            if (oh && oc) {
              oh.setAttribute("aria-expanded", "false");
              oc.hidden = true;
              other.classList.remove("expanded");
            }
          }
        });
      }

      function toggle() {
        const expanded = header.getAttribute("aria-expanded") === "true";
        if (expanded) {
          header.setAttribute("aria-expanded", "false");
          content.hidden = true;
          item.classList.remove("expanded");
        } else {
          closeOthers();
          header.setAttribute("aria-expanded", "true");
          content.hidden = false;
          item.classList.add("expanded");
        }
      }

      header.addEventListener("click", toggle);
      header.addEventListener("keydown", (e) => {
        const currentIndex = headers.indexOf(header);
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          headers[(currentIndex + 1) % headers.length].focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          headers[(currentIndex - 1 + headers.length) % headers.length].focus();
        } else if (e.key === "Home") {
          e.preventDefault();
          headers[0].focus();
        } else if (e.key === "End") {
          e.preventDefault();
          headers[headers.length - 1].focus();
        }
      });

      headers.push(header);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".accordion").forEach(initAccordion);
  });
})();
