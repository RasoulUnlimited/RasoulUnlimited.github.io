// main-script.js
// اسکریپت اصلی برای وبسایت رسمی رسول آنلیمیتد

// --- ابزارهای کمکی برای بهبود عملکرد ---

/**
 * تابع throttle برای محدود کردن تعداد دفعات اجرای یک تابع در یک بازه زمانی مشخص.
 * @param {Function} func - تابعی که باید محدود شود.
 * @param {number} limit - حداقل زمان (میلی‌ثانیه) بین دو اجرای متوالی تابع.
 * @returns {Function} - تابع محدود شده.
 */
function throttle(func, limit) {
  let inThrottle;
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
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

/**
 * تابع debounce برای به تأخیر انداختن اجرای یک تابع تا زمانی که یک رویداد متوقف شود.
 * @param {Function} func - تابعی که باید به تأخیر انداخته شود.
 * @param {number} delay - مدت زمان تأخیر (میلی‌ثانیه).
 * @returns {Function} - تابع به تأخیر افتاده.
 */
function debounce(func, delay) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// 1. به‌روزرسانی سال جاری در فوتر
document.getElementById("current-year").textContent = new Date().getFullYear();

// 2. راه‌اندازی کتابخانه AOS (Animate On Scroll)
AOS.init({
  disable: false,
  startEvent: "DOMContentLoaded",
  initClassName: "aos-init",
  animatedClassName: "aos-animate",
  useClassNames: false,
  disableMutationObserver: false,
  debounceDelay: 50,
  throttleDelay: 99,
  offset: 120,
  duration: 600, // کمی کوتاه‌تر برای حس سریع‌تر و پاسخگویی بیشتر (روان‌شناسی ادراک)
  easing: "ease-out",
  once: false,
  mirror: false,
  anchorPlacement: "top-bottom",
});

// 3. مدیریت تغییر تم (حالت روشن/تاریک)
const themeToggleInput = document.getElementById("theme-toggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme");

/**
 * تابع مرکزی برای نمایش پیام‌های Toast.
 * @param {string} message - متن پیام.
 * @param {object} options - گزینه‌های نمایش Toast.
 */
function createToast(message, options = {}) {
  const defaultOptions = {
    duration: 2500, // مدت زمان پیش‌فرض کمی کوتاه‌تر برای حس پاسخگویی بیشتر (روان‌شناسی ادراک، پاداش فوری)
    customClass: "",
    iconClass: "",
    iconColor: "",
    position: "bottom",
    isPersistent: false,
    id: "",
  };
  const settings = { ...defaultOptions, ...options };

  if (settings.id) {
    const existingToast = document.getElementById(settings.id);
    if (existingToast && existingToast.classList.contains("show")) {
      return;
    }
  }

  document
    .querySelectorAll(".dynamic-toast:not(.persistent-toast)")
    .forEach((toast) => {
      if (toast.id !== settings.id) {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove(), {
          once: true,
        });
      }
    });

  const dynamicToast = document.createElement("div");
  dynamicToast.className = `dynamic-toast ${settings.customClass}`;
  dynamicToast.setAttribute("role", "status");
  dynamicToast.setAttribute("aria-live", "polite");
  if (settings.id) {
    dynamicToast.id = settings.id;
  }

  let iconHtml = "";
  if (settings.iconClass) {
    iconHtml = `<i class="${settings.iconClass}" style="color: ${
      settings.iconColor || "inherit"
    };"></i>`;
  }

  dynamicToast.innerHTML = `${iconHtml} <span class="toast-message">${message}</span>`;
  document.body.appendChild(dynamicToast);

  if (settings.position === "top") {
    dynamicToast.style.top = "20px";
    dynamicToast.style.bottom = "auto";
    dynamicToast.style.transform = "translateX(-50%) translateY(-150%)";
  } else {
    dynamicToast.style.bottom = "20px";
    dynamicToast.style.top = "auto";
    dynamicToast.style.transform = "translateX(-50%) translateY(150%)";
  }

  setTimeout(() => {
    dynamicToast.classList.add("show");
    dynamicToast.style.transform = "translateX(-50%) translateY(0)";
  }, 100);

  if (!settings.isPersistent) {
    setTimeout(() => {
      if (settings.position === "top") {
        dynamicToast.style.transform = "translateX(-50%) translateY(-150%)";
      } else {
        dynamicToast.style.transform = "translateX(-50%) translateY(150%)";
      }
      dynamicToast.classList.remove("show");
      dynamicToast.addEventListener(
        "transitionend",
        () => dynamicToast.remove(),
        { once: true }
      );
    }, settings.duration);
  } else {
    dynamicToast.classList.add("persistent-toast");
  }

  return dynamicToast;
}

