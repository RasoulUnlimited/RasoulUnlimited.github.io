// include.js - improved + refined version
(function () {
  "use strict";

  var ORIGIN = window.location.origin;

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

    // Whitelist of trusted script path prefixes (same-origin)
    const TRUSTED_SCRIPT_PATH_PREFIXES = [
      "/assets/js/",
      "/includes/",
    ];

    function isScriptTrusted(src) {
      // Inline scripts (no src) are considered trusted for this site setup
      // If in future you include untrusted/user content, tighten this rule.
      if (!src) { return true; }

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

    // Optional CSP nonce propagation (if you decide to use it later)
    // Example: <script data-csp-nonce nonce="..."></script> in main HTML
    const cspSourceScript = document.querySelector("script[data-csp-nonce]");
    const globalNonce = cspSourceScript?.nonce || null;

    const fetches = [];

    for (const el of elements) {
      const file = el.getAttribute("data-include-html");
      if (!file) { continue; }

      // Security check: Ensure file is same-origin
      try {
        const fileUrl = new URL(file, ORIGIN);
        if (fileUrl.origin !== ORIGIN) {
          console.error("Blocked cross-origin include:", file);
          continue;
        }
      } catch (e) {
        console.error("Invalid include URL:", file);
        continue;
      }

      // Prevent double-include if function is called again
      el.removeAttribute("data-include-html");

      const fetchPromise = fetch(file)
        .then((resp) => {
          if (!resp.ok) {
            throw new Error("HTTP " + resp.status + " for " + file);
          }
          return resp.text();
        })
        .then((html) => {
          // Use DOMParser to safely parse HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          // Check for parsing errors (more robust than body.firstChild check)
          if (doc.querySelector("parsererror")) {
            throw new Error("Failed to parse HTML for " + file);
          }

          // Sanitize by removing event handlers, comments, and dangerous elements
          const sanitize = (node) => {
            if (!node) { return; }

            if (node.nodeType === Node.ELEMENT_NODE) {
              // Remove all event handler attributes (on*)
              const attributes = Array.from(node.attributes);
              attributes.forEach((attr) => {
                if (attr.name.toLowerCase().startsWith("on")) {
                  console.warn("Removed event handler attribute:", attr.name);
                  node.removeAttribute(attr.name);
                }
              });

              const tagName = node.tagName.toLowerCase();

              // Block object, embed, and iframe elements completely
              if (["object", "embed", "iframe"].includes(tagName)) {
                console.warn("Removed potentially dangerous element:", tagName);
                node.remove();
                return;
              }

              // For specific elements, strip javascript: URLs from href/action/etc.
              if (
                tagName === "svg" ||
                tagName === "use" ||
                tagName === "image" ||
                tagName === "a" ||
                tagName === "area" ||
                tagName === "form" ||
                tagName === "button" ||
                tagName === "input"
              ) {
                const attributesToCheck = [
                  "href",
                  "xlink:href",
                  "action",
                  "formaction",
                ];

                attributesToCheck.forEach((attrName) => {
                  let val = node.getAttribute(attrName);

                  // Special-case xlink:href
                  if (!val && attrName === "xlink:href") {
                    val = node.getAttributeNS(
                      "http://www.w3.org/1999/xlink",
                      "href"
                    );
                  }

                  // eslint-disable-next-line no-script-url
                  if (val && val.toLowerCase().trim().startsWith("javascript:")) {
                    node.removeAttribute(attrName);
                    if (attrName === "xlink:href") {
                      node.removeAttributeNS(
                        "http://www.w3.org/1999/xlink",
                        "href"
                      );
                    }
                    console.warn(
                      "Removed javascript: URI from",
                      tagName,
                      "attribute",
                      attrName
                    );
                  }
                });
              }

              // Recursively sanitize all child nodes (not just elements)
              Array.from(node.childNodes).forEach(sanitize);
            } else if (
              node.nodeType === Node.COMMENT_NODE ||
              node.nodeType === Node.PROCESSING_INSTRUCTION_NODE
            ) {
              // Remove comments and processing instructions
              node.remove();
            }
          };

          // Sanitize all nodes in the document body
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

            // Copy safe attributes including id, class, and data-*
            const safeAttributes = [
              "type",
              "async",
              "defer",
              "charset",
              "id",
              "class",
            ];

            for (const attr of oldScript.attributes) {
              if (
                safeAttributes.includes(attr.name) ||
                attr.name.startsWith("data-")
              ) {
                newScript.setAttribute(attr.name, attr.value);
              }
            }

            // Optional: propagate CSP nonce if you use it
            if (globalNonce) {
              newScript.nonce = globalNonce;
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
      (path || "/")
        .replace(/\/index\.html$/i, "/")
        .replace(/\/+$/, "/") || "/";

    const current = normalize(window.location.pathname);

    document.querySelectorAll(".navbar nav a").forEach((link) => {
      const href = link.getAttribute("href") || "";

      // Skip anchors / mailto / javascript: links
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
      } catch (err) {
        // If URL constructor fails for some reason, leave link inactive
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
