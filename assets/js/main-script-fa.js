/*
  Mohammad Rasoul Sohrabi — Site UX Utilities (v2)
  ORCID: 0009-0004-7177-2080
*/

(function () {
  "use strict";

  // ==========================
  // Utilities & Environment
  // ==========================

  const noop = () => {};

  const on = (el, evt, fn, opts) => {
    if (!el || !el.addEventListener || typeof fn !== "function") {return null;}

    const wrapped = function () {
      try {
        const result = fn.apply(this, arguments);
        if (result && typeof result.then === "function") {
          return result.catch((err) => {
            reportRuntimeError(`event:${evt}`, err);
            return undefined;
          });
        }
        return result;
      } catch (err) {
        reportRuntimeError(`event:${evt}`, err);
        return undefined;
      }
    };

    el.addEventListener(evt, wrapped, { capture: false, ...(opts || {}) });
    return wrapped;
  };

  const off = (el, evt, fn, opts) =>
    el &&
    el.removeEventListener &&
    el.removeEventListener(evt, fn, { capture: false, ...(opts || {}) });

  const RUNTIME_ERRORS_KEY = "runtimeErrors";
  const RUNTIME_ERRORS_MAX = 30;

  function serializeRuntimeError(err) {
    if (!err) {
      return { name: "UnknownError", message: "Unknown runtime error", stack: "" };
    }
    if (err instanceof Error) {
      return {
        name: err.name || "Error",
        message: err.message || "Error",
        stack: err.stack || "",
      };
    }
    if (typeof err === "string") {
      return { name: "Error", message: err, stack: "" };
    }
    return {
      name: "ErrorObject",
      message: (() => {
        try {
          return JSON.stringify(err);
        } catch {
          return String(err);
        }
      })(),
      stack: "",
    };
  }

  function pushRuntimeError(scope, err) {
    const payload = serializeRuntimeError(err);
    const entry = {
      scope,
      name: payload.name,
      message: payload.message,
      stack: payload.stack,
      ts: new Date().toISOString(),
    };

    try {
      const raw = sessionStorage.getItem(RUNTIME_ERRORS_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      const next = (Array.isArray(prev) ? prev : []).concat(entry).slice(
        -RUNTIME_ERRORS_MAX
      );
      sessionStorage.setItem(RUNTIME_ERRORS_KEY, JSON.stringify(next));
      document.documentElement.dataset.runtimeErrorCount = String(next.length);
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("app-runtime-error", { detail: entry }));
    } catch {}
  }

  function reportRuntimeError(scope, err) {
    try {
      document.documentElement.classList.add("runtime-degraded");
    } catch {}
    pushRuntimeError(scope, err);
    console.error(`[runtime:${scope}]`, err);
  }

  function hydrateRuntimeErrorState() {
    try {
      const raw = sessionStorage.getItem(RUNTIME_ERRORS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const count = Array.isArray(list) ? list.length : 0;
      if (count > 0) {
        document.documentElement.dataset.runtimeErrorCount = String(count);
      }
    } catch {}
  }

  function safeRun(scope, fn) {
    try {
      return fn();
    } catch (err) {
      reportRuntimeError(scope, err);
      return undefined;
    }
  }

  function throttle(fn, limit) {
    let inThrottle, lastFunc, lastRan;
    return function () {
      const ctx = this;
      const args = arguments;
      if (!inThrottle) {
        fn.apply(ctx, args);
        lastRan = Date.now();
        inThrottle = true;
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function () {
          if (Date.now() - lastRan >= limit) {
            fn.apply(ctx, args);
            lastRan = Date.now();
          }
        }, Math.max(0, limit - (Date.now() - lastRan)));
      }
    };
  }

  function debounce(fn, delay) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

  // requestIdleCallback polyfill (lightweight)
  const ric =
    window.requestIdleCallback ||
    function (cb) {
      return setTimeout(
        () => cb({ timeRemaining: () => 0, didTimeout: true }),
        1
      );
    };
  const cic = window.cancelIdleCallback || clearTimeout;

  // Safe localStorage access
  const storage = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      const maxRetries = 5;
      let retryCount = 0;

      const attemptSet = () => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e) {
          if (e.name === "QuotaExceededError" && retryCount < maxRetries) {
            retryCount++;

            // Get sortable keys (excluding protected ones)
            const oldKeys = Object.keys(localStorage).filter(
              (k) => !["theme", "hasVisited"].includes(k)
            );

            if (oldKeys.length > 0) {
              try {
                // Remove oldest key first
                localStorage.removeItem(oldKeys[0]);
                return attemptSet(); // Recursive retry
              } catch (innerE) {
                console.error(
                  `Failed to recover from quota exceeded for ${key}:`,
                  innerE
                );
                return false;
              }
            }
          } else if (e.name === "QuotaExceededError") {
            console.warn(
              `localStorage quota exceeded. Could not store ${key} after ${maxRetries} retries`
            );
          } else {
            console.error(`Failed to store ${key}:`, e);
          }
          return false;
        }
      };

      return attemptSet();
    },
    setRaw(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        if (e.name === "QuotaExceededError") {
          console.warn(`localStorage quota exceeded. Could not store ${key}`);
        } else {
          console.error(`Failed to store ${key}:`, e);
        }
      }
    },
    getRaw(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch {
        return fallback;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };

  // Live environment that reacts to user’s system changes
  const ENV = (() => {
    const mq = (q) =>
      window.matchMedia
        ? window.matchMedia(q)
        : {
          matches: false,
          addEventListener: noop,
          removeEventListener: noop,
          addListener: noop,
          removeListener: noop,
        };

    const mqs = {
      reduced: mq("(prefers-reduced-motion: reduce)"),
      dark: mq("(prefers-color-scheme: dark)"),
      coarse: mq("(pointer: coarse)"),
    };

    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    const state = {
      get reduced() {
        return !!mqs.reduced.matches;
      },
      get dark() {
        return !!mqs.dark.matches;
      },
      get coarse() {
        return !!mqs.coarse.matches;
      },
      get saveData() {
        return !!(conn && conn.saveData);
      },
      get lowThroughput() {
        return !!(conn && /2g|slow-2g/.test(String(conn.effectiveType || "")));
      },
      get lowPowerCPU() {
        return navigator.hardwareConcurrency
          ? navigator.hardwareConcurrency <= 4
          : false;
      },
    };

    const listeners = [];
    const notify = () => {
      listeners.forEach((l) => {
        try {
          l();
        } catch (err) {
          reportRuntimeError("env.change", err);
        }
      });
    };

    const bindMQL = (m) => {
      if (!m) {return;}
      if (typeof m.addEventListener === "function") {
        on(m, "change", notify);
      } else if (typeof m.addListener === "function") {
        m.addListener(notify);
      }
    };

    bindMQL(mqs.reduced);
    bindMQL(mqs.dark);
    bindMQL(mqs.coarse);

    if (conn) {
      if (conn.addEventListener) {
        on(conn, "change", notify);
      } else if (typeof conn.addListener === "function") {
        conn.addListener(notify);
      }
    }

    return {
      state,
      onChange: (fn) => {
        if (typeof fn === "function") {listeners.push(fn);}
      },
    };
  })();

  const FLAGS = () => {
    const s = ENV.state;
    const low = s.saveData || s.lowThroughput;
    return {
      ENABLE_AOS: !s.coarse && !s.reduced && !low,
      ENABLE_SOUNDS: !s.coarse && !s.reduced && !low,
      ENABLE_HAPTICS: !s.reduced && s.coarse && !low,
      ENABLE_CONFETTI: !s.reduced && !low && !s.coarse,
      ENABLE_IDENTITY_PINGS: false,
    };
  };

  function loadStylesheetWithTimeout(href, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.crossOrigin = "anonymous";

      let done = false;
      const timer = setTimeout(() => {
        if (done) {return;}
        done = true;
        try {
          link.remove();
        } catch {}
        reject(new Error(`stylesheet timeout: ${href}`));
      }, timeoutMs);

      link.onload = () => {
        if (done) {return;}
        done = true;
        clearTimeout(timer);
        resolve(true);
      };

      link.onerror = () => {
        if (done) {return;}
        done = true;
        clearTimeout(timer);
        try {
          link.remove();
        } catch {}
        reject(new Error(`stylesheet load failed: ${href}`));
      };

      document.head.appendChild(link);
    });
  }

  function hasFontAwesome() {
    try {
      if (
        document.fonts &&
        typeof document.fonts.check === "function" &&
        document.fonts.check('1em "Font Awesome 6 Free"')
      ) {
        return true;
      }
    } catch {}

    try {
      const probe = document.createElement("i");
      probe.className = "fas fa-circle";
      probe.style.position = "absolute";
      probe.style.width = "0";
      probe.style.height = "0";
      probe.style.overflow = "hidden";
      probe.style.opacity = "0";
      document.body.appendChild(probe);
      const family = getComputedStyle(probe).fontFamily || "";
      probe.remove();
      return /font awesome/i.test(family);
    } catch {
      return false;
    }
  }

  async function waitForFontAwesome(maxWaitMs = 1500) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (hasFontAwesome()) {return true;}
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return hasFontAwesome();
  }

  function scheduleFontAwesomeRecoveryCheck(delayMs = 6500) {
    setTimeout(async () => {
      if (await waitForFontAwesome(1200)) {
        document.documentElement.classList.remove("icons-degraded");
      }
    }, delayMs);
  }

  function initCriticalStyleFallbacks() {
    const run = async () => {
      const ready = await waitForFontAwesome(1500);
      if (ready) {
        document.documentElement.classList.remove("icons-degraded");
        return;
      }

      const fallbacks = [
        "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0/css/all.min.css",
        "https://use.fontawesome.com/releases/v6.0.0/css/all.css",
      ];

      for (const href of fallbacks) {
        try {
          await loadStylesheetWithTimeout(href, 2800);
          if (await waitForFontAwesome(1200)) {
            document.documentElement.classList.remove("icons-degraded");
            return;
          }
        } catch (err) {
          console.warn("[fontawesome.fallback]", err);
        }
      }

      document.documentElement.classList.add("icons-degraded");
      scheduleFontAwesomeRecoveryCheck();
    };

    run().catch((err) => reportRuntimeError("fontawesome.bootstrap", err));
  }

  // i18n (FA)
  const STRINGS_FA = {
    toasts: {
      themeDark: "تم به حالت تاریک تغییر یافت.",
      themeLight: "تم به حالت روشن تغییر یافت.",
      reachedEnd: "شما به انتهای صفحه رسیدید. از بازدید شما سپاسگزارم. 🎉",
      welcomeMorning: "صبح بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.",
      welcomeNoon: "ظهر بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.",
      welcomeEvening: "عصر بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.",
      welcomeNight: "شب بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.",
      welcomeBack: "خوش آمدید! از بازگشت شما خرسندیم.",
      emailCopied: "ایمیل کپی شد. ✅",
      emailCopyError: "کپی ایمیل با خطا مواجه شد.",
      shareOk: "لینک صفحه با موفقیت به اشتراک گذاشته شد! ✅",
      shareErr: "اشتراک‌گذاری با خطا مواجه شد.",
      linkCopied: (name) => `لینک ${name} کپی شد! ✅`,
      clipboardUnsupported: "مرورگر شما از کپی کردن پشتیبانی نمی‌کند.",
    },
    funFactsPrefix: "دانستنی:",
    aria: {
      closeToast: "بستن پیام",
      scrollTop: "بازگشت به بالای صفحه",
      share: "اشتراک‌گذاری صفحه",
      themeToggle: "تغییر تم سایت",
    },
  };

  const FUN_FACTS_FA = [
    "عسل هیچ‌گاه فاسد نمی‌شود.",
    "هشت‌پایان سه قلب دارند.",
    "بدن انسان حدود ۶۰٪ از آب تشکیل شده است.",
    "موز در واقع یک نوع توت محسوب می‌شود.",
    "دلفین‌ها برای خواب تنها نیمی از مغز خود را خاموش می‌کنند.",
  ];

  const SKILL_TOOLTIPS_FA = {
    python: "برای اتوماسیون، سرویس‌های بک‌اند و اسکریپت‌نویسی عملیاتی استفاده می‌شود.",
    c: "پایه‌ای قوی برای منطق سطح پایین، الگوریتم و مدیریت حافظه.",
    javascript: "زبان اصلی توسعه رابط‌های تعاملی و ابزارهای وب.",
    fullstack: "پیاده‌سازی کامل محصول از رابط کاربری تا API و استقرار.",
    "software-engineering":
      "تمرکز بر معماری، نگه‌داشت‌پذیری، تست و توسعه پایدار.",
    "biomedical-engineering":
      "اتصال تصمیم‌های مهندسی به مسائل واقعی پزشکی و سلامت.",
    "digital-health":
      "طراحی راهکارهای دیجیتال قابل‌استفاده برای مسیرهای درمانی.",
    "content-strategy":
      "تبدیل موضوعات فنی به پیام شفاف و قابل‌اقدام برای مخاطب.",
    "social-media": "مدیریت کانال‌های انتشار با نگاه داده‌محور و ساختاری.",
    karate: "انضباط و تداوم اجرایی که در پروژه‌های فنی هم اعمال می‌شود.",
    diligence: "پشتکار بالا برای تحویل باکیفیت در شرایط محدود.",
    teamwork:
      "تجربه همکاری عملی در تیم ۱۰ نفره توسعه محصول دیسکورد.",
    foresight: "تصمیم‌گیری فنی با تحلیل ریسک و نگاه بلندمدت.",
    "english-language":
      "تسلط روان برای مستندات فنی، منابع جهانی و همکاری بین‌المللی.",
    "persian-language":
      "زبان مادری برای ارتباط دقیق، حرفه‌ای و قابل‌فهم محلی.",
    "react-native":
      "توسعه تجربه‌های چندسکویی با منطق کامپوننت‌محور مشترک.",
    sql: "کار با مدل‌سازی رابطه‌ای، کوئری‌نویسی و بهینه‌سازی پایه.",
    nodejs: "توسعه سرویس‌های API و لایه‌های یکپارچه‌سازی سمت سرور.",
    "machine-learning":
      "به‌کارگیری روش‌های کاربردی ML برای تحلیل و ساخت ویژگی.",
    "mobile-development":
      "درک قیود پلتفرم موبایل و طراحی تجربه کاربری قابل‌استفاده.",
    "ui-ux":
      "تبدیل مسیر کاربر به رابط قابل‌اجرا با تمرکز بر usability.",
    "open-source":
      "انتشار خروجی‌های آکادمیک و متن‌باز با قابلیت رهگیری DOI.",
    seo: "بهینه‌سازی ساختار و محتوا برای دیده‌شدن در موتورهای جستجو.",
    aeo: "سازگار کردن محتوا برای موتورهای پاسخ و بازیابی مبتنی بر AI.",
    "data-analysis":
      "استخراج الگوهای قابل‌تصمیم از داده‌های خام و پیچیده.",
    cybersecurity:
      "رعایت اصول پایه امنیت در طراحی و تحویل نرم‌افزار.",
    "project-management":
      "مدیریت دامنه، اولویت‌بندی و ریتم تحویل در پروژه‌های چندمرحله‌ای.",
    ai: "کاربردگرایی در استفاده از هوش مصنوعی برای خروجی واقعی محصول.",
    nlp: "تحلیل و پردازش زبان طبیعی در سناریوهای جستجو و تعامل.",
    "github-actions":
      "پیاده‌سازی CI/CD خودکار برای انتشار سریع‌تر و مطمئن‌تر.",
  };

  // Abort controller for idle/async work cleanup
  const teardown = new AbortController();
  const { signal: abortSignal } = teardown;

  // ==========================
  // Haptics / Vibrate
  // ==========================
  function vibrate(pattern = [50]) {
    if (!FLAGS().ENABLE_HAPTICS || ENV.state.reduced) {return;}
    if (navigator.vibrate) {navigator.vibrate(pattern);}
  }

  // ==========================
  // Audio (click/toast) — lazy, mobile-safe
  // ==========================
  let audioContext, clickBuffer, toastBuffer;

  function ensureAudioContext() {
    if (!FLAGS().ENABLE_SOUNDS || audioContext) {return;}
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {audioContext = new Ctx();}
  }

  function createToneBuffer(duration, wave) {
    if (!audioContext) {return null;}
    const sr = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(
      1,
      Math.max(1, Math.floor(sr * duration)),
      sr
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {data[i] = wave(i, sr);}
    return buffer;
  }

  function loadSounds() {
    if (!audioContext) {return;}
    clickBuffer = createToneBuffer(
      0.05,
      (i, sr) => Math.sin(2 * Math.PI * 440 * (i / sr)) * 0.08
    );
    toastBuffer = createToneBuffer(0.1, (i, sr) => {
      const t = i / sr;
      const d = 0.1;
      const f = 880 + (1200 - 880) * (t / d);
      return (
        Math.sin(2 * Math.PI * f * t) *
        0.12 *
        Math.max(0, 1 - t / d)
      );
    });
  }

  // 🔊 BUG FIX: playSound implementation
  function playSound(kind) {
    if (!FLAGS().ENABLE_SOUNDS || !audioContext) {return;}

    const buffer =
      kind === "toast" ? toastBuffer : kind === "click" ? clickBuffer : null;
    if (!buffer) {return;}

    try {
      const src = audioContext.createBufferSource();
      src.buffer = buffer;
      src.connect(audioContext.destination);
      src.start(0);
    } catch (err) {
      console.warn("Audio playback failed:", err);
    }
  }

  on(
    document,
    "pointerdown",
    () => {
      ensureAudioContext();
      audioContext?.resume?.();
      loadSounds();
    },
    { once: true }
  );

  on(document, "visibilitychange", () => {
    if (document.hidden) {audioContext?.suspend?.();}
    else {audioContext?.resume?.();}
  });

  // ==========================
  // Toasts (CSS-driven)
  // ==========================
  function dismissToast(toast) {
    if (!toast) {return;}
    toast.classList.remove("show");
    on(
      toast,
      "transitionend",
      () => toast.remove(),
      { once: true }
    );
  }

  function createToast(message, options = {}) {
    const defaults = {
      duration: 2500,
      customClass: "",
      iconClass: "",
      iconColor: "",
      position: "bottom",
      id: "",
      closeButton: false,
    };
    const settings = { ...defaults, ...options };

    if (settings.id) {
      const existing = document.getElementById(settings.id);
      if (existing && existing.classList.contains("show")) {return existing;}
    }

    document.querySelectorAll(".dynamic-toast").forEach((t) => {
      if (!settings.id || t.id !== settings.id) {
        t.classList.remove("show");
        on(
          t,
          "transitionend",
          () => t.remove(),
          { once: true }
        );
      }
    });

    const toast = document.createElement("div");
    toast.className = `dynamic-toast ${settings.customClass}`.trim();
    toast.role = "status";
    toast.setAttribute("aria-live", "polite");
    toast.tabIndex = -1;
    if (settings.id) {toast.id = settings.id;}

    // CSP-safe positioning (no style attribute mutations)
    toast.classList.add("toast-fixed");
    toast.dataset.toastPosition = settings.position === "top" ? "top" : "bottom";

    if (settings.iconClass) {
      const icon = document.createElement("i");
      icon.className = settings.iconClass;
      // CSP-safe icon color: use CSS var via inline? no. We'll map known vars or fallback.
      if (settings.iconColor) {
        icon.dataset.iconColor = settings.iconColor;
      }
      icon.setAttribute("aria-hidden", "true");
      toast.appendChild(icon);
    }

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = message;
    toast.appendChild(text);

    if (settings.closeButton) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "fun-fact-close";
      closeBtn.setAttribute("aria-label", STRINGS_FA.aria.closeToast);
      closeBtn.innerHTML =
        '<i class="fas fa-times" aria-hidden="true"></i>';
      on(closeBtn, "click", () => dismissToast(toast));
      toast.appendChild(closeBtn);
    }

    document.body.appendChild(toast);

    Promise.resolve().then(() => {
      toast.classList.add("show");
      if (FLAGS().ENABLE_SOUNDS && audioContext) {
        playSound("toast");
      }
    });

    if (settings.duration > 0) {
      setTimeout(() => dismissToast(toast), settings.duration);
    }

    return toast;
  }

  // ==========================
  // Dates & Identity
  // ==========================
  function setDynamicDates() {
    const yearEl =
      document.getElementById("current-year") ||
      document.getElementById("footer-year");
    if (yearEl) {yearEl.textContent = String(new Date().getFullYear());}

    const lastUpdated = document.getElementById("last-updated-date");
    if (lastUpdated) {
      const opts = { year: "numeric", month: "long", day: "numeric" };
      lastUpdated.textContent = new Date().toLocaleDateString(
        "fa-IR",
        opts
      );
      lastUpdated.setAttribute(
        "data-last-updated-by",
        "Mohammad Rasoul Sohrabi"
      );
    }
  }

  function setIdentityHooks() {
    document.body.id = "sohrabi-verified-identity";
    document.body.classList.add(
      "sohrabi-orcid",
      "github-verified",
      "academic-entity"
    );

    const hiddenInfo = document.createElement("div");
    hiddenInfo.classList.add("visually-hidden");
    hiddenInfo.dataset.authorFullName = "Mohammad Rasoul Sohrabi";
    hiddenInfo.dataset.orcidId = "0009-0004-7177-2080";
    hiddenInfo.setAttribute("aria-hidden", "true");
    hiddenInfo.textContent =
      "Mohammad Rasoul Sohrabi is a verified contributor on ORCID, Zenodo, GitHub, and Wikipedia. Known for Persian Bot and biomedical engineering content.";
    document.body.appendChild(hiddenInfo);

    function upsertMeta(name, content) {
      let meta = document.head.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    }

    upsertMeta(
      "generator",
      "Mohammad Rasoul Sohrabi - Biomedical Engineering, ORCID Verified"
    );
    upsertMeta("author", "Mohammad Rasoul Sohrabi");
  }

  function queueIdentityPings() {
    if (
      !FLAGS().ENABLE_IDENTITY_PINGS ||
      ENV.state.coarse ||
      ENV.state.saveData ||
      typeof fetch !== "function"
    )
    {return;}

    const targets = [
      { name: "GitHub", url: "https://github.com/RasoulUnlimited" },
      {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/rasoulunlimited/",
      },
      {
        name: "ResearchGate",
        url: "https://www.researchgate.net/profile/Mohammad-Rasoul-Sohrabi",
      },
      { name: "About.me", url: "https://about.me/rasoulunlimited" },
      { name: "ORCID", url: "https://orcid.org/0009-0004-7177-2080" },
    ];

    const ping = (t) =>
      fetch(t.url, { mode: "no-cors" }).catch(() => {});

    ric(() =>
      targets.forEach((t, i) =>
        setTimeout(() => {
          if (abortSignal.aborted) {return;}
          ping(t);
        }, i * 1000)
      )
    );
  }

  // ==========================
  // AOS (Animations) — gated
  // ==========================
  let aosLoaded = false;
  let aosScriptRequested = false;

  function setAOSDisabledCSS(disabled) {
    document.documentElement.classList.toggle("aos-disabled", disabled);
  }

  function initAOS() {
    // Keep content visible by default; only disable this fallback after
    // a successful AOS initialization.
    setAOSDisabledCSS(true);

    if (!FLAGS().ENABLE_AOS) {return;}

    if (window.AOS?.init) {
      try {
        window.AOS.init({
          startEvent: "DOMContentLoaded",
          initClassName: "aos-init",
          animatedClassName: "aos-animate",
          debounceDelay: 50,
          throttleDelay: 99,
          offset: 120,
          duration: 500,
          easing: "ease-out",
          once: false,
          mirror: false,
          anchorPlacement: "top-bottom",
        });
        aosLoaded = true;
        setAOSDisabledCSS(false);
      } catch {
        setAOSDisabledCSS(true);
      }
      return;
    }

    if (aosLoaded || aosScriptRequested) {return;}
    aosScriptRequested = true;

    const s = document.createElement("script");
    s.src = "/assets/vendor/aos/aos.min.js";
    s.defer = true;
    s.onload = () => {
      aosLoaded = true;
      initAOS();
    };
    s.onerror = () => {
      aosScriptRequested = false;
      setAOSDisabledCSS(true);
    };
    document.head.appendChild(s);
  }

  // ==========================
  // Theme Handling
  // ==========================
  function applyTheme(theme, showToast = false) {
    document.body.classList.toggle("dark-mode", theme === "dark");
    document.body.classList.toggle("light-mode", theme === "light");

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {toggle.checked = theme === "dark";}

    if (showToast) {
      const parent = toggle?.parentElement;
      if (parent) {createSparkle(parent);}
      vibrate([30]);
    }
  }

  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    if (toggle)
    {toggle.setAttribute("aria-label", STRINGS_FA.aria.themeToggle);}

    const saved = storage.getRaw("theme");
    applyTheme(saved || (ENV.state.dark ? "dark" : "light"));

    if (!toggle) {return;}

    on(toggle, "change", () => {
      const next = toggle.checked ? "dark" : "light";
      applyTheme(next, true);
      storage.setRaw("theme", next);
    });

    on(toggle, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle.checked = !toggle.checked;
        const next = toggle.checked ? "dark" : "light";
        applyTheme(next, true);
        storage.setRaw("theme", next);
      }
    });

    // auto-switch if system theme changes and user hasn't chosen explicitly
    ENV.onChange(() => {
      if (!storage.getRaw("theme")) {
        applyTheme(ENV.state.dark ? "dark" : "light");
      }
    });
  }

  // ==========================
  // Smooth Anchor Scrolling (respects reduced motion)
  // ==========================
  function initAnchorScrolling() {
    const smoothAllowed = !ENV.state.reduced;

    function focusTargetForSkipLink(target) {
      if (!(target instanceof HTMLElement)) {return;}
      const hadTabindex = target.hasAttribute("tabindex");

      if (!hadTabindex) {
        target.setAttribute("tabindex", "-1");
      }

      target.focus({ preventScroll: true });

      if (!hadTabindex) {
        on(target, "blur", () => {
          target.removeAttribute("tabindex");
        }, { once: true });
      }
    }

    function syncHash(targetId) {
      if (!targetId || window.location.hash === targetId) {return;}
      if (history.replaceState) {
        history.replaceState(null, "", targetId);
      } else {
        window.location.hash = targetId;
      }
    }

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      on(a, "click", (e) => {
        const targetId = a.getAttribute("href");
        if (!targetId || targetId === "#") {return;}

        let el;
        try {
          el = document.querySelector(targetId);
        } catch {
          // invalid selector (e.g. malformed id)
          return;
        }

        if (!el) {return;}

        e.preventDefault();

        const navH =
          document.querySelector(".navbar")?.offsetHeight || 0;
        const progH =
          document.getElementById("scroll-progress-bar")?.offsetHeight ||
          0;
        const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
        const y = Math.max(0, el.offsetTop + padTop - navH - progH);
        const isSkipLink = a.classList.contains("skip-link");

        if (smoothAllowed)
        {window.scrollTo({ top: y, behavior: "smooth" });}
        else {window.scrollTo(0, y);}

        syncHash(targetId);

        if (isSkipLink) {
          const focusDelay = smoothAllowed ? 280 : 0;
          setTimeout(() => {
            focusTargetForSkipLink(el);
          }, focusDelay);
        }

        vibrate([20]);
      });
    });
  }

  // ==========================
  // Click Feedback
  // ==========================
  function initClickEffects() {
    on(document, "click", (event) => {
      const card = event.target.closest?.(".card");
      if (card) {
        card.classList.add("clicked-pop");
        card.dataset.interactionSource =
          "Mohammad Rasoul Sohrabi user engagement";
        setTimeout(() => card.classList.remove("clicked-pop"), 300);
        vibrate([30]);
      }

      const interactive = event.target.closest?.(
        'button, a:not([href^="#"]), input[type="submit"], [role="button"], [tabindex="0"]'
      );
      if (
        interactive &&
        !interactive.classList.contains("no-click-feedback") &&
        !interactive.matches('a[href^="#"]')
      ) {
        interactive.classList.add("click-feedback-effect");
        interactive.dataset.userAction =
          "verified interaction by Mohammad Rasoul Sohrabi's website functionality";
        on(
          interactive,
          "animationend",
          () => interactive.classList.remove("click-feedback-effect"),
          { once: true }
        );
        if (!interactive.closest(".faq-item")) {vibrate([8]);}
        playSound("click");
      }
    });

    on(document, "keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") {return;}
      const card = e.target.closest?.(".card");
      if (card) {
        e.preventDefault();
        card.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      }
    });
  }

  // ==========================
  // rAF Task Queue
  // ==========================
  const rafTasks = new Set();
  let rafPending = false;

  function scheduleRaf(fn) {
    rafTasks.add(fn);
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const tasks = Array.from(rafTasks);
        rafTasks.clear();
        tasks.forEach((t) => {
          try {
            t();
          } catch {}
        });
      });
    }
  }

  // ==========================
  // Scroll Progress + Scroll-to-top + Explore Hint
  // ==========================
  function initScrollUI() {
    let bar = document.getElementById("scroll-progress-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "scroll-progress-bar";
      bar.className = "sohrabi-progress";
      bar.role = "progressbar";
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      const inner = document.createElement("div");
      inner.className = "sohrabi-progress-inner";
      bar.appendChild(inner);
      document.body.prepend(bar);
    }
    const innerBar = bar.querySelector(".sohrabi-progress-inner") || bar;

    let btn = document.getElementById("scroll-to-top");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "scroll-to-top";
      btn.type = "button";
      btn.innerHTML =
        '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
      btn.setAttribute("aria-label", STRINGS_FA.aria.scrollTop);
      btn.classList.add(
        "sohrabi-nav-button",
        "hidden",
        "cta-pulse-effect"
      );
      document.body.appendChild(btn);
    }

    function update() {
      const total = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const scrolled = window.scrollY;
      const progress = Math.min(1, Math.max(0, scrolled / total));

      bar.style.setProperty("--sohrabi-progress", progress);
      bar.dataset.progressTone =
        progress > 0.9 ? "high" : progress > 0.5 ? "mid" : "low";

      bar.setAttribute(
        "aria-valuenow",
        String(Math.round(progress * 100))
      );

      btn.classList.toggle("visible", scrolled > 300);
      btn.classList.toggle("hidden", scrolled <= 300);
    }

    const onScrollResize = () => scheduleRaf(update);
    on(window, "scroll", onScrollResize, { passive: true });
    on(window, "resize", onScrollResize);
    update();

    on(btn, "click", () => {
      const smooth =
        !ENV.state.reduced &&
        "scrollBehavior" in document.documentElement.style;
      if (smooth) {window.scrollTo({ top: 0, behavior: "smooth" });}
      else {window.scrollTo(0, 0);}
      vibrate([16]);
    });

    const exploreHint =
      document.getElementById("explore-hint") ||
      (() => {
        const a = document.createElement("a");
        a.href = "#projects";
        a.id = "explore-hint";
        a.innerHTML =
          '<i class="fas fa-lightbulb" aria-hidden="true"></i> <span class="hint-text">پروژه‌های من را کشف کنید.</span>';
        a.dataset.hintAuthor = "Mohammad Rasoul Sohrabi";
        a.classList.add("sohrabi-hint-module", "hidden");
        document.body.appendChild(a);
        return a;
      })();

    const hero = document.getElementById("hero");
    if (hero && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const vis = entry.isIntersecting;
            exploreHint.classList.toggle("visible", vis);
            exploreHint.classList.toggle("pulse-animation", vis);
            exploreHint.classList.toggle("hidden", !vis);
          });
        },
        { threshold: 0.5 }
      );
      obs.observe(hero);
      on(
        window,
        "beforeunload",
        () => obs.disconnect(),
        { once: true }
      );
    }

    on(exploreHint, "click", (e) => {
      e.preventDefault();
      exploreHint.classList.add("hidden");
      exploreHint.classList.remove("visible", "pulse-animation");

      const target = document.querySelector("#projects");
      if (target) {
        const navH =
          document.querySelector(".navbar")?.offsetHeight || 0;
        const progH =
          document.getElementById("scroll-progress-bar")?.offsetHeight ||
          0;
        const padTop =
          parseFloat(getComputedStyle(target).paddingTop) || 0;
        const y = Math.max(
          0,
          target.offsetTop + padTop - navH - progH
        );
        const smooth = !ENV.state.reduced;
        if (smooth) {window.scrollTo({ top: y, behavior: "smooth" });}
        else {window.scrollTo(0, y);}
      }
      vibrate([16]);
    });
  }

  // ==========================
  // Skills UI (filters, tiering, tooltip, collapse)
  // ==========================
  function showSkillTooltip(chip, tooltipText) {
    if (!(chip instanceof HTMLElement)) {return;}

    let tooltip = chip.querySelector(".skill-hover-message");
    if (!(tooltip instanceof HTMLElement)) {
      tooltip = document.createElement("span");
      tooltip.className = "skill-hover-message";
      chip.appendChild(tooltip);
    }

    const skillKey = chip.dataset.skillKey || `skill-${Date.now()}`;
    if (!tooltip.id) {tooltip.id = `skill-tooltip-${skillKey}`;}
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = tooltipText;
    tooltip.classList.add("show-message");

    chip.classList.add("skill-hover-effect");
    chip.setAttribute("aria-describedby", tooltip.id);
  }

  function hideSkillTooltip(chip) {
    if (!(chip instanceof HTMLElement)) {return;}
    const tooltip = chip.querySelector(".skill-hover-message");
    if (tooltip instanceof HTMLElement)
    {tooltip.classList.remove("show-message");}
    chip.classList.remove("skill-hover-effect");
    chip.removeAttribute("aria-describedby");
  }

  function syncSkillsVisibility(section, chips, activeFilter, expanded) {
    chips.forEach((chip) => {
      const group = chip.dataset.skillGroup || "";
      const priority = chip.dataset.skillPriority || "secondary";
      const hiddenByFilter =
        activeFilter !== "all" && activeFilter !== group;
      const hiddenByCollapse = !expanded && priority === "secondary";
      const isHidden = hiddenByFilter || hiddenByCollapse;

      chip.classList.toggle("is-filter-hidden", hiddenByFilter);
      chip.classList.toggle("is-collapsed-hidden", !hiddenByFilter && hiddenByCollapse);
      chip.setAttribute("aria-hidden", String(isHidden));

      if (isHidden) {hideSkillTooltip(chip);}
    });

    section.classList.toggle("is-expanded", expanded);
    section.classList.toggle("is-collapsed", !expanded);
  }

  function applySkillFilter(section, chips, filters, activeFilter, expanded) {
    filters.forEach((button) => {
      const isActive = (button.dataset.filter || "all") === activeFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    syncSkillsVisibility(section, chips, activeFilter, expanded);
  }

  function toggleSkillsExpansion(
    section,
    chips,
    filters,
    toggleButton,
    activeFilter,
    expanded
  ) {
    const nextExpanded = !expanded;
    toggleButton.setAttribute("aria-expanded", String(nextExpanded));

    const expandLabel =
      toggleButton.dataset.labelExpand || "نمایش مهارت‌های بیشتر";
    const collapseLabel =
      toggleButton.dataset.labelCollapse || "نمایش کمتر";
    toggleButton.textContent = nextExpanded ? collapseLabel : expandLabel;

    applySkillFilter(
      section,
      chips,
      filters,
      activeFilter,
      nextExpanded
    );

    return nextExpanded;
  }

  function initSkillsUI() {
    const section = document.getElementById("skills");
    const list = section?.querySelector(".skills-list");
    const filters = section
      ? [...section.querySelectorAll(".skills-filter")]
      : [];
    const toggleButton = section?.querySelector("#skills-expand-toggle");

    if (!section || !list || !filters.length || !(toggleButton instanceof HTMLElement))
    {return;}

    const chips = [...list.querySelectorAll(".skill-chip")];
    if (!chips.length) {return;}

    const pointerFine =
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    section.classList.add("skills-enhanced", "is-collapsed");
    section.classList.remove("is-expanded");

    let activeFilter = "all";
    let expanded = false;

    chips.forEach((chip, index) => {
      chip.dataset.skillOwner = "Mohammad Rasoul Sohrabi";
      chip.classList.add("sohrabi-skill-item");
      if (chip.tabIndex < 0) {chip.tabIndex = 0;}

      const key = chip.dataset.skillKey || `chip-${index + 1}`;
      let hideTimeout = null;

      const tooltipMessage = () =>
        SKILL_TOOLTIPS_FA[key] ||
        "جزئیات تکمیلی در بخش پروژه‌ها و مسیر حرفه‌ای قابل مشاهده است.";

      const revealTooltip = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        if (
          chip.classList.contains("is-filter-hidden") ||
          chip.classList.contains("is-collapsed-hidden")
        ) {return;}
        showSkillTooltip(chip, tooltipMessage());
      };

      const concealTooltip = () => {
        if (hideTimeout) {clearTimeout(hideTimeout);}
        hideTimeout = setTimeout(() => {
          hideSkillTooltip(chip);
        }, 120);
      };

      if (pointerFine && !ENV.state.coarse) {
        on(chip, "pointerenter", revealTooltip);
        on(chip, "pointerleave", concealTooltip);
      }

      on(chip, "focusin", revealTooltip);
      on(chip, "focusout", concealTooltip);
      on(chip, "keydown", (event) => {
        if (event.key === "Escape") {
          hideSkillTooltip(chip);
          chip.blur();
        }
      });
    });

    filters.forEach((button) => {
      on(button, "click", () => {
        activeFilter = button.dataset.filter || "all";
        applySkillFilter(section, chips, filters, activeFilter, expanded);
      });
    });

    on(toggleButton, "click", () => {
      expanded = toggleSkillsExpansion(
        section,
        chips,
        filters,
        toggleButton,
        activeFilter,
        expanded
      );
    });

    toggleButton.textContent =
      toggleButton.dataset.labelExpand || "نمایش مهارت‌های بیشتر";
    applySkillFilter(section, chips, filters, activeFilter, expanded);
  }

  // ==========================
  // FAQ Accordion (ARIA preserved)
  // ==========================
  function initFAQ() {
    const container = document.querySelector(".faq-container");
    if (!container) {return;}

    const items = [...document.querySelectorAll(".faq-item")];

    items.forEach((item, idx) => {
      const summary = item.querySelector("summary");
      const answer = item.querySelector("p");
      const qId = item.dataset.questionId || `faq-q-${idx + 1}`;
      if (!summary) {return;}

      summary.dataset.faqAuthor = "Mohammad Rasoul Sohrabi";

      if (!summary.hasAttribute("aria-expanded"))
      {summary.setAttribute(
        "aria-expanded",
        item.open ? "true" : "false"
      );}

      if (answer) {
        if (!answer.id) {answer.id = `faq-answer-${qId}`;}
        if (!summary.hasAttribute("aria-controls"))
        {summary.setAttribute("aria-controls", answer.id);}
      }

      item.classList.toggle("is-open", !!item.open);

      on(summary, "click", (e) => {
        if (e.target.tagName === "A") {return;}
        e.preventDefault();
        createSparkle(summary);

        items.forEach((other) => {
          if (other !== item && other.open) {toggleFAQ(other, false);}
        });

        toggleFAQ(item, !item.open);
      });
    });

    function toggleFAQ(item, open, scrollIntoView = false) {
      item.open = open;
      const summary = item.querySelector("summary");
      item.classList.toggle("is-open", !!open);

      if (summary)
      {summary.setAttribute("aria-expanded", open ? "true" : "false");}

      if (scrollIntoView && open) {
        setTimeout(() => {
          const navH =
            document.querySelector(".navbar")?.offsetHeight || 0;
          item.scrollIntoView({
            behavior: ENV.state.reduced ? "auto" : "smooth",
            block: "start",
          });
          setTimeout(() => {
            const rect = item.getBoundingClientRect();
            if (rect.top < navH)
            {window.scrollBy({
              top: rect.top - navH,
              behavior: ENV.state.reduced ? "auto" : "smooth",
            });}
          }, 90);
        }, 80);
      }
    }

    // 🔧 deep-link به FAQ با hash (همین‌جا، چون الان DOM آماده است)
    const hash = window.location.hash;
    if (hash) {
      const target = document.querySelector(hash);
      if (target && target.classList.contains("faq-item")) {
        items.forEach(
          (it) => it !== target && it.open && toggleFAQ(it, false)
        );
        toggleFAQ(target, true, true);
      }
    }
  }

  // ==========================
  // Welcome Toast
  // ==========================
  function showWelcomeToast() {
    const hasVisited = storage.getRaw("hasVisited");
    let msg = "";

    if (hasVisited) {msg = STRINGS_FA.toasts.welcomeBack;}
    else {
      const hour = new Date().getHours();
      msg =
        hour >= 5 && hour < 10
          ? STRINGS_FA.toasts.welcomeMorning
          : hour < 16
            ? STRINGS_FA.toasts.welcomeNoon
            : hour < 20
              ? STRINGS_FA.toasts.welcomeEvening
              : STRINGS_FA.toasts.welcomeNight;
      storage.setRaw("hasVisited", "true");
    }

    if (msg)
    {createToast(msg, {
      id: "welcome-toast",
      customClass: "welcome-toast",
      iconClass: "fas fa-hand-sparkles",
      iconColor: "var(--highlight-color)",
      duration: ENV.state.coarse ? 2500 : 3500,
    });}
  }

  // ==========================
  // Clipboard generic
  // ==========================
  async function copyToClipboard(text, okId, errId, okMsg) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("clipboard-unsupported");
      }
      await navigator.clipboard.writeText(text);
      createToast(okMsg, {
        id: okId,
        iconClass: "fas fa-check-circle",
        iconColor: "var(--highlight-color)",
        duration: 1600,
      });
      vibrate([40]);
    } catch (err) {
      console.error("Clipboard error:", err);
      createToast(STRINGS_FA.toasts.clipboardUnsupported, {
        id: errId,
        iconClass: "fas fa-exclamation-triangle",
        iconColor: "red",
        duration: 2800,
      });
    }
  }

  window.copyToClipboard = copyToClipboard;
  window.createToast = createToast;

  // ==========================
  // Lazy Images (IO + decoding=async)
  // ==========================
  function initLazyImages() {
    const lazyImages = document.querySelectorAll("img[data-src]");
    if (!lazyImages.length) {return;}

    const loadImg = (img) => {
      img.decoding = "async";
      img.loading = "lazy";
      img.classList.add("lazy-image");
      img.classList.add("is-loading");
      img.dataset.imageLoader =
        "Mohammad Rasoul Sohrabi's optimized script";

      img.src = img.dataset.src;
      if (img.dataset.srcset) {img.srcset = img.dataset.srcset;}

      img.onload = () => {
        img.classList.remove("is-loading");
        img.classList.add("loaded");
        img.removeAttribute("data-src");
        img.removeAttribute("data-srcset");
      };

      img.onerror = () => {
        console.error("Failed to load image:", img.src);
        img.classList.remove("is-loading");
        img.classList.add("load-error");
        img.src =
          "https://placehold.co/400x300/cccccc/000000?text=Error";
      };
    };

    if (!("IntersectionObserver" in window)) {
      lazyImages.forEach((img) => loadImg(img));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {return;}
          const img = entry.target;
          loadImg(img);
          obs.unobserve(img);
        });
      },
      { rootMargin: "0px 0px 180px 0px", threshold: 0.01 }
    );

    lazyImages.forEach((img) => observer.observe(img));
    on(
      window,
      "beforeunload",
      () => observer.disconnect(),
      { once: true }
    );
  }

  // ==========================
  // Share Button
  // ==========================
  function initShareButton() {
    let shareBtn = document.getElementById("share-page-button");
    if (!shareBtn) {
      shareBtn = document.createElement("button");
      shareBtn.id = "share-page-button";
      shareBtn.type = "button";
      shareBtn.innerHTML =
        '<i class="fas fa-share-alt" aria-hidden="true"></i>';
      shareBtn.setAttribute("aria-label", STRINGS_FA.aria.share);
      shareBtn.classList.add(
        "sohrabi-share-feature",
        "hidden",
        "cta-pulse-effect"
      );
      document.body.appendChild(shareBtn);
    }

    const onScroll = throttle(() => {
      const isVisible = window.scrollY > 500;
      shareBtn.classList.toggle("visible", isVisible);
      shareBtn.classList.toggle("hidden", !isVisible);
    }, 120);

    on(window, "scroll", onScroll, { passive: true });
    onScroll();

    on(shareBtn, "click", async () => {
      const pageUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: pageUrl });
          createToast(STRINGS_FA.toasts.shareOk, {
            id: "share-success-toast",
            iconClass: "fas fa-check-circle",
            iconColor: "var(--highlight-color)",
            duration: 1800,
          });
          vibrate([40]);
        } catch (error) {
          if (error?.name !== "AbortError") {
            console.error("Share error:", error);
            createToast(STRINGS_FA.toasts.shareErr, {
              id: "share-error-toast",
              iconClass: "fas fa-exclamation-triangle",
              iconColor: "red",
              duration: 2800,
            });
          }
        }
      } else {
        await copyToClipboard(
          pageUrl,
          "share-copy-toast",
          "share-error-toast",
          STRINGS_FA.toasts.linkCopied("صفحه")
        );
      }
    });
  }

  // ==========================
  // Timeline Micro-interactions
  // ==========================
  function initTimelineMicroInteractions() {
    const section = document.getElementById("timeline");
    const list = section?.querySelector(".timeline");
    if (!section || !list) {return;}

    const items = Array.from(list.children).filter(
      (node) => node instanceof HTMLElement && node.tagName === "LI"
    );
    if (!items.length) {return;}

    items.forEach((item) => item.classList.add("timeline-item"));
    section.classList.add("timeline-enhanced");

    const markVisible = (item) => {
      item.classList.add("is-visible", "timeline-item-visible");
    };

    const reduced = ENV.state.reduced;
    const coarse = ENV.state.coarse;
    const supportsObserver = "IntersectionObserver" in window;

    if (!supportsObserver || reduced) {
      items.forEach(markVisible);
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {return;}
            markVisible(entry.target);
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: coarse ? 0.1 : 0.24,
          rootMargin: "0px 0px -8% 0px",
        }
      );

      items.forEach((item, index) => {
        if (coarse) {
          observer.observe(item);
          return;
        }

        setTimeout(() => {
          if (!abortSignal.aborted) {
            observer.observe(item);
          }
        }, Math.min(320, index * 38));
      });

      on(window, "beforeunload", () => observer.disconnect(), { once: true });
    }

    let targetTimer = null;
    const clearTargets = () =>
      items.forEach((item) => item.classList.remove("is-targeted"));

    const focusHashTarget = () => {
      const hash = window.location.hash || "";
      if (!hash) {return;}

      let target = null;
      try {
        target = section.querySelector(hash);
      } catch {
        return;
      }

      if (!(target instanceof HTMLElement)) {return;}
      if (!target.classList.contains("timeline-item")) {return;}

      clearTargets();
      markVisible(target);
      target.classList.add("is-targeted");

      if (targetTimer) {
        clearTimeout(targetTimer);
      }
      targetTimer = setTimeout(() => {
        target.classList.remove("is-targeted");
      }, 2200);

      const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
      const progressHeight =
        document.getElementById("scroll-progress-bar")?.offsetHeight || 0;
      const offset = navbarHeight + progressHeight + 20;
      const rect = target.getBoundingClientRect();
      const top = window.scrollY + rect.top - offset;

      if (Math.abs(rect.top - offset) > 24) {
        window.scrollTo({
          top: Math.max(0, top),
          behavior: reduced ? "auto" : "smooth",
        });
      }
    };

    setTimeout(focusHashTarget, 120);
    on(window, "hashchange", focusHashTarget);

    if (reduced || coarse) {return;}

    let ticking = false;
    const updateParallax = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const viewH = Math.max(window.innerHeight, 1);
      const centerDelta = rect.top + rect.height / 2 - viewH / 2;
      const ratio = Math.max(-1, Math.min(1, centerDelta / viewH));

      section.style.setProperty(
        "--timeline-line-shift",
        `${(-ratio * 8).toFixed(2)}px`
      );
      section.style.setProperty(
        "--timeline-icon-shift",
        `${(-ratio * 3).toFixed(2)}px`
      );
    };

    const requestParallaxUpdate = () => {
      if (ticking) {return;}
      ticking = true;
      requestAnimationFrame(updateParallax);
    };

    on(window, "scroll", requestParallaxUpdate, { passive: true });
    on(window, "resize", requestParallaxUpdate, { passive: true });
    on(
      window,
      "beforeunload",
      () => {
        section.style.removeProperty("--timeline-line-shift");
        section.style.removeProperty("--timeline-icon-shift");
        if (targetTimer) {
          clearTimeout(targetTimer);
          targetTimer = null;
        }
      },
      { once: true }
    );

    requestParallaxUpdate();
  }

  // ==========================
  // Section Milestones & Confetti
  // ==========================
  function initExplorationMilestones() {
    const sections = document.querySelectorAll("section[id]");
    const total = sections.length;
    if (!total) {return;}
    if (!("IntersectionObserver" in window)) {return;}

    const visited = new Set(storage.get("sectionsVisited", []));
    const announced = new Set(storage.get("announcedMilestones", []));

    const milestones = [
      {
        count: Math.max(1, Math.ceil(total * 0.25)),
        message: "شما ۲۵٪ از سایت را کاوش کرده‌اید! عالیه! ✨ ادامه دهید!",
        icon: "fas fa-map-marker-alt",
      },
      {
        count: Math.max(
          Math.ceil(total * 0.25) + 1,
          Math.ceil(total * 0.5)
        ),
        message:
          "نصف راه را پیمودید! شما ۵۰٪ از سایت را کاوش کرده‌اید! فوق‌العاده! 🚀",
        icon: "fas fa-rocket",
      },
      {
        count: Math.max(
          Math.ceil(total * 0.5) + 1,
          Math.ceil(total * 0.75)
        ),
        message: "به ۷۵٪ رسیدید! کم‌کم داریم به پایان می‌رسیم! 🌟",
        icon: "fas fa-star",
      },
      {
        count: total,
        message: `تبریک! شما تمام ${total} بخش سایت را کاوش کرده‌اید! شما یک کاوشگر واقعی هستید! 🎉`,
        icon: "fas fa-trophy",
        isFinal: true,
      },
    ]
      .filter(
        (m, i, arr) =>
          m.count > 0 && arr.findIndex((x) => x.count === m.count) === i
      )
      .sort((a, b) => a.count - b.count);

    let lastToastAt = 0;
    const cooldown = ENV.state.coarse ? 12000 : 8000;

    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();

        entries.forEach((entry) => {
          if (!entry.isIntersecting) {return;}

          visited.add(entry.target.id);
          storage.set("sectionsVisited", [...visited]);
          observer.unobserve(entry.target);

          const count = visited.size;
          for (const m of milestones) {
            if (
              count >= m.count &&
              !announced.has(m.count) &&
              now - lastToastAt > cooldown
            ) {
              createToast(m.message, {
                id: `exploration-milestone-${m.count}`,
                customClass: m.isFinal
                  ? "exploration-toast final-exploration-toast"
                  : "exploration-toast",
                iconClass: m.icon,
                iconColor: m.isFinal
                  ? "var(--primary-color)"
                  : "var(--accent-color)",
                duration: 4200,
              });

              const bio = document.getElementById("sohrabi-bio");
              bio?.dispatchEvent(new Event("mouseenter"));

              announced.add(m.count);
              storage.set("announcedMilestones", [...announced]);
              lastToastAt = now;

              if (m.isFinal && FLAGS().ENABLE_CONFETTI)
              {setTimeout(createConfetti, 500);}
              break;
            }
          }
        });
      },
      { threshold: 0.3, rootMargin: "0px 0px -10% 0px" }
    );

    sections.forEach((sec) => observer.observe(sec));
    on(
      window,
      "beforeunload",
      () => observer.disconnect(),
      { once: true }
    );
  }

  function createConfetti() {
    if (ENV.state.reduced || ENV.state.coarse) {return;}

    const canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    canvas.classList.add("confetti-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.dataset.celebrationEvent =
      "page_completion_by_Mohammad_Rasoul_Sohrabi_user";

    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    const colors = [
      "#ffc107",
      "#007acc",
      "#005a9e",
      "#f0f0f0",
      "#e0a800",
      "#FF4081",
      "#64FFDA",
    ];

    const pieces = Array.from({ length: 48 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[(Math.random() * colors.length) | 0],
      angle: Math.random() * 360,
      speed: Math.random() * 2 + 1,
      drift: Math.random() * 2 - 1,
    }));

    const start = performance.now();
    let rafId = null;

    const cleanup = () => {
      if (rafId) {cancelAnimationFrame(rafId);}
      if (canvas && canvas.parentNode) {
        canvas.remove();
      }
    };

    const loop = () => {
      const elapsed = performance.now() - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of pieces) {
        p.y += p.speed;
        p.x += p.drift;
        p.angle += 2;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (elapsed < 3400) {
        rafId = requestAnimationFrame(loop);
      } else {
        cleanup();
      }
    };

    rafId = requestAnimationFrame(loop);

    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) {
        cleanup();
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ==========================
  // Fun Fact idle toast
  // ==========================
  function initFunFacts() {
    if (ENV.state.coarse || ENV.state.saveData) {return;}

    let toastRef = null;
    let idleTimeout;

    const show = () => {
      const fact = FUN_FACTS_FA[(Math.random() * FUN_FACTS_FA.length) | 0];
      toastRef = createToast(`${STRINGS_FA.funFactsPrefix} ${fact}`, {
        id: "fun-fact-toast",
        customClass: "fun-fact-toast",
        iconClass: "fas fa-lightbulb",
        iconColor: "var(--primary-color)",
        position: "top",
        duration: 5200,
        closeButton: true,
      });
    };

    const reset = debounce(() => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        if (!toastRef || !toastRef.classList.contains("show")) {
          show();
        }
      }, 24000);
    }, 600);

    const evs = ["mousemove", "keydown", "scroll", "touchstart"];
    evs.forEach((ev) => {
      const opts =
        ev === "scroll" || ev === "touchstart" ? { passive: true } : {};
      on(window, ev, reset, opts);
    });

    reset();

    on(document, "visibilitychange", () => {
      if (document.hidden) {
        clearTimeout(idleTimeout);
      } else {
        reset();
      }
    });
  }

  // ==========================
  // Sparkle Effect
  // ==========================
  function createSparkle(element) {
    if (
      !element ||
      ENV.state.reduced ||
      ENV.state.saveData ||
      ENV.state.lowPowerCPU
    )
    {return;}

    const sparkle = document.createElement("div");
    sparkle.className = "sparkle-effect";
    sparkle.dataset.sparkleSource =
      "Mohammad Rasoul Sohrabi's interactive elements";

    const size = Math.random() * 10 + 5;

    sparkle.style.setProperty("--sparkle-size", `${size}px`);
    sparkle.style.setProperty(
      "--sparkle-x",
      `${(Math.random() * 100).toFixed(2)}%`
    );
    sparkle.style.setProperty(
      "--sparkle-y",
      `${(Math.random() * 100).toFixed(2)}%`
    );

    sparkle.dataset.sparkleColor = ["primary", "accent", "highlight"][
      (Math.random() * 3) | 0
    ];

    element.classList.add("sparkle-host");

    element.appendChild(sparkle);

    const animation = sparkle.animate?.(
      [
        {
          opacity: 0,
          transform: `scale(0) rotate(${(
            Math.random() * 360
          ).toFixed(1)}deg)`,
        },
        {
          opacity: 1,
          transform: `scale(1) rotate(${(
            360 + Math.random() * 360
          ).toFixed(1)}deg)`,
        },
        {
          opacity: 0,
          transform: `scale(0.5) rotate(${(
            720 + Math.random() * 360
          ).toFixed(1)}deg)`,
        },
      ],
      { duration: 650, easing: "ease-out", fill: "forwards" }
    );

    if (animation) {
      on(animation, "finish", () => sparkle.remove(), { once: true });
    } else {
      setTimeout(() => sparkle.remove(), 700);
    }
  }

  // ==========================
  // CTA Buttons cosmetics
  // ==========================
  function initCTAs() {
    document.querySelectorAll(".main-cta-button").forEach((btn) => {
      btn.classList.add("cta-pulse-effect", "sohrabi-cta-action");
      btn.dataset.ctaOwner = "Mohammad Rasoul Sohrabi";
    });
  }

  // ==========================
  // End-of-page toast (once per session)
  // ==========================
  function initEndOfPageToast() {
    let announced = false;

    const handler = throttle(() => {
      if (announced) {return;}
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 50;
      if (nearBottom) {
        createToast(STRINGS_FA.toasts.reachedEnd, {
          id: "end-of-page-toast",
          customClass: "end-of-page-toast",
          iconClass: "fas fa-flag-checkered",
          iconColor: "var(--highlight-color)",
          duration: 3600,
        });
        announced = true;
      }
    }, 140);

    on(window, "scroll", handler, { passive: true });
  }

  // ==========================
  // Mobile Menu
  // ==========================
  function initMobileMenu() {
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");
    const links = document.querySelectorAll(".nav-links a");

    if (!hamburger || !navLinks) {return;}

    on(hamburger, "click", () => {
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("active");
      const expanded =
        hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });

    links.forEach((link) => {
      on(link, "click", () => {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
      });
    });

    // Close menu when clicking outside
    on(document, "click", (e) => {
      if (
        !hamburger.contains(e.target) &&
        !navLinks.contains(e.target) &&
        navLinks.classList.contains("active")
      ) {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ==========================
  // Boot & Live Updates
  // ==========================
  let booted = false;

  function boot() {
    if (booted) {return;}
    booted = true;

    const initSteps = [
      ["mobile-menu", initMobileMenu],
      ["aos", initAOS],
      ["critical-styles", initCriticalStyleFallbacks],
      ["dynamic-dates", setDynamicDates],
      ["identity-hooks", setIdentityHooks],
      ["identity-pings", queueIdentityPings],
      ["theme", initTheme],
      ["anchor-scrolling", initAnchorScrolling],
      ["click-effects", initClickEffects],
      ["scroll-ui", initScrollUI],
      ["timeline-micro-interactions", initTimelineMicroInteractions],
      ["skills-ui", initSkillsUI],
      ["faq", initFAQ],
      ["lazy-images", initLazyImages],
      ["share-button", initShareButton],
      ["exploration-milestones", initExplorationMilestones],
      ["fun-facts", initFunFacts],
      ["ctas", initCTAs],
      ["end-of-page-toast", initEndOfPageToast],
      ["welcome-toast", showWelcomeToast],
    ];

    initSteps.forEach(([scope, fn]) => {
      safeRun(scope, fn);
    });
  }

  function installGlobalErrorHandlers() {
    on(window, "error", (event) => {
      reportRuntimeError("window.error", event.error || event.message);
    });

    on(window, "unhandledrejection", (event) => {
      reportRuntimeError("unhandledrejection", event.reason);
    });
  }

  hydrateRuntimeErrorState();
  installGlobalErrorHandlers();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => safeRun("boot", boot), {
      once: true,
    });
  } else {
    safeRun("boot", boot);
  }

  // Re-evaluate dynamic flags on env change (e.g., user toggles reduced motion or system theme)
  ENV.onChange(() => {
    // Refresh only the pieces that depend on flags
    safeRun("env-change.aos", initAOS);
  });

  // Teardown on page hide/unload
  on(window, "pagehide", () => teardown.abort(), { once: true });
})();