// اعمال تم بر اساس تنظیمات ذخیره شده یا پیش‌فرض سیستم
function applyTheme(theme, showToast = false) {
  document.body.classList.toggle("dark-mode", theme === "dark");
  document.body.classList.toggle("light-mode", theme === "light");
  themeToggleInput.checked = theme === "dark";

  if (showToast) {
    createToast(
      `تم به حالت ${theme === "dark" ? "تاریک" : "روشن"} تغییر یافت.`,
      {
        id: "theme-change-toast",
        customClass: "theme-toast",
        iconClass: theme === "dark" ? "fas fa-moon" : "fas fa-sun",
        iconColor: theme === "dark" ? "white" : "var(--highlight-color)",
        position: "top",
      }
    );
  }
}

if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme(prefersDark ? "dark" : "light");
}

themeToggleInput.addEventListener("change", () => {
  const newTheme = themeToggleInput.checked ? "dark" : "light";
  applyTheme(newTheme, true);
  localStorage.setItem("theme", newTheme);
});

// 4. مدیریت اسکرول صاف برای لینک‌های ناوبری
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      window.scrollTo({
        top:
          targetElement.offsetTop -
          (document.querySelector(".navbar")?.offsetHeight || 0),
        behavior: "smooth",
      });
    }
  });
});

// 5. بازخورد بصری برای کلیک روی کارت‌ها (روان‌شناسی ادراک، تحریک دوپامین)
document.addEventListener("click", function (event) {
  const card = event.target.closest(".card");
  if (card) {
    card.classList.add("clicked-pop");
    setTimeout(() => {
      card.classList.remove("clicked-pop");
    }, 300); // مدت زمان کوتاه برای بازخورد آنی
  }
});

// 6. نوار پیشرفت اسکرول (روان‌شناسی ادراک، حس پیشرفت، انگیزش درونی)
const scrollProgressBar = document.createElement("div");
scrollProgressBar.id = "scroll-progress-bar";
document.body.prepend(scrollProgressBar);

let lastScrollY = 0;
let ticking = false;
let hasReachedEndOfPageSession = false;

function updateScrollProgressAndButton() {
  const totalHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const scrolled = lastScrollY;
  const progress = (scrolled / totalHeight) * 100;

  scrollProgressBar.style.width = progress + "%";

  if (progress > 90) {
    scrollProgressBar.style.backgroundColor = "var(--highlight-color)";
  } else if (progress > 50) {
    scrollProgressBar.style.backgroundColor = "var(--accent-color)";
  } else {
    scrollProgressBar.style.backgroundColor = "var(--primary-color)";
  }

  // دکمه بازگشت به بالا با انیمیشن ظریف (زیبایی‌شناسی تعاملی)
  if (lastScrollY > 300) {
    if (!scrollToTopButton.classList.contains("show")) {
      scrollToTopButton.classList.add("show");
      scrollToTopButton.style.opacity = "1";
      scrollToTopButton.style.transform = "translateY(0)";
    }
  } else {
    if (scrollToTopButton.classList.contains("show")) {
      scrollToTopButton.style.opacity = "0";
      scrollToTopButton.style.transform = "translateY(20px)";
      scrollToTopButton.addEventListener('transitionend', function handler() {
        scrollToTopButton.classList.remove("show");
        scrollToTopButton.removeEventListener('transitionend', handler);
      }, {once: true});
    }
  }

  // 12. جشن اتمام صفحه (اثر پایان خوش، تحریک دوپامین، غافلگیری مثبت)
  if (
    window.innerHeight + lastScrollY >= document.body.offsetHeight &&
    !hasReachedEndOfPageSession
  ) {
    createToast("شما به انتهای صفحه رسیدید. از بازدید شما سپاسگزارم. 🎉", {
      id: "end-of-page-toast",
      customClass: "end-of-page-toast",
      iconClass: "fas fa-flag-checkered",
      iconColor: "var(--highlight-color)",
      duration: 4000,
    });
    hasReachedEndOfPageSession = true;

    if (!announcedMilestones.has(totalSections)) {
      announcedMilestones.add(totalSections);
      localStorage.setItem(
        "announcedMilestones",
        JSON.stringify(Array.from(announcedMilestones))
      );
      sections.forEach((sec) => sectionProgressObserver.unobserve(sec));
    }

    setTimeout(() => {
      createConfetti();
    }, 3500);
  }
  ticking = false;
}

window.addEventListener(
  "scroll",
  () => {
    lastScrollY = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(updateScrollProgressAndButton);
      ticking = true;
    }
  },
  { passive: true }
);

// 7. Hint برای کاوش بیشتر (تلنگر رفتاری، توجه انتخابی، روان‌شناسی کنجکاوی)
const exploreHint = document.createElement("a");
exploreHint.href = "#projects";
exploreHint.id = "explore-hint";
exploreHint.innerHTML =
  '<i class="fas fa-lightbulb"></i> <span class="hint-text">پروژه‌های من را کشف کنید.</span>';
exploreHint.style.opacity = "0";
exploreHint.style.transform = "translateY(20px)";
document.body.appendChild(exploreHint);

let hintTimeout;
let hintVisible = false;

