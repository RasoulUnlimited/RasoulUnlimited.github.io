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
    function cachedFetch(url, key, ttl, parser) {
      try {
        const cached = JSON.parse(localStorage.getItem(key) || "null");
        if (cached && Date.now() - cached.t < ttl) {
          return Promise.resolve(cached.d);
        }
      } catch (e) {}
      return fetch(url)
        .then((res) => parser(res))
        .then((data) => {
          try {
            localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
          } catch (e) {}
          return data;
        });
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
      } else if (typeof createToast === "function") {
        createToast(messages.unsupported);
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

      const timelineList = document.getElementById("security-timeline-list");
      if (timelineList) {
        cachedFetch(
          "/assets/data/security-timeline.json",
          "security-timeline",
          DAY_MS,
          (res) => res.json()
        ).then((events) => {
            events.forEach((ev) => {
              const li = document.createElement("li");
              li.dataset.aos = "fade-up";

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
            initializeTimeline();
          })
          .catch(() => initializeTimeline());
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
              if (progressEl) {
                const totalDays = 365;
                const percent = Math.min(
                  100,
                  Math.max(0, ((totalDays - diffDays) / totalDays) * 100)
                );
                progressEl.value = percent;
                progressEl.setAttribute("aria-valuenow", percent.toFixed(0));
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
