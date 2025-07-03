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

    const DAY_MS = 86400000;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function disableMotion() {
      document.querySelectorAll("[data-aos]").forEach((el) => {
        el.removeAttribute("data-aos");
      });
      document.querySelectorAll(".skeleton").forEach((el) => {
        el.classList.remove("skeleton");
      });
    }
    if (prefersReduced.matches) {
      disableMotion();
    }
    prefersReduced.addEventListener("change", (e) => {
      if (e.matches) disableMotion();
    });

    function storageAvailable() {
      try {
        const test = "__test";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    }

    async function cachedFetch(url, key, ttl, parser, timeout = 5000) {
      if (storageAvailable()) {
        try {
          const cached = JSON.parse(localStorage.getItem(key) || "null");
          if (cached && Date.now() - cached.t < ttl) {
            return cached.d;
          }
        } catch (e) {}
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);
      const data = await parser(res);
      if (storageAvailable()) {
        try {
          localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
        } catch (e) {}
      }
      return data;
    }

    function copyTextToClipboard(text) {
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
        } else {
          const hidden = document.createElement("textarea");
          hidden.value = text;
          hidden.setAttribute("readonly", "");
          hidden.style.position = "absolute";
          hidden.style.left = "-9999px";
          document.body.appendChild(hidden);
          hidden.select();
          try {
            const successful = document.execCommand("copy");
            if (typeof createToast === "function") {
              createToast(successful ? messages.success : messages.fail);
            }
          } catch (err) {
            console.error("execCommand copy failed:", err);
            if (typeof createToast === "function") {
              createToast(messages.fail);
            }
          }
          document.body.removeChild(hidden);
      }
    }

    function handleCopyClick(event) {
      const btn = event.currentTarget;
      let text = btn.dataset.copyText || "";
      if (!text) {
        const targetId = btn.dataset.copyTarget;
        const targetEl = document.getElementById(targetId);
        if (targetEl) text = targetEl.textContent.trim();
      }
      copyTextToClipboard(text);
    }
  
      document.querySelectorAll(".copy-button").forEach((btn) => {
        btn.addEventListener("click", handleCopyClick);
      });

      document.querySelectorAll(".copyable").forEach((el) => {
        const handler = () =>
          copyTextToClipboard(el.dataset.copyText || el.textContent.trim());
        el.addEventListener("click", handler);
        el.addEventListener("keypress", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handler();
          }
        });
      });

      const DEFAULT_TIMELINE = [
        {
          date: "2025-05-16",
          icon: "fa-rocket",
          title_fa: "شروع وب‌سایت",
          title_en: "Website launched",
          desc_fa: "انتشار اولیه سایت با نگاه به امنیت و عملکرد.",
          desc_en: "Initial release with a focus on performance and safety.",
        },
        {
          date: "2025-05-25",
          icon: "fa-cloud",
          title_fa: "ادغام با Cloudflare",
          title_en: "Integrated with Cloudflare",
          desc_fa: "بهبود سرعت و امنیت از طریق شبکه توزیع کلودفلر.",
          desc_en: "Enhanced speed and security via Cloudflare CDN.",
        },
        {
          date: "2025-06-01",
          icon: "fa-shield-alt",
          title_fa: "اعمال CSP سخت‌گیرانه",
          title_en: "Strict CSP enforced",
          desc_fa: "اجرای سیاست‌های دقیق برای جلوگیری از حملات وب.",
          desc_en: "Implemented tighter policies to prevent web attacks.",
        },
        {
          date: "2025-07-10",
          icon: "fa-key",
          title_fa: "انتشار کلید عمومی PGP",
          title_en: "PGP key published",
          desc_fa: "امکان ارتباط رمزنگاری‌شده فراهم شد.",
          desc_en: "Secure encrypted communication enabled.",
        },
        {
          date: "2025-07-20",
          icon: "fa-bell",
          title_fa: "راه‌اندازی اعلان‌های امنیتی",
          title_en: "Security advisories live",
          desc_fa: "به‌روزرسانی‌های امنیتی از طریق GitHub در دسترس قرار گرفت.",
          desc_en: "Security updates now published via GitHub advisories.",
        },
      ];

      function renderTimeline(events) {
        timelineList.innerHTML = "";
        events.forEach((ev) => {
          const li = document.createElement("li");
          li.dataset.aos = "fade-up";
          li.tabIndex = 0;
          li.setAttribute("role", "listitem");

          const content = document.createElement("div");
          content.className = "timeline-content";

          const iconWrap = document.createElement("div");
          iconWrap.className = "timeline-icon";
          iconWrap.innerHTML = `<i class="fas ${ev.icon}" aria-hidden="true"></i>`;
          content.appendChild(iconWrap);

          const dateEl = document.createElement("h3");
          dateEl.className = "date";
          dateEl.innerHTML = `<time datetime="${ev.date}">${ev.date}</time>`;
          content.appendChild(dateEl);

          const titleEl = document.createElement("h3");
          titleEl.textContent = lang.startsWith("fa") ? ev.title_fa : ev.title_en;
          content.appendChild(titleEl);

          const descEl = document.createElement("p");
          descEl.textContent = lang.startsWith("fa") ? ev.desc_fa : ev.desc_en;
          content.appendChild(descEl);

          li.appendChild(content);
          timelineList.appendChild(li);
        });
      }

      const timelineList = document.getElementById("security-timeline-list");
      if (timelineList) {
        cachedFetch(
          "/assets/data/security-timeline.json",
          "security-timeline",
          DAY_MS,
          (res) => res.json()
        )
          .then((events) => {
            renderTimeline(events);
            timelineList.setAttribute("aria-busy", "false");
            initializeTimeline();
          })
          .catch(() => {
            renderTimeline(DEFAULT_TIMELINE);
            timelineList.setAttribute("aria-busy", "false");
            initializeTimeline();
          });
      } else {
        initializeTimeline();
      }

      function initializeTimeline() {
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
      const progressEl = document.getElementById("policy-expiration-progress");
      const daysTextEl = document.getElementById("expiration-days");
      if (expirationEl) {
        cachedFetch(
          "/.well-known/security.txt",
          "security-txt",
          DAY_MS,
          (res) => res.text()
        )
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
              const now = new Date();
              const diffDays = (expireDate - now) / (1000 * 60 * 60 * 24);
              let daysLabel = "";
              if (progressEl) {
                const totalDays = 365;
                const percent = Math.min(
                  100,
                  Math.max(0, ((totalDays - diffDays) / totalDays) * 100)
                );
                progressEl.value = percent;
                progressEl.removeAttribute("aria-hidden");
                progressEl.setAttribute("aria-valuenow", percent.toFixed(0));
                daysLabel = lang.startsWith("fa")
                  ? `${Math.ceil(diffDays)} روز باقیمانده`
                  : `${Math.ceil(diffDays)} days remaining`;
                progressEl.setAttribute("aria-valuetext", daysLabel);
              }
              if (daysTextEl) {
                daysTextEl.textContent = daysLabel;
                daysTextEl.classList.remove("hidden");
                daysTextEl.setAttribute("aria-hidden", "false");
              }
              if (diffDays <= 0) {
                expirationEl.classList.add("expired");
                progressEl && progressEl.classList.add("expired");
              } else if (diffDays <= 30) {
                expirationEl.classList.add("expiring");
                progressEl && progressEl.classList.add("expiring");
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
            if (daysTextEl) {
              daysTextEl.classList.add("hidden");
              daysTextEl.setAttribute("aria-hidden", "true");
            }
          });
      }

      const domainEl = document.getElementById("scope-domain");
      if (domainEl) {
        domainEl.innerHTML = `<code>${location.hostname}</code>`;
      }

      const lastUpdatedEl = document.getElementById("last-updated-date");
      if (lastUpdatedEl) {
        const apiUrl =
          "https://api.github.com/repos/RasoulUnlimited/RasoulUnlimited.github.io/commits?path=security.html&page=1&per_page=1";
        cachedFetch(apiUrl, "security-last", DAY_MS, (res) => res.json())
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              const commitDate = new Date(data[0].commit.committer.date);
              const locale = lang.startsWith("fa") ? "fa-IR" : "en-US";
              const opts = { year: "numeric", month: "long", day: "numeric" };
              lastUpdatedEl.textContent = commitDate.toLocaleDateString(
                locale,
                opts
              );
            }
          })
          .catch(() => {});
      }

      const advisoriesList = document.getElementById("advisories-list");
      if (advisoriesList) {
        advisoriesList.innerHTML = "";
        const advUrl =
          "https://api.github.com/repos/RasoulUnlimited/RasoulUnlimited.github.io/security-advisories?per_page=3";
        cachedFetch(advUrl, "security-advisories", DAY_MS, (res) => res.json())
          .then((advs) => {
            if (Array.isArray(advs) && advs.length > 0) {
              advs.forEach((adv) => {
                const li = document.createElement("li");
                const link = document.createElement("a");
                link.href = adv.html_url;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = adv.summary || adv.ghsa_id || adv.id;
                li.appendChild(link);
                advisoriesList.appendChild(li);
              });
            } else {
              advisoriesList.textContent = lang.startsWith("fa")
                ? "موردی یافت نشد."
                : "No advisories found.";
            }
          })
          .catch(() => {
            advisoriesList.textContent = lang.startsWith("fa")
              ? "خطا در دریافت اعلان‌ها."
              : "Failed to load advisories.";
          });
      }
  }});
})();