const heroSection = document.getElementById("hero");
const heroObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!hintVisible) {
          hintTimeout = setTimeout(() => {
            exploreHint.style.transition =
              "opacity 0.5s ease-out, transform 0.5s ease-out";
            exploreHint.style.opacity = "1";
            exploreHint.style.transform = "translateY(0)";
            exploreHint.classList.add('pulse-animation'); // افزودن انیمیشن پالس
            hintVisible = true;
          }, 5000); // کمی کوتاه‌تر برای ترغیب سریع‌تر
        }
      } else {
        clearTimeout(hintTimeout);
        if (hintVisible) {
          exploreHint.style.opacity = "0";
          exploreHint.style.transform = "translateY(20px)";
          exploreHint.classList.remove('pulse-animation'); // حذف انیمیشن پالس
          hintVisible = false;
        }
      }
    });
  },
  { threshold: 0.5 }
);

if (heroSection) {
  heroObserver.observe(heroSection);
}

exploreHint.addEventListener("click", (e) => {
  e.preventDefault();
  exploreHint.style.opacity = "0";
  exploreHint.style.transform = "translateY(20px)";
  exploreHint.classList.remove('pulse-animation'); // حذف انیمیشن پالس
  hintVisible = false;
  window.scrollTo({
    top:
      document.querySelector("#projects").offsetTop -
      (document.querySelector(".navbar")?.offsetHeight || 0),
    behavior: "smooth",
  });
});

// 8. پیام‌های پاداش متغیر برای مهارت‌ها (تحریک دوپامین، غافلگیری مثبت)
const skillsList = document.querySelector("#skills .skills-list");
const skillMessages = [
  "تسلط کامل بر این مهارت.",
  "تجربه گسترده در این حوزه.",
  "راه حل‌های نوآورانه با این تکنولوژی.",
  "در حال کاوش عمیق‌تر در این زمینه.",
  "ابزاری کلیدی برای خلاقیت.",
  "پیشرفت چشمگیر از ابتدا تا کنون.",
  "پروژه‌های بزرگتری در راه است.",
  "چالش‌های این مهارت را دوست دارم.",
  "یادگیری مستمر در این تخصص.",
  "این مهارت بخشی از توانمندی‌های اصلی من است.",
];

if (skillsList) {
  let currentSkillMessageSpan = null;
  let hideTimeoutForSkill;

  skillsList.addEventListener("mouseover", function (event) {
    const skillItem = event.target.closest("li");
    if (skillItem && skillsList.contains(skillItem)) {
      if (
        currentSkillMessageSpan &&
        currentSkillMessageSpan.parentElement !== skillItem
      ) {
        clearTimeout(hideTimeoutForSkill);
        currentSkillMessageSpan.style.opacity = "0";
        currentSkillMessageSpan.style.transform = "translateY(0)";
        currentSkillMessageSpan = null;
      }

      let messageSpan = skillItem.querySelector(".skill-hover-message");
      if (!messageSpan) {
        messageSpan = document.createElement("span");
        messageSpan.className = "skill-hover-message";
        skillItem.appendChild(messageSpan);
      }
      currentSkillMessageSpan = messageSpan;

      clearTimeout(hideTimeoutForSkill);
      const randomMessage =
        skillMessages[Math.floor(Math.random() * skillMessages.length)];
      messageSpan.textContent = randomMessage;
      messageSpan.style.opacity = "1";
      messageSpan.style.transform = "translateY(-5px)";

      // افکت بصری ظریف روی آیتم مهارت (نورواستتیک، واکنش مغزی به جذابیت بصری)
      skillItem.classList.add('skill-hover-effect');
    }
  });

  skillsList.addEventListener("mouseout", function (event) {
    const skillItem = event.target.closest("li");
    if (skillItem && skillsList.contains(skillItem)) {
      const messageSpan = skillItem.querySelector(".skill-hover-message");
      if (messageSpan) {
        hideTimeoutForSkill = setTimeout(() => {
          messageSpan.style.opacity = "0";
          messageSpan.style.transform = "translateY(0)";
          if (currentSkillMessageSpan === messageSpan) {
            currentSkillMessageSpan = null;
          }
        }, 200);
      }
      skillItem.classList.remove('skill-hover-effect');
    }
  });
}

// 10. بازخورد برای باز شدن FAQ (روان‌شناسی کاربردپذیری، بار شناختی پایین)
const faqContainer = document.querySelector(".faq-container");
const faqItems = document.querySelectorAll(".faq-item");

