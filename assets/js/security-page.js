(function () {
    "use strict";
    document.addEventListener("DOMContentLoaded", function () {
      const copyBtn = document.getElementById("copy-fingerprint");
      const fingerprintEl = document.getElementById("pgp-fingerprint");
      if (!copyBtn || !fingerprintEl) return;
  
      const lang = document.documentElement.lang || "en";
      const messages = {
        success: lang.startsWith("fa")
          ? "فینگرپرینت کپی شد! ✅"
          : "Fingerprint copied! ✅",
        fail: lang.startsWith("fa")
          ? "کپی فینگرپرینت با خطا مواجه شد."
          : "Failed to copy fingerprint.",
        unsupported: lang.startsWith("fa")
          ? "مرورگر شما از کپی کردن پشتیبانی نمی‌کند."
          : "Your browser does not support copying.",
      };
  
      copyBtn.addEventListener("click", async () => {
        const text = fingerprintEl.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            if (typeof createToast === "function") {
              createToast(messages.success);
            }
          } catch (err) {
            console.error("Failed to copy fingerprint:", err);
            if (typeof createToast === "function") {
              createToast(messages.fail);
            }
          }
        } else {
          if (typeof createToast === "function") {
            createToast(messages.unsupported);
          }
        }
      });
    });
  })();