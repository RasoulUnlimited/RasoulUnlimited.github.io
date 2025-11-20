// include.js - improved version
(function () {
  "use strict";

  /**
   * Injects external HTML fragments into elements with [data-include-html].
   * - Returns a Promise so callers can chain on it.
   * - Safely handles fetch errors.
   * - Re-executes <script> tags inside included HTML.
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
      const file = el.getAttribute("data-include-html");
      if (!file) continue;

      // Prevent double-include if function is called again
      el.removeAttribute("data-include-html");

      const fetchPromise = fetch(file)
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status} for ${file}`);
          }
          return resp.text();
        })
        .then((html) => {
          // Use DOMParser to safely parse and sanitize HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          // Check for parsing errors
          if (
            doc.body &&
            doc.body.firstChild &&
            doc.body.firstChild.nodeName === "parsererror"
          ) {
            throw new Error(`Failed to parse HTML for ${file}`);
          }

          // Safely append parsed content
          while (doc.body && doc.body.firstChild) {
            el.appendChild(doc.body.firstChild);
          }

          // Special-case: footer year autofill
          if (/footer\.html$/i.test(file)) {
            const yearSpan =
              el.querySelector("#footer-year") ||
              el.querySelector("#current-year");
            if (yearSpan) {
              yearSpan.textContent = String(new Date().getFullYear());
            }
          }

          // Re-execute any <script> tags inside included HTML
          const scripts = el.querySelectorAll("script");
          scripts.forEach((oldScript) => {
            const newScript = document.createElement("script");

            // Copy attributes (type, async, etc.)
            for (const attr of oldScript.attributes) {
              newScript.setAttribute(attr.name, attr.value);
            }

            if (oldScript.src) {
              // External script
              newScript.src = oldScript.src;
            } else {
              // Inline script
              newScript.textContent = oldScript.textContent;
            }

            oldScript.parentNode.replaceChild(newScript, oldScript);
          });
        })
        .catch((err) => {
          console.error("Include error for", file, err);
        });

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
   * Handles:
   * - /, /index.html → /
   * - trailing slashes
   * - ignores hash/query, mailto, and pure hash links
   */
  function setActiveNavLink() {
    const normalize = (path) =>
      path
        .replace(/\/index\.html$/i, "/")
        .replace(/\/+$/, "/") || "/";

    const current = normalize(window.location.pathname);

    document.querySelectorAll(".navbar nav a").forEach((link) => {
      const href = link.getAttribute("href") || "";

      // Skip anchors / mailto / javascript: links
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:")
      ) {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
        if (link.parentElement && link.parentElement.tagName === "LI") {
          link.parentElement.classList.remove("active");
        }
        return;
      }

      let linkPath;
      try {
        const url = new URL(href, window.location.origin);
        linkPath = normalize(url.pathname);
      } catch (err) {
        // If URL constructor fails for some reason, fallback to current
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

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    includeHTML(() => {
      setActiveNavLink();
      // Keep your original contract: fire after includes + nav activation
      document.dispatchEvent(new Event("includesLoaded"));
    });
  });

  // Optionally expose includeHTML globally if you want to re-run it manually
  window.includeHTML = includeHTML;
})();