if (faqContainer) {
  faqItems.forEach((item, index) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector("p");
    const questionId =
      item.dataset.questionId || `faq-q-${index + 1}`;

    summary.setAttribute("aria-expanded", item.open ? "true" : "false");
    if (answer) {
      answer.id = `faq-answer-${questionId}`;
      summary.setAttribute("aria-controls", answer.id);
    }

    if (answer) {
      answer.style.maxHeight = "0px";
      answer.style.overflow = "hidden";
      answer.style.transition =
        "max-height 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), padding 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.4s ease-out";
      answer.style.paddingTop = "0";
      answer.style.paddingBottom = "0";
      answer.style.opacity = "0";

      if (item.open) {
        answer.style.maxHeight = "2000px";
        answer.style.paddingTop = "1.6rem";
        answer.style.paddingBottom = "2.8rem";
        answer.style.opacity = "1";
      }
    }

    summary.addEventListener("click", (event) => {
      if (event.target.tagName === "A") {
        event.preventDefault();
        window.location.href = event.target.href;
        return;
      }

      event.preventDefault();

      const wasAlreadyOpen = item.open;

      summary.classList.add("faq-summary-clicked");
      setTimeout(() => {
        summary.classList.remove("faq-summary-clicked");
      }, 300);

      faqItems.forEach((otherItem) => {
        if (otherItem !== item && otherItem.open) {
          const otherSummary = otherItem.querySelector("summary");
          const otherAnswer = otherItem.querySelector("p");
          if (otherAnswer) {
            otherAnswer.style.maxHeight = "0px";
            otherAnswer.style.paddingTop = "0";
            otherAnswer.style.paddingBottom = "0";
            otherAnswer.style.opacity = "0";
            otherSummary.setAttribute("aria-expanded", "false");

            setTimeout(() => {
              otherItem.open = false;
            }, 400);
          } else {
            otherItem.open = false;
            otherSummary.setAttribute("aria-expanded", "false");
          }
          if (typeof gtag === "function") {
            gtag("event", "faq_auto_collapse", {
              event_category: "FAQ Interaction",
              event_label: `Question auto-collapsed: ${
                otherItem.dataset.questionId ||
                otherItem
                  .querySelector("summary")
                  .textContent.trim()
                  .substring(0, 50)
              }`,
              question_text: otherItem
                .querySelector("summary")
                .textContent.trim(),
            });
          }
          if (typeof hj === "function") {
            hj(
              "event",
              `faq_auto_collapsed_${
                otherItem.dataset.questionId ||
                otherItem
                  .querySelector("summary")
                  .textContent.trim()
                  .substring(0, 50)
              }`
            );
          }
        }
      });

      if (wasAlreadyOpen) {
        if (answer) {
          answer.style.maxHeight = "0px";
          answer.style.paddingTop = "0";
          answer.style.paddingBottom = "0";
          answer.style.opacity = "0";
          summary.setAttribute("aria-expanded", "false");
          setTimeout(() => {
            item.open = false;
          }, 400);
        } else {
          item.open = false;
          summary.setAttribute("aria-expanded", "false");
        }

        if (typeof gtag === "function") {
          gtag("event", "faq_collapse", {
            event_category: "FAQ Interaction",
            event_label: `Question collapsed: ${questionId}`,
            question_text: summary.textContent.trim(),
          });
        }
        if (typeof hj === "function") {
          hj("event", `faq_collapsed_${questionId}`);
        }
      } else {
        item.open = true;
        if (answer) {
          answer.style.maxHeight = "2000px";
          answer.style.paddingTop = "1.6rem";
          answer.style.paddingBottom = "2.8rem";
          answer.style.opacity = "1";
          summary.setAttribute("aria-expanded", "true");
        }

        setTimeout(() => {
          const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
          const offset = navbarHeight + 20;

          const rect = item.getBoundingClientRect();
          const isTopObscured = rect.top < offset;
          const isBottomObscured = rect.bottom > window.innerHeight;

          if (isTopObscured || isBottomObscured) {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });

            setTimeout(() => {
              const currentScrollY = window.scrollY;
              const currentRect = item.getBoundingClientRect();

              if (currentRect.top < offset) {
                window.scrollTo({
                  top: currentScrollY - (offset - currentRect.top),
                  behavior: 'smooth'
                });
              }
            }, 100);
          }
        }, 600);
        if (typeof gtag === "function") {
          gtag("event", "faq_expand", {
            event_category: "FAQ Interaction",
            event_label: `Question expanded: ${questionId}`,
            question_text: summary.textContent.trim(),
          });
        }
        if (typeof hj === "function") {
          hj("event", `faq_expanded_${questionId}`);
        }
      }
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    if (hash) {
      const targetElement = document.querySelector(hash);
      if (targetElement && targetElement.classList.contains('faq-item')) {
        const targetSummary = targetElement.querySelector('summary');
        const targetAnswer = targetElement.querySelector('p');

        faqItems.forEach(item => {
          if (item !== targetElement && item.open) {
            item.open = false;
            const answer = item.querySelector('p');
            const summary = item.querySelector('summary');
            if (answer) {
              answer.style.maxHeight = '0px';
              answer.style.paddingTop = '0';
              answer.style.paddingBottom = '0';
              answer.style.opacity = '0';
            }
            if (summary) {
              summary.setAttribute('aria-expanded', 'false');
            }
          }
        });

        if (targetElement.open === false) {
          targetElement.open = true;
          if (targetAnswer) {
            targetAnswer.style.maxHeight = "2000px";
            targetAnswer.style.paddingTop = "1.6rem";
            targetAnswer.style.paddingBottom = "2.8rem";
            targetAnswer.style.opacity = "1";
          }
          if (targetSummary) {
            targetSummary.setAttribute('aria-expanded', 'true');
          }

          setTimeout(() => {
            const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
            const offset = navbarHeight + 20;

            const rect = targetElement.getBoundingClientRect();
            const isTopObscured = rect.top < offset;
            const isBottomObscured = rect.bottom > window.innerHeight;

            if (isTopObscured || isBottomObscured) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

              setTimeout(() => {
                const currentScrollY = window.scrollY;
                const currentRect = targetElement.getBoundingClientRect();
                if (currentRect.top < offset) {
                  window.scrollTo({
                    top: currentScrollY - (offset - currentRect.top),
                    behavior: 'smooth'
                  });
                }
              }, 100);
            }
          }, 100);
        }
      }
    }
  });
}

