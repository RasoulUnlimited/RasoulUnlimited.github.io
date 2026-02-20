(function () {
  "use strict";

  const ORIGIN = window.location.origin;
  const INCLUDE_CACHE_PREFIX = "ru-include-v2::";
  const INCLUDE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const INCLUDE_FETCH_TIMEOUT_MS = 7000;
  const INCLUDE_FETCH_ATTEMPTS = 3;
  const INCLUDE_RETRY_BASE_MS = 350;

  const docLang = (
    document.documentElement.getAttribute("lang") ||
    navigator.language ||
    ""
  ).toLowerCase();
  const isFa = docLang.indexOf("fa") === 0;

  const TRUSTED_SCRIPT_PATH_PREFIXES = ["/assets/js/", "/includes/"];

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getStorage() {
    try {
      const key = "__ru_include_storage_probe__";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return localStorage;
    } catch {
      return null;
    }
  }

  const includeStorage = getStorage();

  function getCacheKey(file) {
    try {
      const url = new URL(file, ORIGIN);
      return INCLUDE_CACHE_PREFIX + url.pathname;
    } catch {
      return INCLUDE_CACHE_PREFIX + file;
    }
  }

  function evictOldestIncludeCacheEntries() {
    if (!includeStorage) {
      return;
    }

    const entries = [];

    for (let i = 0; i < includeStorage.length; i++) {
      const key = includeStorage.key(i);
      if (!key || !key.startsWith(INCLUDE_CACHE_PREFIX)) {
        continue;
      }

      let timestamp = 0;
      try {
        const payload = JSON.parse(includeStorage.getItem(key) || "{}");
        timestamp = Number(payload.t) || 0;
      } catch {
        timestamp = 0;
      }

      entries.push({ key, timestamp });
    }

    if (!entries.length) {
      return;
    }

    entries
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, Math.ceil(entries.length / 2))
      .forEach((entry) => {
        try {
          includeStorage.removeItem(entry.key);
        } catch {
          // Ignore cleanup failures.
        }
      });
  }

  function writeCachedInclude(file, html) {
    if (!includeStorage || !html) {
      return;
    }

    const key = getCacheKey(file);
    const value = JSON.stringify({ t: Date.now(), html });

    try {
      includeStorage.setItem(key, value);
    } catch {
      evictOldestIncludeCacheEntries();

      try {
        includeStorage.setItem(key, value);
      } catch {
        // Ignore quota failures.
      }
    }
  }

  function readCachedInclude(file) {
    if (!includeStorage) {
      return null;
    }

    const key = getCacheKey(file);
    const raw = includeStorage.getItem(key);

    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw);
      const timestamp = Number(payload.t) || 0;
      const html = typeof payload.html === "string" ? payload.html : "";

      if (!html) {
        includeStorage.removeItem(key);
        return null;
      }

      if (Date.now() - timestamp > INCLUDE_CACHE_TTL_MS) {
        includeStorage.removeItem(key);
        return null;
      }

      return html;
    } catch {
      includeStorage.removeItem(key);
      return null;
    }
  }

  function isScriptTrusted(src) {
    if (!src) {
      return true;
    }

    try {
      const url = new URL(src, ORIGIN);
      if (url.origin !== ORIGIN) {
        return false;
      }
      return TRUSTED_SCRIPT_PATH_PREFIXES.some((prefix) =>
        url.pathname.startsWith(prefix)
      );
    } catch {
      return false;
    }
  }

  function sanitizeNode(node) {
    if (!node) {
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const attrs = Array.from(node.attributes);
      attrs.forEach((attr) => {
        if (attr.name.toLowerCase().startsWith("on")) {
          node.removeAttribute(attr.name);
        }
      });

      const tagName = node.tagName.toLowerCase();

      if (["object", "embed", "iframe"].includes(tagName)) {
        node.remove();
        return;
      }

      const attributesToCheck = ["href", "xlink:href", "action", "formaction"];
      attributesToCheck.forEach((attrName) => {
        let value = node.getAttribute(attrName);

        if (!value && attrName === "xlink:href") {
          value = node.getAttributeNS("http://www.w3.org/1999/xlink", "href");
        }

        // eslint-disable-next-line no-script-url
        if (value && value.toLowerCase().trim().startsWith("javascript:")) {
          node.removeAttribute(attrName);
          if (attrName === "xlink:href") {
            node.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
          }
        }
      });

      Array.from(node.childNodes).forEach(sanitizeNode);
      return;
    }

    if (
      node.nodeType === Node.COMMENT_NODE ||
      node.nodeType === Node.PROCESSING_INSTRUCTION_NODE
    ) {
      node.remove();
    }
  }

  function parseAndSanitizeHtml(file, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    if (doc.querySelector("parsererror")) {
      throw new Error("Failed to parse HTML for " + file);
    }

    Array.from(doc.body.childNodes).forEach(sanitizeNode);
    return doc;
  }

  function applyIncludedHtml(el, file, html, stale) {
    const doc = parseAndSanitizeHtml(file, html);
    const cspSourceScript = document.querySelector("script[data-csp-nonce]");
    const globalNonce = cspSourceScript?.nonce || null;

    el.innerHTML = "";

    while (doc.body && doc.body.firstChild) {
      el.appendChild(doc.body.firstChild);
    }

    if (/footer\.html$/i.test(file)) {
      const yearSpan =
        el.querySelector("#footer-year") || el.querySelector("#current-year");
      if (yearSpan) {
        yearSpan.textContent = String(new Date().getFullYear());
      }
    }

    const scripts = el.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      if (oldScript.src && !isScriptTrusted(oldScript.src)) {
        oldScript.remove();
        return;
      }

      const newScript = document.createElement("script");
      const safeAttributes = ["type", "async", "defer", "charset", "id", "class"];

      for (const attr of oldScript.attributes) {
        if (safeAttributes.includes(attr.name) || attr.name.startsWith("data-")) {
          newScript.setAttribute(attr.name, attr.value);
        }
      }

      if (globalNonce) {
        newScript.nonce = globalNonce;
      }

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }

      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    if (stale) {
      el.setAttribute("data-include-stale", "true");
    } else {
      el.removeAttribute("data-include-stale");
    }

    el.removeAttribute("data-include-failed");
  }

  function renderIncludeFallback(el) {
    const fallback = document.createElement("div");
    fallback.className = "include-fallback";
    fallback.setAttribute("role", "status");
    fallback.setAttribute("aria-live", "polite");
    fallback.textContent = isFa
      ? "This section is temporarily unavailable. Please refresh when your connection is stable."
      : "This section is temporarily unavailable. Please refresh when your connection is stable.";

    el.innerHTML = "";
    el.appendChild(fallback);
    el.setAttribute("data-include-failed", "true");
    el.removeAttribute("data-include-stale");
  }

  async function fetchWithTimeout(file) {
    const hasAbortController = typeof AbortController === "function";
    const controller = hasAbortController ? new AbortController() : null;
    let timer = null;
    if (controller) {
      timer = setTimeout(() => {
        controller.abort();
      }, INCLUDE_FETCH_TIMEOUT_MS);
    }

    try {
      return await fetch(file, {
        credentials: "same-origin",
        cache: "no-cache",
        ...(controller ? { signal: controller.signal } : {}),
      });
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async function fetchIncludeHtml(file) {
    let lastError = null;

    for (let attempt = 1; attempt <= INCLUDE_FETCH_ATTEMPTS; attempt++) {
      try {
        const resp = await fetchWithTimeout(file);

        if (!resp.ok) {
          throw new Error("HTTP " + resp.status + " for " + file);
        }

        return await resp.text();
      } catch (err) {
        lastError = err;

        if (attempt < INCLUDE_FETCH_ATTEMPTS) {
          const delay = INCLUDE_RETRY_BASE_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 120);
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error("Unknown include fetch error for " + file);
  }

  async function loadIncludeHtml(file) {
    try {
      const html = await fetchIncludeHtml(file);
      writeCachedInclude(file, html);
      return { html, stale: false };
    } catch (networkErr) {
      const cachedHtml = readCachedInclude(file);
      if (cachedHtml) {
        console.warn("Using stale include cache for", file, networkErr);
        return { html: cachedHtml, stale: true };
      }
      throw networkErr;
    }
  }

  /**
   * Inject external HTML fragments into elements with [data-include-html].
   * @param {Function} [callback]
   * @returns {Promise<void>}
   */
  async function includeHTML(callback) {
    const elements = document.querySelectorAll("[data-include-html]");

    if (!elements.length) {
      if (typeof callback === "function") {
        try {
          callback();
        } catch (err) {
          console.error("includeHTML callback error:", err);
        }
      }
      return;
    }

    const fetches = [];

    for (const el of elements) {
      if (el.dataset.includeLoaded === "true" || el.dataset.includePending === "true") {
        continue;
      }

      const file = el.getAttribute("data-include-html");
      if (!file) {
        continue;
      }

      try {
        const fileUrl = new URL(file, ORIGIN);
        if (fileUrl.origin !== ORIGIN) {
          console.error("Blocked cross-origin include:", file);
          continue;
        }
      } catch {
        console.error("Invalid include URL:", file);
        continue;
      }

      el.dataset.includePending = "true";

      const fetchPromise = (async () => {
        try {
          const { html, stale } = await loadIncludeHtml(file);
          applyIncludedHtml(el, file, html, stale);
          el.dataset.includeLoaded = "true";
          el.removeAttribute("data-include-html");
        } catch (err) {
          console.error("Include error for", file, err);
          renderIncludeFallback(el);
        } finally {
          delete el.dataset.includePending;
        }
      })();

      fetches.push(fetchPromise);
    }

    await Promise.all(fetches);

    if (typeof callback === "function") {
      try {
        callback();
      } catch (err) {
        console.error("includeHTML callback error:", err);
      }
    }
  }

  /**
   * Marks current page link as active in navbar.
   */
  function setActiveNavLink() {
    const normalize = (path) =>
      (path || "/")
        .replace(/\/index\.html$/i, "/")
        .replace(/\/+$/, "/") || "/";

    const current = normalize(window.location.pathname);

    document.querySelectorAll(".navbar nav a").forEach((link) => {
      const href = link.getAttribute("href") || "";

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        // eslint-disable-next-line no-script-url
        href.startsWith("javascript:")
      ) {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
        if (link.parentElement && link.parentElement.tagName === "LI") {
          link.parentElement.classList.remove("active");
        }
        return;
      }

      let linkPath = "";
      try {
        const url = new URL(href, ORIGIN);
        linkPath = normalize(url.pathname);
      } catch {
        linkPath = "";
      }

      const isActive = linkPath === current;
      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }

      if (link.parentElement && link.parentElement.tagName === "LI") {
        link.parentElement.classList.toggle("active", isActive);
      }
    });
  }

  function bootIncludes() {
    includeHTML(() => {
      setActiveNavLink();
      document.dispatchEvent(new Event("includesLoaded"));
    });
  }

  document.addEventListener("DOMContentLoaded", bootIncludes);

  window.addEventListener("online", () => {
    if (document.querySelector("[data-include-html]")) {
      includeHTML();
    }
  });

  window.includeHTML = includeHTML;
})();
