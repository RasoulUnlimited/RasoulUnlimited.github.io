// Resilient renderer for featured feedback cards in home testimonials.
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const ROOT_SELECTOR = "[data-featured-feedback-root]";
  const CACHE_PREFIX = "ru-featured-feedback-v3::";
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 6500;
  const FETCH_ATTEMPTS = 3;
  const FETCH_RETRY_BASE_MS = 320;
  const MAX_RENDER_RETRIES = 2;
  const ROOTS = [];
  const rootStates = new WeakMap();
  const inflightByUrl = new Map();
  let connectivityBindingsAttached = false;

  const STRINGS = {
    fa: {
      empty: "\u0647\u0646\u0648\u0632 \u0628\u0627\u0632\u062e\u0648\u0631\u062f \u0645\u0646\u062a\u062e\u0628 \u0645\u0646\u062a\u0634\u0631 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.",
      errorPrefix: "\u0646\u0645\u0627\u06cc\u0634 \u0628\u0627\u0632\u062e\u0648\u0631\u062f\u0647\u0627\u06cc \u0645\u0646\u062a\u062e\u0628 \u0645\u0645\u06a9\u0646 \u0646\u0628\u0648\u062f.",
      sourceCta: "\u0645\u0634\u0627\u0647\u062f\u0647 \u0647\u0645\u0647 \u06af\u0641\u062a\u06af\u0648\u0647\u0627",
      authorFallback: "\u06a9\u0627\u0631\u0628\u0631 GitHub",
      roleFallback: "\u0628\u0627\u0632\u062f\u06cc\u062f\u06a9\u0646\u0646\u062f\u0647",
      staleNotice:
        "\u0628\u0647 \u062f\u0644\u06cc\u0644 \u0646\u0627\u067e\u0627\u06cc\u062f\u0627\u0631\u06cc \u0627\u062a\u0635\u0627\u0644\u060c \u0646\u0633\u062e\u0647 \u0630\u062e\u06cc\u0631\u0647\u200c\u0634\u062f\u0647 \u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062f\u0647 \u0634\u062f.",
    },
    en: {
      empty: "No featured feedback has been published yet.",
      errorPrefix: "Featured feedback could not be loaded.",
      sourceCta: "View all discussions",
      authorFallback: "GitHub user",
      roleFallback: "Visitor",
      staleNotice: "Showing a cached snapshot because the connection is unstable.",
    },
  };

  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function getSafeStorage() {
    try {
      const key = "__ru_featured_feedback_probe__";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return localStorage;
    } catch {
      return null;
    }
  }

  const storage = getSafeStorage();

  function resolveLang(root) {
    const lang = root.dataset.featuredFeedbackLang || document.documentElement.lang || "en";
    return lang.toLowerCase().startsWith("fa") ? "fa" : "en";
  }

  function getCacheKey(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return CACHE_PREFIX + parsed.pathname;
    } catch {
      return CACHE_PREFIX + String(url || "");
    }
  }

  function evictOldCacheEntries() {
    if (!storage) {
      return;
    }

    const entries = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(CACHE_PREFIX)) {
        continue;
      }

      let timestamp = 0;
      try {
        const payload = JSON.parse(storage.getItem(key) || "{}");
        timestamp = Number(payload.t) || 0;
      } catch {
        timestamp = 0;
      }

      entries.push({ key, timestamp });
    }

    entries
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, Math.ceil(entries.length / 2))
      .forEach((entry) => {
        try {
          storage.removeItem(entry.key);
        } catch {}
      });
  }

  function readCachedItems(url) {
    if (!storage) {
      return null;
    }

    const key = getCacheKey(url);
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw);
      const timestamp = Number(payload.t) || 0;
      const items = Array.isArray(payload.items) ? payload.items : null;
      if (!items || !items.length) {
        storage.removeItem(key);
        return null;
      }

      if (Date.now() - timestamp > CACHE_TTL_MS) {
        storage.removeItem(key);
        return null;
      }

      return items;
    } catch {
      storage.removeItem(key);
      return null;
    }
  }

  function writeCachedItems(url, items) {
    if (!storage || !Array.isArray(items) || !items.length) {
      return;
    }

    const key = getCacheKey(url);
    const value = JSON.stringify({
      t: Date.now(),
      items,
    });

    try {
      storage.setItem(key, value);
    } catch {
      evictOldCacheEntries();
      try {
        storage.setItem(key, value);
      } catch {}
    }
  }

  function isHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
      return false;
    }

    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function normalizeText(value, max = 800) {
    if (typeof value !== "string") {
      return "";
    }
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "";
    }
    return normalized.slice(0, max);
  }

  function sanitizeItem(raw, fallbackLang) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const langRaw = String(raw.lang || "").toLowerCase();
    const lang = langRaw.startsWith("fa")
      ? "fa"
      : langRaw.startsWith("en")
        ? "en"
        : fallbackLang;

    const id = normalizeText(String(raw.id || ""), 120);
    const quote = normalizeText(String(raw.quote || ""), 1200);
    if (!quote) {
      return null;
    }

    const author = normalizeText(String(raw.author || ""), 160);
    const role = normalizeText(String(raw.role || ""), 160);
    const sourceLabel = normalizeText(String(raw.source_label || ""), 160);
    const sourceUrl = isHttpUrl(String(raw.source_url || "")) ? String(raw.source_url) : "";
    const dateText = normalizeText(String(raw.date || ""), 64);
    const date = dateText && !Number.isNaN(Date.parse(dateText)) ? dateText : "";

    return {
      id,
      lang,
      quote,
      author,
      role,
      source_url: sourceUrl,
      source_label: sourceLabel,
      date,
    };
  }

  function formatDate(value, lang) {
    if (!value) {
      return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const locale = lang === "fa" ? "fa-IR" : "en-US";
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(parsed);
    } catch {
      return "";
    }
  }

  function dispatch(root, eventName, detail) {
    try {
      root.dispatchEvent(
        new CustomEvent(eventName, {
          bubbles: true,
          detail: detail || {},
        })
      );
    } catch {}
  }

  function clearRoot(root) {
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
  }

  function renderStaleNotice(root, copy) {
    const note = document.createElement("p");
    note.className = "featured-feedback-stale-note";
    note.textContent = copy.staleNotice;
    root.appendChild(note);
  }

  function buildCard(item, lang, copy, fallbackUrl) {
    const article = document.createElement("article");
    article.className = "featured-feedback-card";
    article.setAttribute("data-featured-feedback-item", item.id || "");
    article.setAttribute("data-feedback-lang", lang);

    const quote = document.createElement("p");
    quote.className = "featured-feedback-quote";
    quote.textContent = item.quote;
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

    const safeFallbackLink = rootSafeFallbackLink(fallbackUrl);
    const link = document.createElement("a");
    link.className = "featured-feedback-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.href = item.source_url || safeFallbackLink;
    link.textContent = item.source_label || copy.sourceCta;
    meta.appendChild(link);

    article.appendChild(meta);

    const formattedDate = formatDate(item.date, lang);
    if (formattedDate && item.date) {
      const dateEl = document.createElement("time");
      dateEl.className = "featured-feedback-date";
      dateEl.dateTime = item.date;
      dateEl.textContent = formattedDate;
      article.appendChild(dateEl);
    }

    return article;
  }

  function rootSafeFallbackLink(fallbackUrl) {
    if (isHttpUrl(fallbackUrl || "")) {
      return fallbackUrl;
    }
    return "https://github.com/RasoulUnlimited/comments/discussions";
  }

  function renderEmpty(root, copy) {
    const empty = document.createElement("p");
    empty.className = "featured-feedback-empty";
    empty.textContent = copy.empty;
    root.appendChild(empty);
    root.dataset.featuredFeedbackStatus = "empty";
  }

  function renderError(root, copy, fallbackUrl, reason) {
    const wrap = document.createElement("p");
    wrap.className = "featured-feedback-error";
    wrap.textContent = `${copy.errorPrefix} `;

    if (isHttpUrl(fallbackUrl || "")) {
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
    root.dataset.featuredFeedbackErrorReason = reason || "unknown-error";
    delete root.dataset.featuredFeedbackStale;
  }

  async function fetchWithTimeout(url, timeoutMs) {
    const hasAbortController = typeof AbortController === "function";
    const controller = hasAbortController ? new AbortController() : null;
    let timer = null;

    if (controller) {
      timer = window.setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

    try {
      return await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        ...(controller ? { signal: controller.signal } : {}),
      });
    } finally {
      if (timer) {
        window.clearTimeout(timer);
      }
    }
  }

  async function fetchItemsFromNetwork(url) {
    let lastError = null;

    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
        if (!response.ok) {
          throw new Error(`http-${response.status}`);
        }

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.items)) {
          throw new Error("invalid-shape");
        }

        return payload.items;
      } catch (error) {
        lastError = error;
        if (attempt < FETCH_ATTEMPTS) {
          const delay =
            FETCH_RETRY_BASE_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 120);
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error("fetch-failed");
  }

  async function fetchSource(url, fallbackLang, forceRefresh) {
    if (!url) {
      throw new Error("missing-source");
    }

    if (!forceRefresh && inflightByUrl.has(url)) {
      return inflightByUrl.get(url);
    }

    if (forceRefresh) {
      inflightByUrl.delete(url);
    }

    const pending = (async () => {
      try {
        const rawItems = await fetchItemsFromNetwork(url);
        const sanitized = rawItems
          .map((item) => sanitizeItem(item, fallbackLang))
          .filter(Boolean);

        if (!sanitized.length) {
          throw new Error("no-usable-items");
        }

        writeCachedItems(url, sanitized);
        return { items: sanitized, stale: false };
      } catch (networkError) {
        const cached = readCachedItems(url);
        if (cached && cached.length) {
          return { items: cached, stale: true };
        }
        throw networkError;
      }
    })();

    inflightByUrl.set(url, pending);

    try {
      return await pending;
    } catch (error) {
      inflightByUrl.delete(url);
      throw error;
    }
  }

  function clearRetryTimer(state) {
    if (!state || !state.retryTimer) {
      return;
    }

    window.clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }

  function scheduleAutoRetry(root, state, reason) {
    if (!state) {
      return;
    }

    if (navigator.onLine === false) {
      return;
    }

    if (state.retryCount >= MAX_RENDER_RETRIES) {
      return;
    }

    state.retryCount += 1;
    const delay = FETCH_RETRY_BASE_MS * 3 * state.retryCount;
    clearRetryTimer(state);
    state.retryTimer = window.setTimeout(() => {
      renderRoot(root, {
        forceRefresh: true,
        source: "auto-retry",
      });
    }, delay);

    dispatch(root, "featured-feedback:retry", {
      reason,
      source: "auto",
      attempt: state.retryCount,
    });
  }

  async function renderRoot(root, options = {}) {
    if (!root) {
      return;
    }

    const state = rootStates.get(root);
    if (!state) {
      return;
    }

    if (state.status === "loading") {
      return;
    }

    const lang = resolveLang(root);
    const copy = STRINGS[lang];
    const source = root.dataset.featuredFeedbackSource || "";
    const fallback = root.dataset.featuredFeedbackFallback || "";
    const forceRefresh = !!options.forceRefresh;

    root.dataset.featuredFeedbackStatus = "loading";
    root.dataset.featuredFeedbackErrorReason = "";
    delete root.dataset.featuredFeedbackStale;
    state.status = "loading";

    clearRetryTimer(state);
    clearRoot(root);

    try {
      const { items, stale } = await fetchSource(source, lang, forceRefresh);
      const filtered = items.filter((item) => item && item.lang === lang).slice(0, 3);

      if (!filtered.length) {
        if (stale) {
          root.dataset.featuredFeedbackStale = "true";
          renderStaleNotice(root, copy);
        }
        renderEmpty(root, copy);
        state.status = "empty";
        dispatch(root, "featured-feedback:ready", { stale, empty: true });
        return;
      }

      if (stale) {
        root.dataset.featuredFeedbackStale = "true";
        renderStaleNotice(root, copy);
      } else {
        delete root.dataset.featuredFeedbackStale;
      }

      filtered.forEach((item) => {
        root.appendChild(buildCard(item, lang, copy, fallback));
      });

      root.dataset.featuredFeedbackStatus = "ready";
      state.status = stale ? "stale" : "ready";
      state.retryCount = 0;

      dispatch(root, "featured-feedback:ready", { stale: !!stale, empty: false });
      if (stale) {
        dispatch(root, "featured-feedback:stale", { source });
      }
    } catch (error) {
      const reason = String(error && error.message ? error.message : "unknown-error");
      renderError(root, copy, fallback, reason);
      state.status = "error";
      dispatch(root, "featured-feedback:error", { reason });
      scheduleAutoRetry(root, state, reason);
    }
  }

  function attachConnectivityBindings() {
    if (connectivityBindingsAttached) {
      return;
    }

    connectivityBindingsAttached = true;
    const onOnline = () => {
      ROOTS.forEach((root) => {
        const state = rootStates.get(root);
        if (!state) {
          return;
        }

        const shouldRefresh =
          state.status === "error" || state.status === "stale" || root.dataset.featuredFeedbackStale === "true";
        if (!shouldRefresh) {
          return;
        }

        renderRoot(root, {
          forceRefresh: true,
          source: "online",
        });
      });
    };

    window.addEventListener("online", onOnline);
    window.addEventListener(
      "beforeunload",
      () => {
        window.removeEventListener("online", onOnline);
      },
      { once: true }
    );
  }

  function initRoot(root) {
    if (!root || root.dataset.featuredFeedbackBooted === "true") {
      return;
    }

    root.dataset.featuredFeedbackBooted = "true";

    rootStates.set(root, {
      status: "idle",
      retryCount: 0,
      retryTimer: null,
    });
    ROOTS.push(root);
  }

  function boot() {
    const roots = Array.from(document.querySelectorAll(ROOT_SELECTOR));
    if (!roots.length) {
      return;
    }

    roots.forEach((root) => {
      initRoot(root);
      renderRoot(root, { forceRefresh: false, source: "init" });
    });

    attachConnectivityBindings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.__featuredFeedback = {
    reloadAll(forceRefresh = true) {
      ROOTS.forEach((root) => {
        renderRoot(root, {
          forceRefresh: !!forceRefresh,
          source: "manual",
        });
      });
    },
    getStatus(root) {
      const state = rootStates.get(root);
      return state ? state.status : "unknown";
    },
  };
})();