// 11. پیام خوش‌آمدگویی برای کاربران جدید/بازگشتی (همدلی، القای تعلق، هویت اجتماعی)
window.addEventListener("load", () => {
  const hasVisited = localStorage.getItem("hasVisited");
  let message = "";

  if (hasVisited) {
    message = "خوش آمدید! از بازگشت شما خرسندیم.";
  } else {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) {
      message = "صبح بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.";
    } else if (hour >= 10 && hour < 16) {
      message = "ظهر بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.";
    } else if (hour >= 16 && hour < 20) {
      message = "عصر بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.";
    } else {
      message = "شب بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.";
    }
    localStorage.setItem("hasVisited", "true");
  }

  if (message) {
    createToast(message, {
      id: "welcome-toast",
      customClass: "welcome-toast",
      iconClass: "fas fa-hand-sparkles",
      iconColor: "var(--highlight-color)",
      duration: 3500,
    });
  }
});

// 13. بازخورد برای کپی ایمیل (پاداش فوری، روان‌شناسی ادراک)
const emailLink = document.querySelector('.contact-info a[href^="mailto:"]');
if (emailLink) {
  emailLink.addEventListener("click", (e) => {
    e.preventDefault();
    const email = emailLink.href.replace("mailto:", "");

    if (document.execCommand) {
      copyTextUsingExecCommand(email, "email-copy-toast");
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(email)
        .then(() => {
          createToast("ایمیل کپی شد. ✅", {
            id: "email-copy-toast",
            iconClass: "fas fa-check-circle",
            iconColor: "var(--highlight-color)",
            duration: 1800, // مدت زمان کوتاه‌تر برای بازخورد سریع‌تر (روان‌شناسی ادراک)
          });
        })
        .catch((err) => {
          console.error("Failed to copy email using Clipboard API:", err);
        });
    } else {
      createToast("مرورگر شما از کپی کردن پشتیبانی نمی‌کند.", {
        id: "copy-error-toast",
        iconClass: "fas fa-exclamation-triangle",
        iconColor: "red",
        duration: 3000,
      });
    }
  });
}

// تابع کمکی برای کپی کردن متن با execCommand
function copyTextUsingExecCommand(text, toastId) {
  const tempInput = document.createElement("input");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);

  createToast("کپی شد. ✅", {
    id: toastId,
    iconClass: "fas fa-check-circle",
    iconColor: "var(--highlight-color)",
    duration: 1800, // مدت زمان کوتاه‌تر برای بازخورد سریع‌تر (روان‌شناسی ادراک)
  });
}

// 14. افکت کنفتی (نورومارکتینگ، روان‌شناسی هیجانی، اثر پایان خوش)
function createConfetti() {
  const confettiContainer = document.createElement("div");
  confettiContainer.id = "confetti-container";
  document.body.appendChild(confettiContainer);

  const confettiCount = 40; // افزایش تعداد کنفتی برای حس جشن بیشتر (تحریک دوپامین)
  const colors = ["#ffc107", "#007acc", "#005a9e", "#f0f0f0", "#e0a800"]; // افزودن رنگ‌های بیشتر
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = Math.random() * 100 + "vh";
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    fragment.appendChild(confetti);

    confetti.animate(
      [
        {
          transform: `translateY(0) rotate(${Math.random() * 360}deg)`,
          opacity: 1,
        },
        {
          transform: `translateY(${window.innerHeight * 1.2}px) rotate(${
            Math.random() * 720
          }deg)`,
          opacity: 0,
        },
      ],
      {
        duration: Math.random() * 2000 + 1500,
        easing: "ease-out",
        delay: Math.random() * 300,
        fill: "forwards",
      }
    );

    confetti.addEventListener("animationend", () => {
      confetti.remove();
    });
  }
  confettiContainer.appendChild(fragment);

  setTimeout(() => {
    confettiContainer.remove();
  }, 3600);
}

// 15. پیام‌های "دانستنی جالب" (Fun Fact) (غافلگیری مثبت، تحریک دوپامین، حفظ توجه)
const funFacts = [
  "اولین ربات فارسی دیسکورد توسط من در ۱۴ سالگی توسعه یافت.",
  "من در کاراته دان ۱ رسمی فدراسیون هستم.",
  "فلسفه 'آنلیمیتد' به معنای به چالش کشیدن محدودیت‌هاست.",
  "من دانشجوی مهندسی پزشکی دانشگاه تهران هستم.",
  "پروژه‌های برنامه‌نویسی من در Zenodo نمایه شده‌اند و دارای DOI هستند.",
];

