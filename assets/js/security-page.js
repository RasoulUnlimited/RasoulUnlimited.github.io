(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    const lang = document.documentElement.lang || "en";
    const messages = {
      success: lang.startsWith("fa") ? "کپی شد! ✅" : "Copied! ✅",
      fail: lang.startsWith("fa") ? "عملیات کپی ناموفق بود." : "Failed to copy.",
      unsupported: lang.startsWith("fa") ? "مرورگر از کپی پشتیبانی نمی‌کند." : "Your browser does not support copying.",
      offline: lang.startsWith("fa") ? "شما آفلاین هستید." : "You are offline.",
      online: lang.startsWith("fa") ? "اتصال برقرار شد." : "Back online.",
      refreshed: lang.startsWith("fa") ? "بروزرسانی شد! ✅" : "Updated! ✅",
      fetchFail: lang.startsWith("fa") ? "خطا در بارگیری داده." : "Failed to load data.",
      rateLimit: lang.startsWith("fa")
        ? "محدودیت نرخ GitHub فعال شده است."
        : "GitHub rate limit exceeded."
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

    function addMediaQueryChangeListener(mediaQueryList, handler) {
      if (!mediaQueryList || typeof handler !== "function") return;
      if (typeof mediaQueryList.addEventListener === "function") {
        mediaQueryList.addEventListener("change", handler);
      } else if (typeof mediaQueryList.addListener === "function") {
        mediaQueryList.addListener(handler);
      }
    }
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
    addMediaQueryChangeListener(prefersReduced, (e) => {
      if (e.matches) disableMotion();
    });

    const smallScreen = window.matchMedia("(max-width: 600px)");
    if (smallScreen.matches) {
      disableMotion();
    }
    addMediaQueryChangeListener(smallScreen, (e) => {
      if (e.matches) disableMotion();
    });

    function normalizeText(str) {
      if (!str) return "";
      const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
      return str
        .normalize("NFKD")
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
    const TIMELINE_SEARCH_KEY = "timeline-search-term";
    const TIMELINE_YEAR_KEY = "timeline-year";

    let refreshTimelineBtn;
    let refreshAdvisoriesBtn;

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
        if (res.status === 403 && res.headers.get("X-RateLimit-Remaining") === "0") {
          throw new Error("rate-limit");
        }
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
        [refreshTimelineBtn, refreshAdvisoriesBtn].forEach((btn) => {
          if (btn) btn.disabled = !online;
        });
      }
      window.addEventListener("online", () => {
        updateConnection();
        if (typeof createToast === "function") createToast(messages.online);
        loadTimeline(true);
        loadAdvisories(true);
        loadPolicyExpiration(true);
        loadLastUpdated(true);
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
          .sort((a, b) =>
            sortAsc ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
          )
          .forEach((ev) => {
          const li = document.createElement("li");
          li.dataset.aos = "fade-up";
          li.dataset.date = ev.date;
          li.tabIndex = 0;
          li.setAttribute("role", "listitem");

          const content = document.createElement("div");
          content.className = "timeline-content";

          const iconWrap = document.createElement("div");
          iconWrap.className = "timeline-icon";
          const iconEl = document.createElement("i");
          iconEl.classList.add("fas");
          const iconClass =
            typeof ev.icon === "string" && /^(fa-[a-z0-9-]+)$/i.test(ev.icon)
              ? ev.icon
              : "fa-shield-alt";
          iconEl.classList.add(iconClass);
          iconEl.setAttribute("aria-hidden", "true");
          iconWrap.appendChild(iconEl);
          content.appendChild(iconWrap);

          const dateEl = document.createElement("h3");
          dateEl.className = "date";
          const timeEl = document.createElement("time");
          timeEl.setAttribute("datetime", ev.date);
          timeEl.textContent = ev.date;
          dateEl.appendChild(timeEl);
          const relTime = formatRelative(new Date(ev.date));
          if (relTime) {
            const relSpan = document.createElement("span");
            relSpan.className = "relative-time";
            relSpan.textContent = relTime;
            dateEl.appendChild(document.createTextNode(" "));
            dateEl.appendChild(relSpan);
          }
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
      const yearFilter = document.getElementById("timeline-year");
      const clearSearchBtn = document.getElementById("clear-timeline-search");
      refreshTimelineBtn = document.getElementById("refresh-timeline");
      const sortBtn = document.getElementById("sort-timeline");
      const noResultsEl = document.getElementById("timeline-no-results");
      const resultsCountEl = document.getElementById("timeline-results-count");
      let timelineData = [];
      let searchInitialized = false;
      let sortAsc = storage ? storage.getItem("timeline-sort") === "asc" : false;

      function updateSortButton() {
        if (!sortBtn) return;
        sortBtn.textContent = lang.startsWith("fa")
          ? sortAsc
            ? "قدیمی‌ترین"
            : "جدیدترین"
          : sortAsc
          ? "Oldest first"
          : "Newest first";
      }
      updateSortButton();

      function loadTimeline(force = false, btn = null) {
        if (!timelineList) return;
        timelineList.innerHTML = "";
        if (btn) {
          btn.classList.add("loading");
          btn.setAttribute("aria-busy", "true");
        }
        const key = "security-timeline";
        if (force && storage) {
          try { storage.removeItem(key); } catch (e) {}
        }
        cachedFetch(
          "/assets/data/security-timeline.json",
          key,
          DAY_MS,
          (res) => res.json()
        )
          .then((events) => {
            timelineData = events;
            if (yearFilter) {
              const years = Array.from(
                new Set(events.map((ev) => new Date(ev.date).getFullYear()))
              ).sort((a, b) => b - a);
              yearFilter.innerHTML = "";
              const defaultOption = document.createElement("option");
              defaultOption.value = "";
              defaultOption.textContent = lang.startsWith("fa")
                ? "همه سال‌ها"
                : "All years";
              yearFilter.appendChild(defaultOption);
              years.forEach((y) => {
                const option = document.createElement("option");
                option.value = String(y);
                option.textContent = String(y);
                yearFilter.appendChild(option);
              });
              const savedYear = storage
                ? storage.getItem(TIMELINE_YEAR_KEY) || ""
                : "";
              if (
                savedYear &&
                Array.from(yearFilter.options).some(
                  (option) => option.value === savedYear
                )
              ) {
                yearFilter.value = savedYear;
              }
            }
            renderTimeline(events);
            timelineList.setAttribute("aria-busy", "false");
            initializeTimeline();
            setupTimelineSearch();
            if (force && typeof createToast === "function") {
              createToast(messages.refreshed);
            }
          })
          .catch((err) => {
            if (typeof createToast === "function") {
              let msg = messages.fetchFail;
              if (err && err.message === "offline") msg = messages.offline;
              else if (err && err.message === "rate-limit") msg = messages.rateLimit;
              createToast(msg);
            }
            timelineData = DEFAULT_TIMELINE;
            renderTimeline(timelineData);
            timelineList.setAttribute("aria-busy", "false");
            initializeTimeline();
            setupTimelineSearch();
          })
          .finally(() => {
            if (btn) {
              btn.classList.remove("loading");
              btn.removeAttribute("aria-busy");
            }
          });
      }

      if (timelineList) {
        loadTimeline();
      } else {
        initializeTimeline();
      }

      function setupTimelineSearch() {
        if (!timelineSearch || searchInitialized) return;
        function filterList(term) {
          const q = normalizeText(term.trim());
          const hasQuery = q.length > 0;
          if (storage) {
            try { storage.setItem(TIMELINE_SEARCH_KEY, term); } catch (e) {}
          }
          const yearVal = yearFilter ? yearFilter.value : "";
          if (storage && yearFilter) {
            try { storage.setItem(TIMELINE_YEAR_KEY, yearVal); } catch (e) {}
          }
          const reg = hasQuery
            ? new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
            : null;
          let count = 0;
          timelineList.querySelectorAll("li").forEach((li) => {
            const contentEl = li.querySelector(".timeline-content");
            if (!contentEl) return;
            if (!li.dataset.orig) li.dataset.orig = contentEl.innerHTML;
            const text = normalizeText(li.textContent);
            const match = hasQuery && text.includes(q);
            const matchYear = !yearVal || (li.dataset.date || "").startsWith(yearVal);
            li.style.display = (match || !hasQuery) && matchYear ? "" : "none";
            if (match && matchYear && reg) {
              count++;
              contentEl.innerHTML = li.dataset.orig.replace(reg, '<span class="search-highlight">$1</span>');
            } else {
              contentEl.innerHTML = li.dataset.orig;
            }
          });
          if (clearSearchBtn)
            clearSearchBtn.classList.toggle("visually-hidden", !hasQuery);
          if (noResultsEl) {
            noResultsEl.classList.toggle("hidden", count !== 0);
            noResultsEl.classList.toggle("visible", count === 0);
          }
          if (resultsCountEl) {
            if (hasQuery) {
              resultsCountEl.textContent = lang.startsWith("fa")
                ? `${count} مورد یافت شد`
                : `${count} result${count === 1 ? "" : "s"} found`;
              resultsCountEl.classList.remove("hidden");
              resultsCountEl.classList.add("visible");
            } else {
              resultsCountEl.classList.add("hidden");
              resultsCountEl.classList.remove("visible");
            }
          }
        }

        let debounceTimer;
        timelineSearch.addEventListener("input", () => {
          const term = timelineSearch.value;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => filterList(term), 200);
        });
        timelineSearch.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            timelineSearch.value = "";
            clearSearchBtn && clearSearchBtn.classList.add("visually-hidden");
            filterList("");
          }
        });

        clearSearchBtn && clearSearchBtn.addEventListener("click", () => {
          timelineSearch.value = "";
          clearSearchBtn.classList.add("visually-hidden");
          filterList("");
        });

        const saved = storage ? storage.getItem(TIMELINE_SEARCH_KEY) || "" : "";
        if (saved) {
          timelineSearch.value = saved;
        }
        if (yearFilter) {
          const savedYear = storage ? storage.getItem(TIMELINE_YEAR_KEY) || "" : "";
          if (savedYear) yearFilter.value = savedYear;
          yearFilter.addEventListener("change", () => filterList(timelineSearch.value));
        }
        filterList(saved);
        searchInitialized = true;
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
      let expireDate = null;
      let expirationIntervalId = null;

      function updateExpirationDisplay() {
        if (!expireDate) return;
        const now = new Date();
        const diffDays = (expireDate - now) / DAY_MS;
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
        expirationEl.classList.remove("expired", "expiring", "warning");
        progressEl && progressEl.classList.remove("expired", "expiring", "warning");
        if (diffDays <= 0) {
          expirationEl.classList.add("expired");
          progressEl && progressEl.classList.add("expired");
        } else if (diffDays <= 30) {
          expirationEl.classList.add("expiring");
          progressEl && progressEl.classList.add("expiring");
        } else if (diffDays <= 90) {
          expirationEl.classList.add("warning");
          progressEl && progressEl.classList.add("warning");
        }
      }

      function loadPolicyExpiration(force = false) {
        if (!expirationEl) return;
        if (force && storage) {
          try { storage.removeItem("security-txt"); } catch (e) {}
        }
        cachedFetch(
          "/.well-known/security.txt",
          "security-txt",
          DAY_MS,
          (res) => res.text()
        )
          .then((text) => {
            const match = text.match(/^Expires:\s*(.+)$/m);
            if (match) {
              expireDate = new Date(match[1].trim());
              const locale = lang.startsWith("fa") ? "fa-IR" : "en-US";
              const opts = { year: "numeric", month: "long", day: "numeric" };
              const label = lang.startsWith("fa")
                ? `اعتبار سیاست تا ${expireDate.toLocaleDateString(locale, opts)}`
                : `Policy valid until ${expireDate.toLocaleDateString(locale, opts)}`;
              expirationEl.textContent = label;
              updateExpirationDisplay();
              if (expirationIntervalId) {
                clearInterval(expirationIntervalId);
              }
              expirationIntervalId = setInterval(updateExpirationDisplay, 3600000);
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
      if (expirationEl) {
        loadPolicyExpiration();
      }

      const domainEl = document.getElementById("scope-domain");
      if (domainEl) {
        domainEl.innerHTML = `<code>${location.hostname}</code>`;
      }

      const lastUpdatedEl = document.getElementById("last-updated-date");

      function loadLastUpdated(force = false) {
        if (!lastUpdatedEl) return;
        if (force && storage) {
          try { storage.removeItem("security-last"); } catch (e) {}
        }
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
          .catch((err) => {
            if (typeof createToast === "function") {
              let msg = messages.fetchFail;
              if (err && err.message === "offline") msg = messages.offline;
              else if (err && err.message === "rate-limit") msg = messages.rateLimit;
              createToast(msg);
            }
          });
      }

      if (lastUpdatedEl) {
        loadLastUpdated();
      }

      const advisoriesList = document.getElementById("advisories-list");
      refreshAdvisoriesBtn = document.getElementById("refresh-advisories");

      function loadAdvisories(force = false, btn = null) {
        if (!advisoriesList) return;
        advisoriesList.innerHTML = "";
        if (btn) {
          btn.classList.add("loading");
          btn.setAttribute("aria-busy", "true");
        }
        const advUrl = "/assets/data/security-advisories.json";
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
                const advTime = adv.published_at || adv.created_at;
                if (advTime) {
                  const span = document.createElement("span");
                  span.className = "adv-time";
                  span.textContent = formatRelative(new Date(advTime));
                  li.appendChild(document.createTextNode(" "));
                  li.appendChild(span);
                }
                advisoriesList.appendChild(li);
              });
            } else {
              advisoriesList.textContent = lang.startsWith("fa")
                ? "موردی یافت نشد."
                : "No advisories found.";
            }
          })
          .catch((err) => {
            advisoriesList.textContent = lang.startsWith("fa")
              ? "خطا در دریافت اعلان‌ها."
              : "Failed to load advisories.";
            if (typeof createToast === "function") {
              let msg = messages.fetchFail;
              if (err && err.message === "offline") msg = messages.offline;
              else if (err && err.message === "rate-limit") msg = messages.rateLimit;
              createToast(msg);
            }
          })
          .finally(() => {
            if (btn) {
              btn.classList.remove("loading");
              btn.removeAttribute("aria-busy");
            }
          });
      }

      if (refreshAdvisoriesBtn) {
        refreshAdvisoriesBtn.addEventListener("click", () =>
          loadAdvisories(true, refreshAdvisoriesBtn)
        );
      }

      if (refreshTimelineBtn) {
        refreshTimelineBtn.addEventListener("click", () =>
          loadTimeline(true, refreshTimelineBtn)
        );
      }

      if (sortBtn) {
        sortBtn.addEventListener("click", () => {
          sortAsc = !sortAsc;
          if (storage) {
            try { storage.setItem("timeline-sort", sortAsc ? "asc" : "desc"); } catch (e) {}
          }
          updateSortButton();
          renderTimeline(timelineData);
          initializeTimeline();
          if (timelineSearch) {
            timelineSearch.dispatchEvent(new Event("input"));
          }
        });
        updateSortButton();
      }

      if (advisoriesList) {
        const idleLoad = () => loadAdvisories();
        if ("requestIdleCallback" in window) {
          requestIdleCallback(idleLoad, { timeout: 2000 });
        } else {
          setTimeout(idleLoad, 1000);
        }
      }


      if (timelineSearch) {
        document.addEventListener("keydown", (e) => {
          const activeTag = document.activeElement.tagName.toLowerCase();
          if (
            e.key === "/" &&
            activeTag !== "input" &&
            activeTag !== "textarea" &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
          ) {
            e.preventDefault();
            timelineSearch.focus();
          }
        });
        document.addEventListener("keydown", (e) => {
          const activeTag = document.activeElement.tagName.toLowerCase();
          if (
            (e.key === "r" || e.key === "R") &&
            activeTag !== "input" &&
            activeTag !== "textarea" &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
          ) {
            e.preventDefault();
            loadTimeline(true);
            loadAdvisories(true);
          }
        });
      }

      document.querySelectorAll("#share-page, #share-page-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (navigator.share) {
            navigator
              .share({ title: document.title, url: location.href })
              .catch(() => copyTextToClipboard(location.href));
          } else {
            copyTextToClipboard(location.href);
          }
        });
      });

      const scrollBtn = document.getElementById("scroll-to-top");
      const floatingShare = document.getElementById("share-page-button");

      function toggleFloatButtons() {
        const show = window.scrollY > 200;
        if (scrollBtn) scrollBtn.classList.toggle("visible", show);
        if (floatingShare) floatingShare.classList.toggle("visible", show);
      }
      window.addEventListener("scroll", toggleFloatButtons);
      toggleFloatButtons();
      if (scrollBtn) {
        scrollBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
  }});
})();
