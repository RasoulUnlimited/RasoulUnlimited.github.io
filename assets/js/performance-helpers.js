(function () {
  "use strict";

  // اجرا فقط در محیط مرورگر
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const DOC = document;
  const WIN = window;
  const HEAD = DOC.head || DOC.getElementsByTagName("head")[0];

  if (!HEAD) {
    // اگر head وجود نداشت، عملاً کاری نمی‌تونیم بکنیم
    return;
  }

  // ---- ابزار کمکی: اجرا بعد از آماده شدن DOM ----
  function ready(fn) {
    if (typeof fn !== "function") {return;}

    if (DOC.readyState === "loading") {
      if (typeof DOC.addEventListener === "function") {
        DOC.addEventListener("DOMContentLoaded", function onReady() {
          DOC.removeEventListener("DOMContentLoaded", onReady);
          fn();
        });
      } else {
        // محیط‌های خیلی قدیمی: بدون انتظار
        fn();
      }
    } else {
      fn();
    }
  }

  // ---- 1) Preloaded styles → real stylesheets ----

  function activatePreloadedStyles() {
    if (!DOC.querySelectorAll) {return;}

    const preloads = DOC.querySelectorAll(
      'link[rel="preload"][as="style"][data-make-stylesheet]'
    );

    preloads.forEach(function (preloadLink) {
      // جلوگیری از اجرای دوباره روی یک لینک
      if (preloadLink.dataset.stylesheetActivated === "true") {return;}

      const realHref =
        preloadLink.getAttribute("data-href") ||
        preloadLink.getAttribute("href");

      if (!realHref) {return;}

      const parent = preloadLink.parentNode;
      if (!parent) {return;}

      const newLink = DOC.createElement("link");
      newLink.rel = "stylesheet";
      newLink.href = realHref;

      // کپی کردن attributeهای مهم اگر روی preload ست شده باشند
      if (preloadLink.hasAttribute("crossorigin")) {
        newLink.crossOrigin = preloadLink.crossOrigin;
      }
      if (preloadLink.hasAttribute("referrerpolicy")) {
        newLink.referrerPolicy = preloadLink.referrerPolicy;
      }
      if (preloadLink.media) {
        newLink.media = preloadLink.media;
      }
      if (preloadLink.hasAttribute("integrity")) {
        newLink.integrity = preloadLink.integrity;
      }
      if (preloadLink.hasAttribute("nonce")) {
        // برای CSP
        newLink.nonce = preloadLink.nonce;
      }
      if (preloadLink.title) {
        newLink.title = preloadLink.title;
      }
      if (preloadLink.disabled) {
        newLink.disabled = true;
      }

      parent.insertBefore(newLink, preloadLink.nextSibling);

      // علامت‌گذاری به‌عنوان فعال‌شده
      preloadLink.dataset.stylesheetActivated = "true";

      // بعد از فعال‌سازی، preload دیگه لازم نیست
      try {
        parent.removeChild(preloadLink);
      } catch {
        // اگر حذف نشد، مشکلی نیست
      }
    });
  }

  // ---- 2) AI Signal config ----

  const AI_SIGNAL_CONFIG = Object.freeze({
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
  });

  function ensureMetaTag(name, content) {
    if (!name || !content) {return;}
    if (!HEAD.querySelector) {return;}

    const existing = HEAD.querySelector('meta[name="' + name + '"]');

    // اگر متا موجوده و content خالی نیست، دست نمی‌زنیم
    if (existing && existing.getAttribute("content")) {return;}

    const meta = existing || DOC.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    meta.dataset.aiInjected = "true";

    if (!existing) {
      HEAD.appendChild(meta);
    }
  }

  function ensureLinkTag(config) {
    if (!config || !config.rel) {return;}
    if (!HEAD.querySelector) {return;}

    const selectorParts = ['link[rel="' + config.rel + '"]'];
    if (config.href) {selectorParts.push('[href="' + config.href + '"]');}
    if (config.type) {selectorParts.push('[type="' + config.type + '"]');}

    const selector = selectorParts.join("");
    const existing = HEAD.querySelector(selector);
    if (existing) {return;}

    const link = DOC.createElement("link");
    link.rel = config.rel;
    if (config.href) {link.href = config.href;}
    if (config.type) {link.type = config.type;}
    if (config.title) {link.title = config.title;}
    link.dataset.aiInjected = "true";

    HEAD.appendChild(link);
  }

  function ensureManifestScript() {
    if (!DOC.getElementById) {return;}

    const scriptId = "ai-signal-manifest";
    let payload = "";

    try {
      payload = JSON.stringify(AI_SIGNAL_CONFIG.manifest, null, 2);
    } catch (err) {
      // اگر stringify شکست خورد، چیزی تزریق نکن
      console.error("Failed to stringify AI manifest:", err);
      return;
    }

    let node = DOC.getElementById(scriptId);
    if (node) {
      // اگر محتوای قبلی متفاوت بود، آپدیتش کن
      if (node.textContent !== payload) {
        node.textContent = payload;
      }
    } else {
      node = DOC.createElement("script");
      node.id = scriptId;
      node.type = "application/json";
      node.setAttribute("data-ai", "signal-manifest");
      node.textContent = payload;
      HEAD.appendChild(node);
    }

    // همیشه global را sync نگه می‌داریم
    try {
      WIN.aiSignalManifest = AI_SIGNAL_CONFIG.manifest;
    } catch {
      // اگر window قفل شده بود، نادیده بگیر
    }
  }

  function injectAiSignals() {
    const htmlEl = DOC.documentElement;

    // اگر قبلاً تزریق شده، دوباره انجام نده
    if (htmlEl && htmlEl.dataset.aiSignalsInjected === "true") {
      return;
    }

    Object.keys(AI_SIGNAL_CONFIG.meta).forEach(function (name) {
      ensureMetaTag(name, AI_SIGNAL_CONFIG.meta[name]);
    });

    AI_SIGNAL_CONFIG.links.forEach(ensureLinkTag);
    ensureManifestScript();

    if (htmlEl) {
      htmlEl.dataset.aiSignalsInjected = "true";
    }
  }

  // یک بار بعد از آماده شدن DOM همه چیز را انجام می‌دهیم
  ready(function () {
    activatePreloadedStyles();
    injectAiSignals();
  });
})();