let funFactToastInstance = null;
let idleTimeout;

const debouncedResetIdleTimer = debounce(resetIdleTimer, 500);

function resetIdleTimer() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    if (
      !funFactToastInstance ||
      !funFactToastInstance.classList.contains("show")
    ) {
      showFunFact();
    }
  }, 25000); // کمی کوتاه‌تر برای حفظ تازگی و جلوگیری از خستگی (روان‌شناسی توجه)
}

["mousemove", "keydown", "scroll", "touchstart"].forEach((event) => {
  if (event === "scroll" || event === "touchstart") {
    window.addEventListener(event, debouncedResetIdleTimer, { passive: true });
  } else {
    window.addEventListener(event, debouncedResetIdleTimer);
  }
});

resetIdleTimer();

function showFunFact() {
  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
  funFactToastInstance = createToast(`دانستنی: ${randomFact}`, {
    id: "fun-fact-toast",
    customClass: "fun-fact-toast",
    iconClass: "fas fa-lightbulb",
    iconColor: "var(--primary-color)",
    position: "top",
    duration: 5000, // مدت زمان کوتاه‌تر برای حفظ تازگی و جلوگیری از خستگی
  });

  const closeButton = document.createElement("button");
  closeButton.className = "fun-fact-close";
  closeButton.setAttribute("aria-label", "بستن پیام دانستنی");
  closeButton.innerHTML = '<i class="fas fa-times"></i>';
  funFactToastInstance.appendChild(closeButton);

  closeButton.addEventListener(
    "click",
    () => {
      funFactToastInstance.classList.remove("show");
      funFactToastInstance.addEventListener(
        "transitionend",
        () => funFactToastInstance.remove(),
        { once: true }
      );
      funFactToastInstance = null;
      resetIdleTimer();
    },
    { once: true }
  );
}

// 16. فعال‌سازی افکت "جرقه" برای کارت‌های برجسته (نورواستتیک، توجه انتخابی)
function createSparkle(element) {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle-effect";
  const size = Math.random() * 10 + 5;
  sparkle.style.width = `${size}px`;
  sparkle.style.height = `${size}px`;
  sparkle.style.left = `${Math.random() * 100}%`;
  sparkle.style.top = `${Math.random() * 100}%`;
  sparkle.style.backgroundColor = "white";
  sparkle.style.opacity = 0;
  sparkle.style.position = "absolute";
  sparkle.style.borderRadius = "50%";
  sparkle.style.boxShadow = `0 0 ${size / 2}px ${
    size / 4
  }px var(--highlight-color)`;
  sparkle.style.zIndex = 10;
  sparkle.style.pointerEvents = "none";

  element.style.position = "relative";
  element.appendChild(sparkle);

  sparkle.animate(
    [
      { opacity: 0, transform: "scale(0) rotate(0deg)" },
      { opacity: 1, transform: "scale(1) rotate(180deg)" },
      { opacity: 0, transform: "scale(0.5) rotate(360deg)" },
    ],
    {
      duration: 700, // کمی کوتاه‌تر برای حس زنده‌تر
      easing: "ease-out",
      fill: "forwards",
    }
  ).onfinish = () => sparkle.remove();
}

const featuredCards = document.querySelectorAll(".card.is-featured");
const featuredCardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => createSparkle(entry.target), i * 150);
        }
        featuredCardObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

featuredCards.forEach((card) => {
  featuredCardObserver.observe(card);
});

// 17. پیام پیشرفت "بخش‌های کاوش شده" (تحریک دوپامین، تعهد و ثبات، نقشه سفر کاربر)
const sections = document.querySelectorAll("section[id]");
const totalSections = sections.length;

let sectionsVisited = new Set(
  JSON.parse(localStorage.getItem("sectionsVisited") || "[]")
);
let announcedMilestones = new Set(
  JSON.parse(localStorage.getItem("announcedMilestones") || "[]")
);

const explorationMilestones = [
  {
    count: Math.ceil(totalSections * 0.25), // 25%
    message: "شما ۲۵٪ از سایت را کاوش کرده‌اید! عالیه! ✨ ادامه دهید!",
    icon: "fas fa-map-marker-alt",
  },
  {
    count: Math.ceil(totalSections * 0.5), // 50%
    message: "نصف راه را پیمودید! شما ۵۰٪ از سایت را کاوش کرده‌اید! فوق‌العاده! 🚀",
    icon: "fas fa-rocket",
  },
  {
    count: Math.ceil(totalSections * 0.75), // 75%
    message: "به ۷۵٪ رسیدید! کم‌کم داریم به پایان می‌رسیم! 🌟",
    icon: "fas fa-star",
  },
  {
    count: totalSections,
    message: `تبریک! شما تمام ${totalSections} بخش سایت را کاوش کرده‌اید! شما یک کاوشگر واقعی هستید! 🎉`,
    isFinal: true,
    icon: "fas fa-trophy",
  },
];

