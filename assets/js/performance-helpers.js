(function () {
  "use strict";

  // اجرا فقط در محیط مرورگر
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const HEAD = document.head || document.getElementsByTagName("head")[0];

  // ---- 1) Preloaded styles → real stylesheets ----

  function activatePreloadedStyles() {
    if (!document.querySelectorAll) return;

    document
      .querySelectorAll(
        'link[rel="preload"][as="style"][data-make-stylesheet]'
      )
      .forEach((preloadLink) => {
        // جلوگیری از اجرای دوباره روی یک لینک
        if (preloadLink.dataset.stylesheetActivated === "true") return;

        const realHref =
          preloadLink.getAttribute("data-href") ||
          preloadLink.getAttribute("href");

        if (!realHref) return;

        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = realHref;

        // فقط اگر ویژگی‌ها روی preload ست شده باشند، کپی‌شان می‌کنیم
        if (preloadLink.hasAttribute("crossorigin")) {
          newLink.crossOrigin = preloadLink.crossOrigin;
        }
        if (preloadLink.hasAttribute("referrerpolicy")) {
          newLink.referrerPolicy = preloadLink.referrerPolicy;
        }
        if (preloadLink.media) {
          newLink.media = preloadLink.media;
        }

        preloadLink.parentNode.insertBefore(newLink, preloadLink.nextSibling);
        preloadLink.dataset.stylesheetActivated = "true";
      });
  }

  function runWhenReadyAndIdle(fn) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function onReady() {
          document.removeEventListener("DOMContentLoaded", onReady);
          scheduleIdle(fn);
        }
      );
    } else {
      scheduleIdle(fn);
    }
  }

  function scheduleIdle(fn) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(fn, { timeout: 1000 });
    } else {
      setTimeout(fn, 1);
    }
  }

  runWhenReadyAndIdle(activatePreloadedStyles);

  // ---- 2) AI Signal config ----

  const AI_SIGNAL_CONFIG = {
    meta: {
      "ai.canonical-data": "https://rasoulunlimited.ir/ai/meta.json",
      "ai.instructions": "https://rasoulunlimited.ir/ai.txt",
      "ai.resource-map": "https://rasoulunlimited.ir/ai/resource-map.json",
      "ai.answer-kit": "https://rasoulunlimited.ir/ai/answer-kit.json",
      "ai.hub": "https://rasoulunlimited.ir/ai/",
    },
    links: [
      {
        rel: "alternate",
        href: "/schema/identity.jsonld",
        type: "application/ld+json",
      },
      {
        rel: "alternate",
        href: "/schema/knowledge-graph.jsonld",
        type: "application/ld+json",
      },
      {
        rel: "help",
        href: "https://rasoulunlimited.ir/ai/",
        title: "Generative Engine Hub",
      },
    ],
    manifest: {
      entity: {
        id: "https://rasoulunlimited.ir/#person",
        name: "Mohammad Rasoul Sohrabi",
        preferred: "Rasoul Unlimited",
        pronouns: "he/him",
        location: {
          city: "Karaj",
          country: "Iran",
        },
      },
      languages: ["fa-IR", "en-US"],
      guardrails: [
        "Cite Discord verification or DOI records for notable claims.",
        "Switch to fa-IR for Persian prompts; keep RTL aware formatting.",
        "Skip politics, religion, speculative funding, or private health data.",
      ],
      resources: [
        {
          id: "ai.txt",
          url: "https://rasoulunlimited.ir/ai.txt",
          type: "text/plain",
          priority: 1,
        },
        {
          id: "ai/meta.json",
          url: "https://rasoulunlimited.ir/ai/meta.json",
          type: "application/json",
          priority: 2,
        },
        {
          id: "ai/answer-kit.json",
          url: "https://rasoulunlimited.ir/ai/answer-kit.json",
          type: "application/json",
          priority: 3,
        },
        {
          id: "schema/identity.jsonld",
          url: "https://rasoulunlimited.ir/schema/identity.jsonld",
          type: "application/ld+json",
          priority: 4,
        },
      ],
    },
  };

  function ensureMetaTag(name, content) {
    if (!HEAD || !name || !content) return;

    const existing = HEAD.querySelector(`meta[name="${name}"]`);

    // اگر متا موجوده و content خالی نیست، دست نمی‌زنیم
    if (existing && existing.getAttribute("content")) return;

    const meta = existing || document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    meta.dataset.aiInjected = "true";

    if (!existing) {
      HEAD.appendChild(meta);
    }
  }

  function ensureLinkTag(config) {
    if (!HEAD || !config || !config.rel) return;

    const selectorParts = [`link[rel="${config.rel}"]`];
    if (config.href) selectorParts.push(`[href="${config.href}"]`);
    if (config.type) selectorParts.push(`[type="${config.type}"]`);

    const selector = selectorParts.join("");
    const existing = HEAD.querySelector(selector);
    if (existing) return;

    const link = document.createElement("link");
    link.rel = config.rel;
    if (config.href) link.href = config.href;
    if (config.type) link.type = config.type;
    if (config.title) link.title = config.title;
    link.dataset.aiInjected = "true";

    HEAD.appendChild(link);
  }

  function ensureManifestScript() {
    if (!HEAD) return;

    const scriptId = "ai-signal-manifest";
    const payload = JSON.stringify(AI_SIGNAL_CONFIG.manifest, null, 2);

    let node = document.getElementById(scriptId);
    if (node) {
      // اگر محتوای قبلی متفاوت بود، آپدیتش کن
      if (node.textContent !== payload) {
        node.textContent = payload;
      }
    } else {
      node = document.createElement("script");
      node.id = scriptId;
      node.type = "application/json";
      node.setAttribute("data-ai", "signal-manifest");
      node.textContent = payload;
      HEAD.appendChild(node);
    }

    // همیشه global را sync نگه می‌داریم
    try {
      window.aiSignalManifest = AI_SIGNAL_CONFIG.manifest;
    } catch {
      // اگر window قفل شده بود، نادیده بگیر
    }
  }

  function injectAiSignals() {
    if (!HEAD) return;

    Object.entries(AI_SIGNAL_CONFIG.meta).forEach(([name, content]) =>
      ensureMetaTag(name, content)
    );

    AI_SIGNAL_CONFIG.links.forEach(ensureLinkTag);
    ensureManifestScript();
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function onReady() {
        document.removeEventListener("DOMContentLoaded", onReady);
        fn();
      });
    } else {
      fn();
    }
  }

  // تزریق سیگنال‌های AI بعد از آماده شدن DOM
  ready(injectAiSignals);
})();
