(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    const lang = document.documentElement.lang || "en";
    const messages = {
      success: lang.startsWith("fa") ? "کپی شد! ✅" : "Copied! ✅",
      fail: lang.startsWith("fa") ? "عملیات کپی ناموفق بود." : "Failed to copy.",
      unsupported: lang.startsWith("fa")
        ? "مرورگر از کپی پشتیبانی نمی‌کند."
        : "Your browser does not support copying.",
    };

    function handleCopyClick(event) {
      const btn = event.currentTarget;
      let text = btn.dataset.copyText || "";
      if (!text) {
        const targetId = btn.dataset.copyTarget;
        const targetEl = document.getElementById(targetId);
        if (targetEl) text = targetEl.textContent.trim();
      }
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            if (typeof createToast === "function") {
              createToast(messages.success);
            }
          })
          .catch((err) => {
            console.error("Copy failed:", err);
            if (typeof createToast === "function") {
              createToast(messages.fail);
            }
          });
        } else if (typeof createToast === "function") {
          createToast(messages.unsupported);
      }
    }
  
      document.querySelectorAll(".copy-button").forEach((btn) => {
        btn.addEventListener("click", handleCopyClick);
      });
      const timelineItems = document.querySelectorAll(".timeline li");
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries, obs) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("timeline-item-visible");
                obs.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.3 }
        );
        timelineItems.forEach((item) => observer.observe(item));
      } else {
        timelineItems.forEach((item) => item.classList.add("timeline-item-visible"));
      }

      const expirationEl = document.getElementById("policy-expiration");
      if (expirationEl) {
        fetch("/.well-known/security.txt")
          .then((res) => res.text())
          .then((text) => {
            const match = text.match(/^Expires:\s*(.+)$/m);
            if (match) {
              const expireDate = new Date(match[1].trim());
              const locale = lang.startsWith("fa") ? "fa-IR" : "en-US";
              const opts = { year: "numeric", month: "long", day: "numeric" };
              const label = lang.startsWith("fa")
                ? `اعتبار سیاست تا ${expireDate.toLocaleDateString(locale, opts)}`
                : `Policy valid until ${expireDate.toLocaleDateString(locale, opts)}`;
              expirationEl.textContent = label;
              if (expireDate <= new Date()) {
                expirationEl.classList.add("expired");
              }
            } else {
              expirationEl.textContent = lang.startsWith("fa")
                ? "تاریخ اعتبار در دسترس نیست."
                : "Expiration date unavailable.";
            }
          })
          .catch(() => {
            expirationEl.textContent = lang.startsWith("fa")
              ? "خطا در دریافت تاریخ اعتبار."
              : "Failed to load expiration date.";
          });
      }
  });
})();