// فیلتر کردن نقاط عطف تکراری یا نامعتبر
const uniqueExplorationMilestones = [];
const counts = new Set();
explorationMilestones.forEach(milestone => {
  if (milestone.count > 0 && !counts.has(milestone.count)) {
    uniqueExplorationMilestones.push(milestone);
    counts.add(milestone.count);
  }
});
// اطمینان از اینکه نقاط عطف به ترتیب صعودی هستند
uniqueExplorationMilestones.sort((a, b) => a.count - b.count);


let lastExplorationToastTime = 0;
const explorationToastCooldown = 8000; // کمی کوتاه‌تر برای حفظ انگیزه

const sectionProgressObserver = new IntersectionObserver(
  (entries) => {
    const now = Date.now();

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        sectionsVisited.add(entry.target.id);
        localStorage.setItem(
          "sectionsVisited",
          JSON.stringify(Array.from(sectionsVisited))
        );

        const currentSectionsCount = sectionsVisited.size;

        for (let i = 0; i < uniqueExplorationMilestones.length; i++) {
          const milestone = uniqueExplorationMilestones[i];

          if (
            currentSectionsCount >= milestone.count &&
            !announcedMilestones.has(milestone.count) &&
            now - lastExplorationToastTime > explorationToastCooldown
          ) {
            let customClass = "exploration-toast";
            let iconColor = "var(--accent-color)";
            if (milestone.isFinal) {
              customClass += " final-exploration-toast";
              iconColor = "var(--primary-color)";
            }

            createToast(milestone.message, {
              id: `exploration-milestone-${milestone.count}`,
              customClass: customClass,
              iconClass: milestone.icon,
              iconColor: iconColor,
              duration: 5000,
            });

            announcedMilestones.add(milestone.count);
            localStorage.setItem(
              "announcedMilestones",
              JSON.stringify(Array.from(announcedMilestones))
            );

            lastExplorationToastTime = now;

            if (milestone.isFinal) {
              sections.forEach((sec) => sectionProgressObserver.unobserve(sec));
              return;
            }
          }
        }
      }
    });
  },
  { threshold: 0.3 }
);

const isAllSectionsExploredPreviously = announcedMilestones.has(totalSections);
if (!isAllSectionsExploredPreviously) {
  sections.forEach((section) => {
    sectionProgressObserver.observe(section);
  });
}

// 18. افکت پالس/گلو برای دکمه‌های CTA اصلی (نورومارکتینگ، روان‌شناسی متقاعدسازی)
const mainCTAs = document.querySelectorAll(".main-cta-button");

mainCTAs.forEach((button) => {
  button.classList.add("cta-pulse-effect");
});

// 19. بارگذاری تنبل تصاویر (روان‌شناسی ادراک، بار شناختی پایین)
document.addEventListener("DOMContentLoaded", function () {
  const lazyImages = document.querySelectorAll("img[data-src]");

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
          }
          img.removeAttribute("data-src");
          img.removeAttribute("data-srcset");
          img.classList.add("loaded");
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: "0px 0px 100px 0px",
      threshold: 0.01,
    }
  );

  lazyImages.forEach((img) => {
    imageObserver.observe(img);
  });
});

// 20. دکمه بازگشت به بالا (روان‌شناسی کاربردپذیری، کاهش هزینه فرصت روانی)
const scrollToTopButton = document.createElement("button");
scrollToTopButton.id = "scroll-to-top";
scrollToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopButton.setAttribute("aria-label", "بازگشت به بالای صفحه");
document.body.appendChild(scrollToTopButton);

// تنظیمات اولیه برای انیمیشن
scrollToTopButton.style.opacity = "0";
scrollToTopButton.style.transform = "translateY(20px)";
scrollToTopButton.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";


scrollToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// 21. قابلیت کپی کردن لینک شبکه‌های اجتماعی (پاداش فوری، روان‌شناسی تعامل)
const connectLinksBlock = document.querySelector(".connect-links-block ul");
if (connectLinksBlock) {
  connectLinksBlock.addEventListener("click", function (e) {
    const socialLink = e.target.closest("a");
    if (socialLink && connectLinksBlock.contains(socialLink)) {
      if (socialLink.href && socialLink.href.startsWith("http")) {
        e.preventDefault();

        const linkToCopy = socialLink.href;

        if (document.execCommand) {
          let linkName = socialLink.textContent.trim();
          if (socialLink.querySelector("i")) {
            linkName = socialLink
              .querySelector("i")
              .nextSibling.textContent.trim();
          }
          copyTextUsingExecCommand(
            linkToCopy,
            `social-link-copy-${linkName.replace(/\s/g, "")}`
          );
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(linkToCopy)
            .then(() => {
              let linkName = socialLink.textContent.trim();
              if (socialLink.querySelector("i")) {
                linkName = socialLink
                  .querySelector("i")
                  .nextSibling.textContent.trim();
              }
              createToast(`لینک ${linkName} کپی شد! ✅`, {
                id: `social-link-copy-${linkName.replace(/\s/g, "")}`,
                iconClass: "fas fa-clipboard-check",
                iconColor: "var(--highlight-color)",
                duration: 1800, // مدت زمان کوتاه‌تر برای بازخورد سریع
              });
            })
            .catch((err) => {
              console.error(
                "Failed to copy social link using Clipboard API:",
                err
              );
            });
        } else {
          let linkName = socialLink.textContent.trim();
          if (socialLink.querySelector("i")) {
            linkName = socialLink
              .querySelector("i")
              .nextSibling.textContent.trim();
          }
          createToast(`مرورگر شما از کپی کردن لینک ${linkName} پشتیبانی نمی‌کند.`, {
            id: `social-link-copy-error-${linkName.replace(/\s/g, "")}`,
            iconClass: "fas fa-exclamation-triangle",
            iconColor: "red",
            duration: 3000,
          });
        }
      }
    }
  });
}

// --- ویژگی جدید: لحظه لذت در ورود به بخش جدید (Positive Surprise, Dopaminergic Activation, Neuroaesthetics) ---
// این ویژگی با ایجاد یک افکت بصری ظریف هنگام ورود کاربر به یک بخش جدید (برای اولین بار)،
// حس غافلگیری مثبت و پاداش دوپامینی را در او فعال می‌کند. این به تقویت حافظه و افزایش درگیری ذهنی کمک می‌کند.
const sectionsDelighted = new Set(
  JSON.parse(localStorage.getItem("sectionsDelighted") || "[]")
);

const sectionDelightObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !sectionsDelighted.has(entry.target.id)) {
        const sectionTitle = entry.target.querySelector('h2, h3'); // عنوان بخش را پیدا کن
        if (sectionTitle) {
          // ایجاد یک افکت بصری کوچک، مثلاً یک پالس یا تغییر رنگ ظریف
          sectionTitle.classList.add('section-delight-effect');
          setTimeout(() => {
            sectionTitle.classList.remove('section-delight-effect');
          }, 1000); // مدت زمان افکت

          // می‌توان اینجا یک Toast کوچک و بسیار ظریف هم اضافه کرد
          // createToast(`بخش ${sectionTitle.textContent.trim()} را کشف کردید!`, {
          //   customClass: 'subtle-discovery-toast',
          //   duration: 1500,
          //   position: 'top',
          //   iconClass: 'fas fa-sparkles'
          // });

          sectionsDelighted.add(entry.target.id);
          localStorage.setItem('sectionsDelighted', JSON.stringify(Array.from(sectionsDelighted)));
        }
        observer.unobserve(entry.target); // فقط یک بار برای هر بخش
      }
    });
  },
  { threshold: 0.4 } // وقتی 40% از بخش قابل مشاهده شد
);

// مشاهده تمام بخش‌ها برای فعال‌سازی ویژگی "لحظه لذت"
sections.forEach(section => {
  if (!sectionsDelighted.has(section.id)) {
    sectionDelightObserver.observe(section);
  }
});


// --- ویژگی جدید: بازخورد بصری برای اسکرول به بالا (روان‌شناسی ادراک، زیبایی‌شناسی تعاملی) ---
// این CSS برای انیمیشن دکمه بازگشت به بالا است.
// این کد باید در فایل CSS شما باشد.
/*
#scroll-to-top {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  z-index: 1000;
}

#scroll-to-top.show {
  opacity: 1;
  transform: translateY(0);
}
*/

// --- ویژگی جدید: انیمیشن پالس برای Explore Hint (روان‌شناسی توجه انتخابی، تلنگر رفتاری) ---
// این CSS برای انیمیشن پالس است که به explore-hint اضافه می‌شود.
// این کد باید در فایل CSS شما باشد.
/*
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

#explore-hint.pulse-animation {
  animation: pulse 1.5s infinite ease-in-out;
}
*/

// --- ویژگی جدید: افکت هاور روی آیتم‌های مهارت (نورواستتیک، واکنش مغزی به جذابیت بصری) ---
// این CSS برای افکت هاور روی آیتم‌های مهارت است.
// این کد باید در فایل CSS شما باشد.
/*
.skills-list li.skill-hover-effect {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 12px rgba(var(--primary-rgb), 0.3);
}
*/

// --- ویژگی جدید: انیمیشن برای عنوان بخش در "لحظه لذت" (نورواستتیک، غافلگیری مثبت) ---
// این CSS برای افکت "لحظه لذت" روی عنوان بخش است.
// این کد باید در فایل CSS شما باشد.
/*
@keyframes sectionDelight {
  0% {
    transform: translateY(10px) scale(0.95);
    opacity: 0;
  }
  50% {
    transform: translateY(0) scale(1.05);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.section-delight-effect {
  animation: sectionDelight 0.8s ease-out forwards;
}
*/