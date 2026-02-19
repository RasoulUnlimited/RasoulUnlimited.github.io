// Lightweight renderer for featured feedback cards in home testimonials.
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const ROOT_SELECTOR = "[data-featured-feedback-root]";
  const dataCache = new Map();

  const STRINGS = {
    fa: {
      empty: "هنوز بازخورد منتخب منتشر نشده است.",
      errorPrefix: "نمایش بازخوردهای منتخب ممکن نبود.",
      sourceCta: "مشاهده همه گفتگوها",
      authorFallback: "کاربر GitHub",
      roleFallback: "بازدیدکننده",
    },
    en: {
      empty: "No featured feedback has been published yet.",
      errorPrefix: "Featured feedback could not be loaded.",
      sourceCta: "View all discussions",
      authorFallback: "GitHub user",
      roleFallback: "Visitor",
    },
  };

  function resolveLang(root) {
    const lang = root.dataset.featuredFeedbackLang || document.documentElement.lang || "en";
    return lang.toLowerCase().startsWith("fa") ? "fa" : "en";
  }

  function formatDate(value, lang) {
    if (!value) {return "";}
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {return "";}
    const locale = lang === "fa" ? "fa-IR" : "en-US";

    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(parsed);
    } catch {
      return value;
    }
  }

  async function fetchSource(url) {
    if (!url) {
      throw new Error("missing-source");
    }

    if (dataCache.has(url)) {
      return dataCache.get(url);
    }

    const promise = fetch(url, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`http-${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (!payload || !Array.isArray(payload.items)) {
          throw new Error("invalid-shape");
        }
        return payload.items;
      });

    dataCache.set(url, promise);
    return promise;
  }

  function clearRoot(root) {
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
  }

  function buildCard(item, lang, copy) {
    const article = document.createElement("article");
    article.className = "featured-feedback-card";
    article.setAttribute("data-featured-feedback-item", item.id || "");
    article.setAttribute("data-feedback-lang", lang);

    const quote = document.createElement("p");
    quote.className = "featured-feedback-quote";
    quote.textContent = item.quote || "";
    article.appendChild(quote);

    const meta = document.createElement("div");
    meta.className = "featured-feedback-meta";

    const identity = document.createElement("div");
    const author = document.createElement("div");
    author.className = "featured-feedback-author";
    author.textContent = item.author || copy.authorFallback;
    const role = document.createElement("div");
    role.className = "featured-feedback-role";
    role.textContent = item.role || copy.roleFallback;
    identity.appendChild(author);
    identity.appendChild(role);
    meta.appendChild(identity);

    const link = document.createElement("a");
    link.className = "featured-feedback-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.href = item.source_url || "#";
    link.textContent = item.source_label || copy.sourceCta;
    meta.appendChild(link);

    article.appendChild(meta);

    const date = formatDate(item.date, lang);
    if (date) {
      const dateEl = document.createElement("time");
      dateEl.className = "featured-feedback-date";
      dateEl.dateTime = item.date;
      dateEl.textContent = date;
      article.appendChild(dateEl);
    }

    return article;
  }

  function renderEmpty(root, copy) {
    const empty = document.createElement("p");
    empty.className = "featured-feedback-empty";
    empty.textContent = copy.empty;
    root.appendChild(empty);
    root.dataset.featuredFeedbackStatus = "empty";
  }

  function renderError(root, copy, fallbackUrl) {
    const wrap = document.createElement("p");
    wrap.className = "featured-feedback-error";
    wrap.textContent = `${copy.errorPrefix} `;

    if (fallbackUrl) {
      const link = document.createElement("a");
      link.className = "featured-feedback-link";
      link.href = fallbackUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = copy.sourceCta;
      wrap.appendChild(link);
    }

    root.appendChild(wrap);
    root.dataset.featuredFeedbackStatus = "error";
  }

  async function renderRoot(root) {
    if (!root) {return;}

    const lang = resolveLang(root);
    const copy = STRINGS[lang];
    const source = root.dataset.featuredFeedbackSource || "";
    const fallback = root.dataset.featuredFeedbackFallback || "";

    root.dataset.featuredFeedbackStatus = "loading";
    clearRoot(root);

    try {
      const items = await fetchSource(source);
      const filtered = items
        .filter((item) => item && item.lang === lang)
        .slice(0, 3);

      if (!filtered.length) {
        renderEmpty(root, copy);
        return;
      }

      filtered.forEach((item) => {
        root.appendChild(buildCard(item, lang, copy));
      });
      root.dataset.featuredFeedbackStatus = "ready";
      root.dispatchEvent(new CustomEvent("featured-feedback:ready", { bubbles: true }));
    } catch {
      renderError(root, copy, fallback);
      root.dispatchEvent(new CustomEvent("featured-feedback:error", { bubbles: true }));
    }
  }

  function boot() {
    const roots = Array.from(document.querySelectorAll(ROOT_SELECTOR));
    if (!roots.length) {return;}
    roots.forEach((root) => {
      renderRoot(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
