// include.js - improved version
(function () {
  "use strict";

  /**
   * Injects external HTML fragments into elements with [data-include-html].
   * - Returns a Promise so callers can chain on it.
   * - Safely handles fetch errors.
   * - Re-executes <script> tags inside included HTML (only from trusted sources).
   * - Filters scripts from untrusted origins for security.
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

    // Whitelist of trusted script paths that are allowed to be re-executed
    const TRUSTED_SCRIPT_PATHS = [
      "/assets/js/",
      "/includes/",
      new URL(window.location.href).origin + "/assets/js/",
    ];

    function isScriptTrusted(src) {
      if (!src) return true; // inline scripts from trusted source are OK
      try {
        const url = new URL(src, window.location.origin);
        // Only allow same-origin scripts from trusted directories
        return url.origin === window.location.origin &&
          TRUSTED_SCRIPT_PATHS.some((path) =>
            url.pathname.startsWith(path.replace(window.location.origin, ""))
          );
      } catch {
        return false;
      }
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
          // Use DOMParser to safely parse HTML
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

          // Sanitize by removing all event handlers and potentially dangerous elements
          const sanitize = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Remove all event handler attributes (on*)
              const attributes = Array.from(node.attributes);
              attributes.forEach((attr) => {
                if (attr.name.toLowerCase().startsWith("on")) {
                  console.warn(
                    `Removed event handler attribute: ${attr.name}`
                  );
                  node.removeAttribute(attr.name);
                }
              });

              // Remove potentially dangerous elements/attributes
              const tagName = node.tagName.toLowerCase();
              
              // Block object, embed, and form elements if they're not from trusted sources
              if (["object", "embed", "form"].includes(tagName)) {
                console.warn(
                  `Removed potentially dangerous element: ${tagName}`
                );
                node.remove();
                return;
              }

              // For SVG and other elements, remove suspicious attributes
              if (
                tagName === "svg" ||
                tagName === "use" ||
                tagName === "image"
              ) {
                const href = node.getAttribute("href") ||
                  node.getAttributeNS("http://www.w3.org/1999/xlink", "href");
                if (href && href.toLowerCase().startsWith("javascript:")) {
                  node.removeAttribute("href");
                  node.removeAttributeNS(
                    "http://www.w3.org/1999/xlink",
                    "href"
                  );
                  console.warn(`Removed javascript: URI from ${tagName}`);
                }
              }

              // Recursively sanitize child nodes
              const children = Array.from(node.childNodes);
              children.forEach(sanitize);
            } else if (
              node.nodeType === Node.COMMENT_NODE ||
              node.nodeType === Node.PROCESSING_INSTRUCTION_NODE
            ) {
              // Remove comments and processing instructions
              node.remove();
            }
          };

          // Sanitize all nodes in the document
          const bodyChildren = Array.from(doc.body.childNodes);
          bodyChildren.forEach(sanitize);

          // Clear existing content (e.g. "Loading...") before appending
          el.innerHTML = "";

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

          // Re-execute any <script> tags inside included HTML (with security validation)
          const scripts = el.querySelectorAll("script");
          scripts.forEach((oldScript) => {
            // Security check: only re-execute trusted scripts
            if (oldScript.src && !isScriptTrusted(oldScript.src)) {
              console.warn(
                "Blocked untrusted external script in included HTML:",
                oldScript.src
              );
              oldScript.remove();
              return;
            }

            const newScript = document.createElement("script");

            // Copy only safe attributes
            const safeAttributes = ["type", "async", "defer", "charset"];
            for (const attr of oldScript.attributes) {
              if (safeAttributes.includes(attr.name)) {
                newScript.setAttribute(attr.name, attr.value);
              }
            }

            if (oldScript.src) {
              // External script (already validated as trusted above)
              newScript.src = oldScript.src;
            } else {
              // Inline script - copy text content directly
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
