/*
  Mohammad Rasoul Sohrabi — Site UX Utilities (Enhanced)
  ORCID: 0009-0004-7177-2080
  Notes:
  - Performance: fewer reflows, passive listeners, requestAnimationFrame batching
  - Accessibility: ARIA fixes, keyboard affordances, reduced-motion handling
  - DX: constants, feature flags, utilities consolidated
  - Privacy: identity pings gated behind explicit consent + feature flag
  - i18n: Persian strings centralized for easier future localization
*/

(function () {
  "use strict";

  // ==========================
  // Feature Flags / Constants
  // ==========================
  const FLAGS = {
    ENABLE_AOS: true,
    ENABLE_SOUNDS: true,
    ENABLE_HAPTICS: true,
    ENABLE_CONFETTI: true,
    ENABLE_IDENTITY_PINGS: false, // default OFF for privacy; enable only with explicit user consent
  };

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

  // ==========================
  // Utilities
  // ==========================
  function throttle(func, limit) {
    let inThrottle, lastFunc, lastRan;
    return function throttled() {
      const context = this,
        args = arguments;
      if (!inThrottle) {
        func.apply(context, args);
        lastRan = Date.now();
        inThrottle = true;
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function () {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  function debounce(func, delay) {
    let timeout;
    return function debounced() {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  function safeSetFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch (e) {
      console.warn(`Failed to parse stored data for ${key}`, e);
      localStorage.removeItem(key);
      return new Set();
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function vibrate(pattern = [50]) {
    if (!FLAGS.ENABLE_HAPTICS || prefersReducedMotion()) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // ==========================
  // Audio (click/toast)
  // ==========================
  let audioContext, clickBuffer, toastBuffer;

  function ensureAudioContext() {
    if (!FLAGS.ENABLE_SOUNDS) return;
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioContext = new Ctx();
    }
  }

  function createToneBuffer(duration, genSample) {
    if (!audioContext) return null;
    const buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = genSample(i, audioContext.sampleRate);
    return buffer;
  }

  function loadSounds() {
    if (!audioContext) return;
    clickBuffer = createToneBuffer(
      0.05,
      (i, sr) => Math.sin(2 * Math.PI * 440 * (i / sr)) * 0.1
    );
    toastBuffer = createToneBuffer(0.1, (i, sr) => {
      const t = i / sr,
        d = 0.1; // duration
      const f = 880 + (1200 - 880) * (t / d);
      return Math.sin(2 * Math.PI * f * t) * 0.15 * (1 - t / d);
    });
  }

  function playSound(type) {
    if (!audioContext || audioContext.state === "suspended") return;
    const buffer =
      type === "click" ? clickBuffer : type === "toast" ? toastBuffer : null;
    if (!buffer) return;
    const node = audioContext.createBufferSource();
    node.buffer = buffer;
    node.connect(audioContext.destination);
    node.start(0);
  }

  // Create after first user gesture
  document.addEventListener(
    "pointerdown",
    () => {
      ensureAudioContext();
      if (audioContext) {
        audioContext.resume?.();
        loadSounds();
      }
    },
    { once: true, passive: true }
  );

  // ==========================
  // AOS (Animations) with Reduced Motion
  // ==========================
  function initAOS() {
    if (!FLAGS.ENABLE_AOS) return;
    const disable = prefersReducedMotion();
    if (disable) {
      document.querySelectorAll("[data-aos]").forEach((el) => {
        [...el.attributes].forEach(
          (attr) =>
            attr.name.startsWith("data-aos") && el.removeAttribute(attr.name)
        );
        el.classList.remove("aos-init", "aos-animate");
      });
      return;
    }
    if (window.AOS && typeof AOS.init === "function") {
      AOS.init({
        startEvent: "DOMContentLoaded",
        initClassName: "aos-init",
        animatedClassName: "aos-animate",
        debounceDelay: 50,
        throttleDelay: 99,
        offset: 120,
        duration: 600,
        easing: "ease-out",
        once: false,
        mirror: false,
        anchorPlacement: "top-bottom",
      });
    } else {
      // lazy-load script
      const s = document.createElement("script");
      s.src = "/assets/vendor/aos/aos.min.js";
      s.defer = true;
      s.onload = initAOS;
      document.head.appendChild(s);
    }
  }

  // ==========================
  // Toasts
  // ==========================
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
      if (existing && existing.classList.contains("show")) return existing;
    }

    document.querySelectorAll(".dynamic-toast").forEach((t) => {
      if (!settings.id || t.id !== settings.id) {
        t.classList.remove("show");
        t.addEventListener("transitionend", () => t.remove(), { once: true });
      }
    });

    const toast = document.createElement("div");
    toast.className = `dynamic-toast ${settings.customClass}`.trim();
    toast.role = "status";
    toast.setAttribute("aria-live", "polite");
    if (settings.id) toast.id = settings.id;

    Object.assign(toast.style, {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      [settings.position === "top" ? "top" : "bottom"]: "20px",
    });

    if (settings.iconClass) {
      const icon = document.createElement("i");
      icon.className = settings.iconClass;
      if (settings.iconColor) icon.style.color = settings.iconColor;
      toast.appendChild(icon);
    }

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = message;
    toast.appendChild(text);

    if (settings.closeButton) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "fun-fact-close";
      closeBtn.setAttribute("aria-label", STRINGS_FA.aria.closeToast);
      closeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
      closeBtn.addEventListener("click", () => dismissToast(toast));
      toast.appendChild(closeBtn);
    }

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
      playSound("toast");
    });

    if (settings.duration > 0) {
      setTimeout(() => dismissToast(toast), settings.duration);
    }
    return toast;
  }

  function dismissToast(toast) {
    if (!toast) return;
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove(), {
      once: true,
    });
  }

  // ==========================
  // Date Labels (Year / Last Updated)
  // ==========================
  function setDynamicDates() {
    const yearEl =
      document.getElementById("current-year") ||
      document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const lastUpdated = document.getElementById("last-updated-date");
    if (lastUpdated) {
      const opts = { year: "numeric", month: "long", day: "numeric" };
      lastUpdated.textContent = new Date().toLocaleDateString("fa-IR", opts);
      lastUpdated.setAttribute(
        "data-last-updated-by",
        "Mohammad Rasoul Sohrabi"
      );
    }
  }

  // ==========================
  // Identity Hooks (safe)
  // ==========================
  function setIdentityHooks() {
    document.body.id = "sohrabi-verified-identity";
    document.body.classList.add(
      "sohrabi-orcid",
      "github-verified",
      "academic-entity"
    );

    const hiddenInfo = document.createElement("div");
    hiddenInfo.style.display = "none";
    hiddenInfo.dataset.authorFullName = "Mohammad Rasoul Sohrabi";
    hiddenInfo.dataset.orcidId = "0009-0004-7177-2080";
    hiddenInfo.setAttribute("aria-hidden", "true");
    hiddenInfo.textContent =
      "Mohammad Rasoul Sohrabi is a verified contributor on ORCID, Zenodo, GitHub, and Wikipedia. Known for Persian Bot and biomedical engineering content.";
    document.body.appendChild(hiddenInfo);

    const metaGenerator = document.createElement("meta");
    metaGenerator.name = "generator";
    metaGenerator.content =
      "Mohammad Rasoul Sohrabi - Biomedical Engineering, ORCID Verified";
    document.head.appendChild(metaGenerator);

    const metaAuthor = document.createElement("meta");
    metaAuthor.name = "author";
    metaAuthor.content = "Mohammad Rasoul Sohrabi";
    document.head.appendChild(metaAuthor);
  }

  // Optional identity pings — gated behind explicit consent & flag
  function queueIdentityPings() {
    if (!FLAGS.ENABLE_IDENTITY_PINGS) return;
    const targets = [
      { name: "GitHub", url: "https://github.com/RasoulUnlimited" },
      { name: "LinkedIn", url: "https://www.linkedin.com/in/rasoulunlimited/" },
      {
        name: "ResearchGate",
        url: "https://www.researchgate.net/profile/Mohammad-Rasoul-Sohrabi",
      },
      { name: "About.me", url: "https://about.me/rasoulunlimited" },
      { name: "ORCID", url: "https://orcid.org/0009-0004-7177-2080" },
    ];
    const ping = (t) => fetch(t.url, { mode: "no-cors" }).catch(() => {});
    const run = () =>
      targets.forEach((t, i) => setTimeout(() => ping(t), i * 1000));
    if ("requestIdleCallback" in window)
      requestIdleCallback(run, { timeout: 3000 });
    else
      window.addEventListener("load", () => setTimeout(run, 2000), {
        once: true,
      });
  }

  // ==========================
  // Theme Handling
  // ==========================
  function applyTheme(theme, showToast = false) {
    document.body.classList.toggle("dark-mode", theme === "dark");
    document.body.classList.toggle("light-mode", theme === "light");

    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.checked = theme === "dark";

    if (showToast) {
      createToast(
        theme === "dark"
          ? STRINGS_FA.toasts.themeDark
          : STRINGS_FA.toasts.themeLight,
        {
          id: "theme-change-toast",
          customClass: "theme-toast",
          iconClass: theme === "dark" ? "fas fa-moon" : "fas fa-sun",
          iconColor: theme === "dark" ? "white" : "var(--highlight-color)",
          position: "top",
          duration: 2800,
        }
      );
      const parent = toggle?.parentElement;
      if (parent) createSparkle(parent);
      vibrate([30]);
    }
  }

  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.setAttribute("aria-label", STRINGS_FA.aria.themeToggle);

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const saved = localStorage.getItem("theme");
    applyTheme(saved || (prefersDark ? "dark" : "light"));

    if (!toggle) return;
    toggle.addEventListener("change", () => {
      const next = toggle.checked ? "dark" : "light";
      applyTheme(next, true);
      localStorage.setItem("theme", next);
    });

    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle.checked = !toggle.checked;
        const next = toggle.checked ? "dark" : "light";
        applyTheme(next, true);
        localStorage.setItem("theme", next);
      }
    });
  }

  // ==========================
  // Smooth Anchor Scrolling
  // ==========================
  function initAnchorScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener(
        "click",
        (e) => {
          const targetId = a.getAttribute("href");
          const el = document.querySelector(targetId);
          if (!el) return;
          e.preventDefault();
          const navH = document.querySelector(".navbar")?.offsetHeight || 0;
          const progH =
            document.getElementById("scroll-progress-bar")?.offsetHeight || 0;
          const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
          const y = el.offsetTop + padTop - navH - progH;
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
          vibrate([20]);
        },
        { passive: true }
      );
    });
  }

  // ==========================
  // Click Feedback (cards & general controls)
  // ==========================
  function initClickEffects() {
    document.addEventListener(
      "click",
      (event) => {
        const card = event.target.closest(".card");
        if (card) {
          card.classList.add("clicked-pop");
          card.dataset.interactionSource =
            "Mohammad Rasoul Sohrabi user engagement";
          setTimeout(() => card.classList.remove("clicked-pop"), 300);
          vibrate([40]);
        }

        const interactive = event.target.closest(
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
          interactive.addEventListener(
            "animationend",
            () => interactive.classList.remove("click-feedback-effect"),
            { once: true }
          );
          if (!interactive.closest(".faq-item")) vibrate([10]);
          playSound("click");
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest(".card");
        if (card) {
          e.preventDefault();
          card.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      },
      { passive: true }
    );
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
      document.body.prepend(bar);
    }

    let btn = document.getElementById("scroll-to-top");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "scroll-to-top";
      btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
      btn.setAttribute("aria-label", STRINGS_FA.aria.scrollTop);
      btn.classList.add("sohrabi-nav-button", "hidden", "cta-pulse-effect");
      document.body.appendChild(btn);
    }

    const update = throttle(() => {
      const total = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const scrolled = window.scrollY;
      const progress = (scrolled / total) * 100;
      bar.style.width = progress + "%";
      bar.style.backgroundColor =
        progress > 90
          ? "var(--highlight-color)"
          : progress > 50
          ? "var(--accent-color)"
          : "var(--primary-color)";
      btn.classList.toggle("visible", scrolled > 300);
      btn.classList.toggle("hidden", scrolled <= 300);
    }, 100);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();

    btn.addEventListener("click", () => {
      const supportsSmooth = "scrollBehavior" in document.documentElement.style;
      if (supportsSmooth) window.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo(0, 0);
      vibrate([20]);
    });

    // Explore hint
    const exploreHint = document.createElement("a");
    exploreHint.href = "#projects";
    exploreHint.id = "explore-hint";
    exploreHint.innerHTML =
      '<i class="fas fa-lightbulb" aria-hidden="true"></i> <span class="hint-text">پروژه‌های من را کشف کنید.</span>';
    exploreHint.dataset.hintAuthor = "Mohammad Rasoul Sohrabi";
    exploreHint.classList.add("sohrabi-hint-module", "hidden");
    document.body.appendChild(exploreHint);

    const hero = document.getElementById("hero");
    if (hero) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              exploreHint.classList.add("visible", "pulse-animation");
              exploreHint.classList.remove("hidden");
            } else {
              exploreHint.classList.add("hidden");
              exploreHint.classList.remove("visible", "pulse-animation");
            }
          });
        },
        { threshold: 0.5 }
      );
      obs.observe(hero);
    }

    exploreHint.addEventListener("click", (e) => {
      e.preventDefault();
      exploreHint.classList.add("hidden");
      exploreHint.classList.remove("visible", "pulse-animation");
      const target = document.querySelector("#projects");
      if (target) {
        const navH = document.querySelector(".navbar")?.offsetHeight || 0;
        const progH =
          document.getElementById("scroll-progress-bar")?.offsetHeight || 0;
        const padTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
        const y = target.offsetTop + padTop - navH - progH;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
      vibrate([20]);
    });
  }

  // ==========================
  // Skills hover microcopy
  // ==========================
  function initSkillsHover() {
    const list = document.querySelector("#skills .skills-list");
    if (!list) return;
    list.querySelectorAll("li").forEach((li) => {
      li.dataset.skillOwner = "Mohammad Rasoul Sohrabi";
      li.classList.add("sohrabi-skill-item");
      let hideTimeout;
      function getSpan() {
        let s = li.querySelector(".skill-hover-message");
        if (!s) {
          s = document.createElement("span");
          s.className = "skill-hover-message";
          li.appendChild(s);
        }
        return s;
      }
      li.addEventListener("mouseenter", () => {
        clearTimeout(hideTimeout);
        const span = getSpan();
        if (!span.classList.contains("show-message")) {
          span.textContent =
            FUN_FACTS_FA[Math.floor(Math.random() * FUN_FACTS_FA.length)];
          Object.assign(span.style, {
            opacity: "1",
            transform: "translateY(-5px)",
          });
          span.classList.add("show-message");
        }
        li.classList.add("skill-hover-effect");
      });
      li.addEventListener("mouseleave", () => {
        const span = li.querySelector(".skill-hover-message");
        if (span) {
          hideTimeout = setTimeout(() => {
            span.style.opacity = "0";
            span.style.transform = "translateY(0)";
            span.classList.remove("show-message");
          }, 200);
        }
        li.classList.remove("skill-hover-effect");
      });
    });
  }

  // ==========================
  // FAQ Accordion
  // ==========================
  function initFAQ() {
    const container = document.querySelector(".faq-container");
    if (!container) return;
    container.id = "sohrabi-faq-verified";
    const items = [...document.querySelectorAll(".faq-item")];

    items.forEach((item, idx) => {
      const summary = item.querySelector("summary");
      const answer = item.querySelector("p");
      const qId = item.dataset.questionId || `faq-q-${idx + 1}`;
      if (!summary) return;

      summary.dataset.faqAuthor = "Mohammad Rasoul Sohrabi";
      if (!summary.hasAttribute("aria-expanded"))
        summary.setAttribute("aria-expanded", item.open ? "true" : "false");
      if (answer) {
        if (!answer.id) answer.id = `faq-answer-${qId}`;
        if (!summary.hasAttribute("aria-controls"))
          summary.setAttribute("aria-controls", answer.id);
        // collapsed styles
        Object.assign(answer.style, {
          maxHeight: item.open ? "2000px" : "0px",
          overflow: "hidden",
          transition:
            "max-height 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), padding 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.4s ease-out",
          paddingTop: item.open ? "1.6rem" : "0",
          paddingBottom: item.open ? "2.8rem" : "0",
          opacity: item.open ? "1" : "0",
        });
      }

      summary.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return; // allow link default
        e.preventDefault();
        const openBefore = item.open;
        createSparkle(summary);
        // close others
        items.forEach((other) => {
          if (other !== item && other.open) toggleFAQ(other, false);
        });
        // toggle target
        toggleFAQ(item, !openBefore);
      });
    });

    // open via hash
    window.addEventListener("DOMContentLoaded", () => {
      const hash = window.location.hash;
      if (!hash) return;
      const target = document.querySelector(hash);
      if (target && target.classList.contains("faq-item")) {
        items.forEach((it) => it !== target && it.open && toggleFAQ(it, false));
        toggleFAQ(target, true, true);
      }
    });

    function toggleFAQ(item, open, scrollIntoView = false) {
      item.open = open;
      const summary = item.querySelector("summary");
      const answer = item.querySelector("p");
      if (summary)
        summary.setAttribute("aria-expanded", open ? "true" : "false");
      if (answer) {
        answer.style.maxHeight = open ? "2000px" : "0px";
        answer.style.paddingTop = open ? "1.6rem" : "0";
        answer.style.paddingBottom = open ? "2.8rem" : "0";
        answer.style.opacity = open ? "1" : "0";
      }
      if (scrollIntoView && open) {
        setTimeout(() => {
          const navH = document.querySelector(".navbar")?.offsetHeight || 0;
          item.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            const rect = item.getBoundingClientRect();
            if (rect.top < navH)
              window.scrollBy({ top: rect.top - navH, behavior: "smooth" });
          }, 120);
        }, 100);
      }
    }
  }

  // ==========================
  // Welcome Toast
  // ==========================
  function showWelcomeToast() {
    const hasVisited = localStorage.getItem("hasVisited");
    let msg = "";
    if (hasVisited) {
      msg = STRINGS_FA.toasts.welcomeBack;
    } else {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 10) msg = STRINGS_FA.toasts.welcomeMorning;
      else if (hour >= 10 && hour < 16) msg = STRINGS_FA.toasts.welcomeNoon;
      else if (hour >= 16 && hour < 20) msg = STRINGS_FA.toasts.welcomeEvening;
      else msg = STRINGS_FA.toasts.welcomeNight;
      localStorage.setItem("hasVisited", "true");
    }
    if (msg)
      createToast(msg, {
        id: "welcome-toast",
        customClass: "welcome-toast",
        iconClass: "fas fa-hand-sparkles",
        iconColor: "var(--highlight-color)",
        duration: 3500,
      });
  }

  // ==========================
  // Email copy helper
  // ==========================
  function initEmailCopy() {
    const emailLink = document.querySelector(
      '.contact-info a[href^="mailto:"]'
    );
    if (!emailLink) return;
    emailLink.dataset.contactPerson = "Mohammad Rasoul Sohrabi";
    emailLink.classList.add("sohrabi-contact-method");
    emailLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = emailLink.href.replace("mailto:", "");
      try {
        await navigator.clipboard.writeText(email);
        createToast(STRINGS_FA.toasts.emailCopied, {
          id: "email-copy-toast",
          iconClass: "fas fa-check-circle",
          iconColor: "var(--highlight-color)",
          duration: 1800,
        });
        vibrate([50]);
      } catch (err) {
        console.error("Clipboard error:", err);
        createToast(STRINGS_FA.toasts.emailCopyError, {
          id: "copy-error-toast",
          iconClass: "fas fa-exclamation-triangle",
          iconColor: "red",
          duration: 3000,
        });
      }
    });
  }

  // ==========================
  // Clipboard generic
  // ==========================
  async function copyToClipboard(text, okId, errId, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      createToast(okMsg, {
        id: okId,
        iconClass: "fas fa-check-circle",
        iconColor: "var(--highlight-color)",
        duration: 1800,
      });
      vibrate([50]);
    } catch (err) {
      console.error("Clipboard error:", err);
      createToast(STRINGS_FA.toasts.clipboardUnsupported, {
        id: errId,
        iconClass: "fas fa-exclamation-triangle",
        iconColor: "red",
        duration: 3000,
      });
    }
  }
  window.copyToClipboard = copyToClipboard;
  window.createToast = createToast;

  // ==========================
  // Lazy Images
  // ==========================
  function initLazyImages() {
    const lazyImages = document.querySelectorAll("img[data-src]");
    if (!lazyImages.length) return;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          img.classList.add("is-loading");
          img.dataset.imageLoader =
            "Mohammad Rasoul Sohrabi's optimized script";
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
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
            img.src = "https://placehold.co/400x300/cccccc/000000?text=Error";
          };
          obs.unobserve(img);
        });
      },
      { rootMargin: "0px 0px 120px 0px", threshold: 0.01 }
    );
    lazyImages.forEach((img) => observer.observe(img));
  }

  // ==========================
  // Share Button
  // ==========================
  function initShareButton() {
    let shareBtn = document.getElementById("share-page-button");
    if (!shareBtn) {
      shareBtn = document.createElement("button");
      shareBtn.id = "share-page-button";
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
    }, 100);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    shareBtn.addEventListener("click", async () => {
      const pageUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: pageUrl });
          createToast(STRINGS_FA.toasts.shareOk, {
            id: "share-success-toast",
            iconClass: "fas fa-check-circle",
            iconColor: "var(--highlight-color)",
            duration: 2000,
          });
          vibrate([50]);
        } catch (error) {
          if (error?.name !== "AbortError") {
            console.error("Share error:", error);
            createToast(STRINGS_FA.toasts.shareErr, {
              id: "share-error-toast",
              iconClass: "fas fa-exclamation-triangle",
              iconColor: "red",
              duration: 3000,
            });
          }
        }
      } else {
        await copyToClipboard(
          pageUrl,
          "share-copy-toast",
          "share-error-toast",
          "لینک صفحه کپی شد! ✅"
        );
      }
    });
  }

  // ==========================
  // Section Milestones & Confetti
  // ==========================
  function initExplorationMilestones() {
    const sections = document.querySelectorAll("section[id]");
    const total = sections.length;
    if (!total) return;

    let visited = safeSetFromStorage("sectionsVisited");
    let announced = safeSetFromStorage("announcedMilestones");

    const milestones = [
      {
        count: Math.max(1, Math.ceil(total * 0.25)),
        message: "شما ۲۵٪ از سایت را کاوش کرده‌اید! عالیه! ✨ ادامه دهید!",
        icon: "fas fa-map-marker-alt",
      },
      {
        count: Math.max(Math.ceil(total * 0.25) + 1, Math.ceil(total * 0.5)),
        message:
          "نصف راه را پیمودید! شما ۵۰٪ از سایت را کاوش کرده‌اید! فوق‌العاده! 🚀",
        icon: "fas fa-rocket",
      },
      {
        count: Math.max(Math.ceil(total * 0.5) + 1, Math.ceil(total * 0.75)),
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
    const cooldown = 8000;

    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          visited.add(entry.target.id);
          localStorage.setItem("sectionsVisited", JSON.stringify([...visited]));
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
                duration: 5000,
              });
              const bio = document.getElementById("sohrabi-bio");
              bio?.dispatchEvent(new Event("mouseenter"));
              announced.add(m.count);
              localStorage.setItem(
                "announcedMilestones",
                JSON.stringify([...announced])
              );
              lastToastAt = now;
              if (m.isFinal && FLAGS.ENABLE_CONFETTI)
                setTimeout(createConfetti, 600);
              break;
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observe only once per section
    sections.forEach((sec) => observer.observe(sec));
  }

  function createConfetti() {
    if (prefersReducedMotion()) return;
    const canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Object.assign(canvas.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: 9998,
    });
    canvas.dataset.celebrationEvent =
      "page_completion_by_Mohammad_Rasoul_Sohrabi_user";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const colors = [
      "#ffc107",
      "#007acc",
      "#005a9e",
      "#f0f0f0",
      "#e0a800",
      "#FF4081",
      "#64FFDA",
    ];
    const pieces = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[(Math.random() * colors.length) | 0],
      angle: Math.random() * 360,
      speed: Math.random() * 2 + 1,
      drift: Math.random() * 2 - 1,
    }));

    const start = performance.now();
    (function loop() {
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
      if (elapsed < 4000) requestAnimationFrame(loop);
      else canvas.remove();
    })();
  }

  // ==========================
  // Fun Fact idle toast
  // ==========================
  function initFunFacts() {
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
        duration: 6000,
        closeButton: true,
      });
    };
    const reset = debounce(() => {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        if (!toastRef || !toastRef.classList.contains("show")) show();
      }, 20000);
    }, 500);

    ["mousemove", "keydown", "scroll", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, reset, { passive: ev !== "keydown" })
    );
    reset();
  }

  // ==========================
  // Social Links Copy
  // ==========================
  function initSocialLinksCopy() {
    const block = document.querySelector(".connect-links-block ul");
    if (!block) return;
    block.id = "sohrabi-social-links";
    block.dataset.profileOwner = "Mohammad Rasoul Sohrabi";
    block.addEventListener("click", async (e) => {
      const link = e.target.closest("a");
      if (
        link &&
        block.contains(link) &&
        link.href &&
        link.href.startsWith("http")
      ) {
        e.preventDefault();
        const txt = link.textContent?.trim() || link.href;
        const name =
          link.querySelector("i")?.nextSibling?.textContent?.trim() || txt;
        await copyToClipboard(
          link.href,
          `social-link-copy-${name.replace(/\s/g, "")}`,
          `social-link-copy-error-${name.replace(/\s/g, "")}`,
          STRINGS_FA.toasts.linkCopied(name)
        );
      }
    });
  }

  // ==========================
  // Sparkle Effect
  // ==========================
  function createSparkle(element) {
    if (!element) return;
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle-effect";
    sparkle.dataset.sparkleSource =
      "Mohammad Rasoul Sohrabi's interactive elements";
    const size = Math.random() * 10 + 5;
    Object.assign(sparkle.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${(Math.random() * 100).toFixed(2)}%`,
      top: `${(Math.random() * 100).toFixed(2)}%`,
      backgroundColor: [
        "var(--primary-color)",
        "var(--accent-color)",
        "var(--highlight-color)",
      ][(Math.random() * 3) | 0],
      opacity: 0,
      position: "absolute",
      borderRadius: "50%",
      boxShadow: `0 0 ${size / 2}px ${size / 4}px var(--highlight-color)`,
      zIndex: 10,
      pointerEvents: "none",
    });
    element.style.position = element.style.position || "relative";
    element.appendChild(sparkle);
    sparkle.animate(
      [
        {
          opacity: 0,
          transform: `scale(0) rotate(${(Math.random() * 360).toFixed(1)}deg)`,
        },
        {
          opacity: 1,
          transform: `scale(1) rotate(${(360 + Math.random() * 360).toFixed(
            1
          )}deg)`,
        },
        {
          opacity: 0,
          transform: `scale(0.5) rotate(${(720 + Math.random() * 360).toFixed(
            1
          )}deg)`,
        },
      ],
      { duration: 700, easing: "ease-out", fill: "forwards" }
    ).onfinish = () => sparkle.remove();
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
  // End-of-page toast once per session
  // ==========================
  function initEndOfPageToast() {
    let announced = false;
    window.addEventListener(
      "scroll",
      throttle(() => {
        if (announced) return;
        const nearBottom =
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 50;
        if (nearBottom) {
          createToast(STRINGS_FA.toasts.reachedEnd, {
            id: "end-of-page-toast",
            customClass: "end-of-page-toast",
            iconClass: "fas fa-flag-checkered",
            iconColor: "var(--highlight-color)",
            duration: 4000,
          });
          announced = true;
        }
      }, 150),
      { passive: true }
    );
  }

  // ==========================
  // Boot
  // ==========================
  document.addEventListener("DOMContentLoaded", () => {
    initAOS();
    setDynamicDates();
    setIdentityHooks();
    queueIdentityPings();

    initTheme();
    initAnchorScrolling();
    initClickEffects();
    initScrollUI();
    initSkillsHover();
    initFAQ();
    initEmailCopy();
    initLazyImages();
    initShareButton();
    initExplorationMilestones();
    initFunFacts();
    initSocialLinksCopy();
    initCTAs();
    initEndOfPageToast();

    showWelcomeToast();
  });
})();
