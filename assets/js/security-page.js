(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    const lang = document.documentElement.lang || "en";
    const messages = {
      success: lang.startsWith("fa") ? "کپی شد! ✅" : "Copied! ✅",
      fail: lang.startsWith("fa") ? "عملیات کپی ناموفق بود." : "Failed to copy.",
      unsupported: lang.startsWith("fa") ? "مرورگر از کپی پشتیبانی نمی‌کند." : "Your browser does not support copying.",
      offline: lang.startsWith("fa") ? "شما آفلاین هستید." : "You are offline.",
      online: lang.startsWith("fa") ? "اتصال برقرار شد." : "Back online."
    };

    const DAY_MS = 86400000;
    function formatRelative(date) {
      if (!date || !window.Intl || !Intl.RelativeTimeFormat) return "";
      const diff = Date.now() - date.getTime();
      const units = [["year",31536000000],["month",2592000000],["week",604800000],["day",86400000],["hour",3600000],["minute",60000],["second",1000]];
      for (const [unit, ms] of units) {
        if (Math.abs(diff) >= ms || unit === "second") {
          const rtf = new Intl.RelativeTimeFormat(lang.startsWith("fa") ? "fa" : "en", { numeric: "auto" });
          return rtf.format(-Math.round(diff / ms), unit);
        }
      }
      return "";
    }
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

    function normalizeText(str) {
      if (!str) return "";
      const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
      return str
        .replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d))
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .toLowerCase();
    }

    function getStorage() {
      const test = "__test";
      try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return localStorage;
      } catch (e) {
        try {
          sessionStorage.setItem(test, test);
          sessionStorage.removeItem(test);
          return sessionStorage;
        } catch (err) {
          return null;
        }
      }
    }
    const storage = getStorage();

    async function cachedFetch(url, key, ttl, parser, timeout = 5000) {
      let cached = null;
      if (storage) {
        try { cached = JSON.parse(storage.getItem(key) || "null"); } catch (e) {}
      }
      if (cached && (Date.now() - cached.t < ttl || !navigator.onLine)) {
        return cached.d;
      }
      if (!navigator.onLine) throw new Error("offline");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) {
        if (cached) return cached.d;
        throw new Error(res.statusText || "fetch error");
      }
      const data = await parser(res);
      if (storage) {
        try {
          storage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
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
      const connectionEl = document.getElementById("connection-status");
      function updateConnection() {
        if (!connectionEl) return;
        const online = navigator.onLine;
        connectionEl.textContent = online
          ? lang.startsWith("fa")
            ? "اتصال اینترنت برقرار است."
            : "You are online."
          : lang.startsWith("fa")
            ? "شما آفلاین هستید. برخی قابلیت‌ها غیرفعال است."
            : "You are offline. Some features may be unavailable.";
        document.body.classList.toggle("offline", !online);
      }
      window.addEventListener("online", () => {
        updateConnection();
        if (typeof createToast === "function") createToast(messages.online);
      });
      window.addEventListener("offline", () => {
        updateConnection();
        if (typeof createToast === "function") createToast(messages.offline);
      });
      updateConnection();


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
        {
          date: "2025-10-01",
          icon: "fa-wifi",
          title_fa: "افزودن پشتیبانی آفلاین",
          title_en: "Offline support added",
          desc_fa: "بهبود تجربه کاربر با کش محلی و هشدار وضعیت اتصال.",
          desc_en: "Improved user experience with local caching and connection status alerts.",
        },
      ];

      function renderTimeline(events) {
        timelineList.innerHTML = "";
        events
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .forEach((ev) => {
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
      const timelineSearch = document.getElementById("timeline-search");
      const clearSearchBtn = document.getElementById("clear-timeline-search");
      const noResultsEl = document.getElementById("timeline-no-results");
      let timelineData = [];
      if (timelineList) {
        cachedFetch(
          "/assets/data/security-timeline.json",
          "security-timeline",
          DAY_MS,
          (res) => res.json()
        )
          .then((events) => {
            timelineData = events;
            renderTimeline(events);
            timelineList.setAttribute("aria-busy", "false");
            initializeTimeline();
            setupTimelineSearch();
          })
          .catch(() => {
            timelineData = DEFAULT_TIMELINE;
            renderTimeline(timelineData);
            timelineList.setAttribute("aria-busy", "false");
            initializeTimeline();
            setupTimelineSearch();
          });
      } else {
        initializeTimeline();
      }

      function setupTimelineSearch() {
        if (!timelineSearch) return;
        function filterList(term) {
          const q = normalizeText(term.trim());
          const reg = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
          let count = 0;
          timelineList.querySelectorAll("li").forEach((li) => {
            const contentEl = li.querySelector(".timeline-content");
            if (!contentEl) return;
            if (!li.dataset.orig) li.dataset.orig = contentEl.innerHTML;
            const text = normalizeText(li.textContent);
            const match = q && text.includes(q);
            li.style.display = match || !q ? "" : "none";
            if (match) {
              count++;
              contentEl.innerHTML = li.dataset.orig.replace(reg, '<span class="search-highlight">$1</span>');
            } else {
              contentEl.innerHTML = li.dataset.orig;
            }
          });
          if (clearSearchBtn) clearSearchBtn.classList.toggle("visually-hidden", !q);
          if (noResultsEl) {
            noResultsEl.classList.toggle("hidden", count !== 0);
            noResultsEl.classList.toggle("visible", count === 0);
          }
        }

        let debounceTimer;
        timelineSearch.addEventListener("input", () => {
          const term = timelineSearch.value;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => filterList(term), 200);
        });

        clearSearchBtn && clearSearchBtn.addEventListener("click", () => {
          timelineSearch.value = "";
          clearSearchBtn.classList.add("visually-hidden");
          filterList("");
        });

        filterList("");
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
              const locale = lang.startsWith('fa') ? 'fa-IR' : 'en-US';
              const opts = { year: 'numeric', month: 'long', day: 'numeric' };
              const dateStr = commitDate.toLocaleDateString(locale, opts);
              const rel = formatRelative(commitDate);
              lastUpdatedEl.textContent = rel ? `${dateStr} (${rel})` : dateStr;
            }
          })
          .catch(() => {});
      }

      const advisoriesList = document.getElementById("advisories-list");
      const refreshAdvisoriesBtn = document.getElementById("refresh-advisories");

      function loadAdvisories(force = false) {
        if (!advisoriesList) return;
        advisoriesList.innerHTML = "";
        const advUrl =
          "https://api.github.com/repos/RasoulUnlimited/RasoulUnlimited.github.io/security-advisories?per_page=3";
        const key = "security-advisories";
        if (force && storage) {
          try { storage.removeItem(key); } catch (e) {}
        }
        cachedFetch(advUrl, key, DAY_MS, (res) => res.json())
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

      if (refreshAdvisoriesBtn) {
        refreshAdvisoriesBtn.addEventListener("click", () => loadAdvisories(true));
      }

      if (advisoriesList) {
        loadAdvisories();
      }

      const shareBtn = document.getElementById("share-page");
      if (shareBtn) {
        shareBtn.addEventListener("click", () => {
          if (navigator.share) {
            navigator
              .share({ title: document.title, url: location.href })
              .catch(() => copyTextToClipboard(location.href));
          } else {
            copyTextToClipboard(location.href);
          }
        });
      }
  }});
})();
