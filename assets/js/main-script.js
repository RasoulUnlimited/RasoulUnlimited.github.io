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

// 1. به‌روزرسانی سال جاری در فوتر (اصل روان‌روانی و سهولت جریان)
document.getElementById("current-year").textContent = new Date().getFullYear();

// 2. راه‌اندازی کتابخانه AOS (Animate On Scroll) (روان‌شناسی ادراک، زیبایی‌شناسی تعاملی)
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
  duration: 600, // کمی کوتاه‌تر برای حس سریع‌تر و پاسخگویی بیشتر
  easing: "ease-out",
  once: false,
  mirror: false,
  anchorPlacement: "top-bottom",
});

/**
 * تابع مرکزی برای نمایش پیام‌های Toast. (بازخورد آنی، پاداش فوری، روان‌شناسی ادراک)
 * این تابع به گونه‌ای طراحی شده که پیام‌های مهم را بدون ایجاد مزاحمت بصری زیاد،
 * به کاربر منتقل کند و حس پاسخگویی و تعامل را افزایش دهد.
 * @param {string} message - متن پیام.
 * @param {object} options - گزینه‌های نمایش Toast.
 */
function createToast(message, options = {}) {
  const defaultOptions = {
    duration: 2500, // مدت زمان پیش‌فرض کمی کوتاه‌تر برای حس پاسخگویی بیشتر
    customClass: "",
    iconClass: "",
    iconColor: "",
    position: "bottom",
    isPersistent: false, // آیا توست باید در صفحه بماند؟
    id: "", // شناسه منحصر به فرد برای جلوگیری از توست‌های تکراری
    closeButton: false, // آیا دکمه بستن داشته باشد؟
  };
  const settings = { ...defaultOptions, ...options };

  // اگر توست با این ID از قبل وجود دارد و هنوز فعال است، توست جدیدی ایجاد نکنید
  if (settings.id) {
    const existingToast = document.getElementById(settings.id);
    if (existingToast && existingToast.classList.contains("show")) {
      return;
    }
  }

  // حذف توست‌های غیر Persistent قبلی برای جلوگیری از انباشتگی
  document
    .querySelectorAll(".dynamic-toast:not(.persistent-toast)")
    .forEach((toast) => {
      // فقط توست‌هایی را حذف کنید که ID آنها با توست جدید متفاوت است.
      // این امر به جلوگیری از چشمک زدن توست‌هایی که بلافاصله مجدداً ایجاد می‌شوند، کمک می‌کند.
      if (toast.id !== settings.id) {
        toast.classList.remove("show");
        // اطمینان از حذف کامل از DOM پس از پایان انیمیشن
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

  // تنظیم موقعیت ورود توست (از بالا یا پایین)
  if (settings.position === "top") {
    dynamicToast.style.top = "20px";
    dynamicToast.style.bottom = "auto";
    dynamicToast.style.transform = "translateX(-50%) translateY(-150%)"; // شروع از بالای صفحه
  } else {
    dynamicToast.style.bottom = "20px";
    dynamicToast.style.top = "auto";
    dynamicToast.style.transform = "translateX(-50%) translateY(150%)"; // شروع از پایین صفحه
  }

  // اعمال انیمیشن ورود
  setTimeout(() => {
    dynamicToast.classList.add("show");
    dynamicToast.style.transform = "translateX(-50%) translateY(0)";
  }, 100);

  if (settings.closeButton) {
    const closeBtn = document.createElement("button");
    closeBtn.className = "fun-fact-close"; // می‌توانید کلاس عمومی‌تری استفاده کنید
    closeBtn.setAttribute("aria-label", "بستن پیام");
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    dynamicToast.appendChild(closeBtn);
    closeBtn.addEventListener("click", () => {
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
    });
  }

  // حذف خودکار توست پس از مدت زمان مشخص (اگر Persistent نباشد)
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

// 3. مدیریت تغییر تم (حالت روشن/تاریک) (کنترل و انتخاب، زیبایی‌شناسی، بازخورد آنی)
const themeToggleInput = document.getElementById("theme-toggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme");

// اعمال تم بر اساس تنظیمات ذخیره شده یا پیش‌فرض سیستم
function applyTheme(theme, showToast = false) {
  document.body.classList.toggle("dark-mode", theme === "dark");
  document.body.classList.toggle("light-mode", theme === "light"); // اطمینان از حذف light-mode در صورت نیاز
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
        duration: 2800, // کمی بیشتر برای خوانایی
      }
    );
    // افزودن افکت جرقه به هنگام تغییر تم (میکرواینتراکشن، پاداش فوری)
    createSparkle(themeToggleInput.parentElement);
  }
}

// لود اولیه تم
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme(prefersDark ? "dark" : "light");
}

// گوش دادن به تغییرات تم
themeToggleInput.addEventListener("change", () => {
  const newTheme = themeToggleInput.checked ? "dark" : "light";
  applyTheme(newTheme, true);
  localStorage.setItem("theme", newTheme);
});

// 4. مدیریت اسکرول صاف برای لینک‌های ناوبری (روان‌روانی و سهولت جریان، کاربردپذیری)
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      // محاسبه موقعیت اسکرول با در نظر گرفتن ارتفاع نوار ناوبری ثابت
      const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
      window.scrollTo({
        top: targetElement.offsetTop - navbarHeight - 10, // اضافه کردن کمی فاصله بیشتر
        behavior: "smooth",
      });
    }
  });
});

// 5. بازخورد بصری برای کلیک روی کارت‌ها (پاداش فوری، نشانه‌های تعاملی، تحریک دوپامین)
document.addEventListener("click", function (event) {
  const card = event.target.closest(".card");
  if (card) {
    card.classList.add("clicked-pop");
    setTimeout(() => {
      card.classList.remove("clicked-pop");
    }, 300); // مدت زمان کوتاه برای بازخورد آنی
  }
});

// 6. نوار پیشرفت اسکرول (پیشرفت قابل مشاهده، حس موفقیت، انگیزش درونی)
const scrollProgressBar = document.createElement("div");
scrollProgressBar.id = "scroll-progress-bar";
document.body.prepend(scrollProgressBar);

let lastScrollY = 0;
let ticking = false;
let hasReachedEndOfPageSession = false; // برای اطمینان از اینکه توست پایان صفحه فقط یک بار نمایش داده شود

function updateScrollProgressAndButton() {
  const totalHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const scrolled = lastScrollY;
  const progress = (scrolled / totalHeight) * 100;

  scrollProgressBar.style.width = progress + "%";

  // تغییر رنگ نوار پیشرفت بر اساس میزان پیشرفت (پاداش بصری)
  if (progress > 90) {
    scrollProgressBar.style.backgroundColor = "var(--highlight-color)";
  } else if (progress > 50) {
    scrollProgressBar.style.backgroundColor = "var(--accent-color)";
  } else {
    scrollProgressBar.style.backgroundColor = "var(--primary-color)";
  }

  // دکمه بازگشت به بالا با انیمیشن ظریف (زیبایی‌شناسی تعاملی، کاربردپذیری)
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
      scrollToTopButton.addEventListener(
        "transitionend",
        function handler() {
          scrollToTopButton.classList.remove("show");
          scrollToTopButton.removeEventListener("transitionend", handler);
        },
        { once: true }
      );
    }
  }

  // 12. جشن اتمام صفحه (اثر پایان خوش، تحریک دوپامین، غافلگیری مثبت)
  // اگر کاربر به انتهای صفحه رسیده باشد و قبلاً پیام پایان صفحه را ندیده باشد
  if (
    window.innerHeight + lastScrollY >= document.body.offsetHeight - 50 && // 50px buffer
    !hasReachedEndOfPageSession
  ) {
    createToast("شما به انتهای صفحه رسیدید. از بازدید شما سپاسگزارم. 🎉", {
      id: "end-of-page-toast",
      customClass: "end-of-page-toast",
      iconClass: "fas fa-flag-checkered",
      iconColor: "var(--highlight-color)",
      duration: 4000,
    });
    hasReachedEndOfPageSession = true; // علامت‌گذاری برای جلوگیری از تکرار

    // بررسی اتمام کاوش سایت
    if (!announcedMilestones.has(totalSections)) {
      announcedMilestones.add(totalSections);
      localStorage.setItem(
        "announcedMilestones",
        JSON.stringify(Array.from(announcedMilestones))
      );
      // پس از رسیدن به انتهای صفحه، دیگر نیازی به مشاهده بخش‌ها برای نقاط عطف نیست
      sections.forEach((sec) => sectionProgressObserver.unobserve(sec));
    }

    // ایجاد کنفتی با کمی تأخیر برای حس جشن
    setTimeout(() => {
      createConfetti();
    }, 3500);
  }
  ticking = false;
}

// گوش دادن به رویداد اسکرول با throttle برای بهینه‌سازی عملکرد
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
exploreHint.href = "#projects"; // هدف‌گذاری بخش پروژه‌ها
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
            exploreHint.classList.add("pulse-animation"); // افزودن انیمیشن پالس برای جلب توجه بیشتر
            hintVisible = true;
          }, 4000); // کمی کوتاه‌تر برای ترغیب سریع‌تر
        }
      } else {
        clearTimeout(hintTimeout); // پاک کردن تایم‌اوت اگر کاربر از هیرو خارج شد
        if (hintVisible) {
          exploreHint.style.opacity = "0";
          exploreHint.style.transform = "translateY(20px)";
          exploreHint.classList.remove("pulse-animation"); // حذف انیمیشن پالس
          hintVisible = false;
        }
      }
    });
  },
  { threshold: 0.5 } // وقتی 50% از هیرو قابل مشاهده بود
);

if (heroSection) {
  heroObserver.observe(heroSection);
}

// هنگام کلیک روی hint، آن را پنهان کرده و به بخش مورد نظر اسکرول کنید
exploreHint.addEventListener("click", (e) => {
  e.preventDefault();
  exploreHint.style.opacity = "0";
  exploreHint.style.transform = "translateY(20px)";
  exploreHint.classList.remove("pulse-animation"); // حذف انیمیشن پالس
  hintVisible = false;
  // اسکرول به بخش پروژه‌ها
  window.scrollTo({
    top:
      document.querySelector("#projects").offsetTop -
      (document.querySelector(".navbar")?.offsetHeight || 0),
    behavior: "smooth",
  });
});

// 8. پیام‌های پاداش متغیر برای مهارت‌ها (تحریک دوپامین، غافلگیری مثبت، لذت از تسلط)
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
  "مهارت‌افزایی مداوم در این بخش.",
  "این تخصص، راه حل بسیاری از مشکلات است.",
  "عاشق برنامه‌نویسی با این زبان/فریم‌ورک هستم.",
  "پروژه‌های بعدی با این تکنولوژی شگفت‌انگیز خواهند بود.",
];

if (skillsList) {
  let currentSkillMessageSpan = null;
  let hideTimeoutForSkill;

  skillsList.addEventListener("mouseover", function (event) {
    const skillItem = event.target.closest("li");
    // اطمینان از اینکه رویداد از یک آیتم مهارت معتبر نشأت گرفته است
    if (skillItem && skillsList.contains(skillItem)) {
      // اگر پیام مهارت دیگری در حال نمایش است، آن را پنهان کنید
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
        // اگر هنوز span پیام وجود ندارد، آن را ایجاد کنید
        messageSpan = document.createElement("span");
        messageSpan.className = "skill-hover-message";
        skillItem.appendChild(messageSpan);
      }
      currentSkillMessageSpan = messageSpan; // به روزرسانی پیام فعلی

      clearTimeout(hideTimeoutForSkill); // پاک کردن تایم‌اوت قبلی برای این مهارت
      const randomMessage =
        skillMessages[Math.floor(Math.random() * skillMessages.length)];
      messageSpan.textContent = randomMessage;
      messageSpan.style.opacity = "1";
      messageSpan.style.transform = "translateY(-5px)"; // بالا آمدن پیام

      // افکت بصری ظریف روی آیتم مهارت (نورواستتیک، واکنش مغزی به جذابیت بصری)
      skillItem.classList.add("skill-hover-effect");
    }
  });

  skillsList.addEventListener("mouseout", function (event) {
    const skillItem = event.target.closest("li");
    if (skillItem && skillsList.contains(skillItem)) {
      const messageSpan = skillItem.querySelector(".skill-hover-message");
      if (messageSpan) {
        // تأخیر در پنهان کردن پیام
        hideTimeoutForSkill = setTimeout(() => {
          messageSpan.style.opacity = "0";
          messageSpan.style.transform = "translateY(0)";
          if (currentSkillMessageSpan === messageSpan) {
            currentSkillMessageSpan = null; // پاک کردن پیام فعلی پس از پنهان شدن
          }
        }, 200);
      }
      // حذف افکت بصری از آیتم مهارت
      skillItem.classList.remove("skill-hover-effect");
    }
  });
}

// 10. بازخورد برای باز شدن FAQ (روان‌شناسی کاربردپذیری، بار شناختی پایین، کنترل و انتخاب)
const faqContainer = document.querySelector(".faq-container");
const faqItems = document.querySelectorAll(".faq-item");

if (faqContainer) {
  faqItems.forEach((item, index) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector("p");
    // اطمینان از وجود data-question-id یا ایجاد یک ID پیش‌فرض
    const questionId = item.dataset.questionId || `faq-q-${index + 1}`;

    // تنظیم aria-expanded برای دسترس‌پذیری
    summary.setAttribute("aria-expanded", item.open ? "true" : "false");
    if (answer) {
      answer.id = `faq-answer-${questionId}`;
      summary.setAttribute("aria-controls", answer.id);
    }

    // تنظیمات اولیه CSS برای انیمیشن باز و بسته شدن
    if (answer) {
      answer.style.maxHeight = "0px";
      answer.style.overflow = "hidden";
      answer.style.transition =
        "max-height 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), padding 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.4s ease-out";
      answer.style.paddingTop = "0";
      answer.style.paddingBottom = "0";
      answer.style.opacity = "0";

      // اگر آیتم در ابتدا باز است، استایل‌های آن را اعمال کنید
      if (item.open) {
        answer.style.maxHeight = "2000px"; // یک مقدار بزرگ برای اطمینان از اینکه همه محتوا جا شود
        answer.style.paddingTop = "1.6rem";
        answer.style.paddingBottom = "2.8rem";
        answer.style.opacity = "1";
      }
    }

    summary.addEventListener("click", (event) => {
      // جلوگیری از رفتن به لینک اگر کلیک روی یک لینک داخل summary باشد
      if (event.target.tagName === "A") {
        event.preventDefault();
        window.location.href = event.target.href;
        return;
      }

      event.preventDefault(); // جلوگیری از رفتار پیش‌فرض details/summary

      const wasAlreadyOpen = item.open;

      // افزودن افکت کلیک روی summary (پاداش فوری)
      summary.classList.add("faq-summary-clicked");
      // افزودن افکت جرقه به هنگام کلیک روی summary (میکرواینتراکشن، پاداش فوری)
      createSparkle(summary);

      setTimeout(() => {
        summary.classList.remove("faq-summary-clicked");
      }, 300);

      // بستن تمام FAQهای دیگر (کاهش بار شناختی)
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

            // تأخیر در بسته شدن واقعی details تا انیمیشن تکمیل شود
            setTimeout(() => {
              otherItem.open = false;
            }, 400);
          } else {
            otherItem.open = false;
            otherSummary.setAttribute("aria-expanded", "false");
          }
          // ردیابی رویداد با gtag و hj (در صورت وجود)
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

      // باز یا بسته کردن FAQ کلیک شده
      if (wasAlreadyOpen) {
        // اگر از قبل باز بود، آن را ببندید
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
        // اگر بسته بود، آن را باز کنید
        item.open = true;
        if (answer) {
          answer.style.maxHeight = "2000px"; // یک مقدار بزرگ برای انیمیشن max-height
          answer.style.paddingTop = "1.6rem";
          answer.style.paddingBottom = "2.8rem";
          answer.style.opacity = "1";
          summary.setAttribute("aria-expanded", "true");
        }

        // اسکرول به FAQ باز شده برای اطمینان از دید کامل آن (کاربردپذیری)
        setTimeout(() => {
          const navbarHeight =
            document.querySelector(".navbar")?.offsetHeight || 0;
          const offset = navbarHeight + 20; // فاصله از بالای نوار ناوبری

          const rect = item.getBoundingClientRect();
          const isTopObscured = rect.top < offset;
          const isBottomObscured = rect.bottom > window.innerHeight;

          if (isTopObscured || isBottomObscured) {
            item.scrollIntoView({ behavior: "smooth", block: "start" });

            // تنظیم دقیق موقعیت اسکرول پس از انیمیشن اولیه
            setTimeout(() => {
              const currentScrollY = window.scrollY;
              const currentRect = item.getBoundingClientRect();

              if (currentRect.top < offset) {
                window.scrollTo({
                  top: currentScrollY - (offset - currentRect.top),
                  behavior: "smooth",
                });
              }
            }, 100);
          }
        }, 600); // تأخیر برای اتمام انیمیشن باز شدن FAQ

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

  // مدیریت لینک‌های هش (hash) در FAQها هنگام بارگذاری صفحه
  window.addEventListener("DOMContentLoaded", () => {
    const hash = window.location.hash;
    if (hash) {
      const targetElement = document.querySelector(hash);
      if (targetElement && targetElement.classList.contains("faq-item")) {
        const targetSummary = targetElement.querySelector("summary");
        const targetAnswer = targetElement.querySelector("p");

        // بستن تمام FAQهای دیگر قبل از باز کردن مورد هدف
        faqItems.forEach((item) => {
          if (item !== targetElement && item.open) {
            item.open = false;
            const answer = item.querySelector("p");
            const summary = item.querySelector("summary");
            if (answer) {
              answer.style.maxHeight = "0px";
              answer.style.paddingTop = "0";
              answer.style.paddingBottom = "0";
              answer.style.opacity = "0";
            }
            if (summary) {
              summary.setAttribute("aria-expanded", "false");
            }
          }
        });

        // باز کردن FAQ هدف اگر بسته بود
        if (targetElement.open === false) {
          targetElement.open = true;
          if (targetAnswer) {
            targetAnswer.style.maxHeight = "2000px";
            targetAnswer.style.paddingTop = "1.6rem";
            targetAnswer.style.paddingBottom = "2.8rem";
            targetAnswer.style.opacity = "1";
          }
          if (targetSummary) {
            targetSummary.setAttribute("aria-expanded", "true");
          }

          // اسکرول به FAQ باز شده
          setTimeout(() => {
            const navbarHeight =
              document.querySelector(".navbar")?.offsetHeight || 0;
            const offset = navbarHeight + 20;

            const rect = targetElement.getBoundingClientRect();
            const isTopObscured = rect.top < offset;
            const isBottomObscured = rect.bottom > window.innerHeight;

            if (isTopObscured || isBottomObscured) {
              targetElement.scrollIntoView({ behavior: "smooth", block: "start" });

              setTimeout(() => {
                const currentScrollY = window.scrollY;
                const currentRect = targetElement.getBoundingClientRect();
                if (currentRect.top < offset) {
                  window.scrollTo({
                    top: currentScrollY - (offset - currentRect.top),
                    behavior: "smooth",
                  });
                }
              }, 100);
            }
          }, 100); // تأخیر کم برای اعمال استایل‌ها
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

    // استفاده از document.execCommand به عنوان fallback
    if (document.execCommand) {
      copyTextUsingExecCommand(email, "email-copy-toast", "ایمیل کپی شد. ✅");
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(email)
        .then(() => {
          createToast("ایمیل کپی شد. ✅", {
            id: "email-copy-toast",
            iconClass: "fas fa-check-circle",
            iconColor: "var(--highlight-color)",
            duration: 1800, // مدت زمان کوتاه‌تر برای بازخورد سریع‌تر
          });
        })
        .catch((err) => {
          console.error("Failed to copy email using Clipboard API:", err);
          createToast("کپی ایمیل با خطا مواجه شد.", {
            id: "copy-error-toast",
            iconClass: "fas fa-exclamation-triangle",
            iconColor: "red",
            duration: 3000,
          });
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
function copyTextUsingExecCommand(text, toastId, successMessage) {
  const tempInput = document.createElement("input");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);

  createToast(successMessage, {
    id: toastId,
    iconClass: "fas fa-check-circle",
    iconColor: "var(--highlight-color)",
    duration: 1800, // مدت زمان کوتاه‌تر برای بازخورد سریع‌تر
  });
}

// 14. افکت کنفتی (نورومارکتینگ، روان‌شناسی هیجانی، اثر پایان خوش)
function createConfetti() {
  const confettiContainer = document.createElement("div");
  confettiContainer.id = "confetti-container";
  document.body.appendChild(confettiContainer);

  const confettiCount = 50; // افزایش تعداد کنفتی برای حس جشن بیشتر
  const colors = ["#ffc107", "#007acc", "#005a9e", "#f0f0f0", "#e0a800", "#FF4081", "#64FFDA"]; // افزودن رنگ‌های بیشتر
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    // توزیع کنفتی از بالای صفحه
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = -Math.random() * 20 + "vh"; // شروع از کمی بالای صفحه
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
        duration: Math.random() * 2000 + 2000, // مدت زمان بیشتر برای سقوط آهسته‌تر
        easing: "ease-out",
        delay: Math.random() * 500, // تأخیر بیشتر برای پخش بهتر
        fill: "forwards",
      }
    );

    confetti.addEventListener("animationend", () => {
      confetti.remove();
    });
  }
  confettiContainer.appendChild(fragment);

  // حذف ظرف کنفتی پس از پایان انیمیشن‌ها
  setTimeout(() => {
    confettiContainer.remove();
  }, 4500); // کمی بیشتر از طولانی‌ترین انیمیشن کنفتی
}

// 15. پیام‌های "دانستنی جالب" (Fun Fact) (غافلگیری مثبت، تحریک دوپامین، حفظ توجه)
const funFacts = [
  "اولین ربات فارسی دیسکورد توسط من در ۱۴ سالگی توسعه یافت.",
  "من در کاراته دان ۱ رسمی فدراسیون هستم.",
  "فلسفه 'آنلیمیتد' به معنای به چالش کشیدن محدودیت‌هاست.",
  "من دانشجوی مهندسی پزشکی دانشگاه تهران هستم.",
  "پروژه‌های برنامه‌نویسی من در Zenodo نمایه شده‌اند و دارای DOI هستند.",
  "من به توسعه ابزارهای هوش مصنوعی کاربردی علاقه‌مندم.",
  "در اوقات فراغت، به مطالعه جدیدترین مقالات علمی می‌پردازم.",
  "هدف من ایجاد راه حل‌های تکنولوژیک با تأثیرگذاری اجتماعی است.",
];

let funFactToastInstance = null;
let idleTimeout;

const debouncedResetIdleTimer = debounce(resetIdleTimer, 500); // استفاده از debounce برای بهینه‌سازی

function resetIdleTimer() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    if (
      !funFactToastInstance || // اگر توست در حال نمایش نباشد
      !funFactToastInstance.classList.contains("show") || // اگر توست نمایش داده شده اما در حال محو شدن نیست
      funFactToastInstance.classList.contains("persistent-toast") // اگر توست persistent نیست
    ) {
      showFunFact();
    }
  }, 20000); // کمی کوتاه‌تر برای حفظ تازگی و جلوگیری از خستگی
}

// گوش دادن به رویدادهای تعامل کاربر برای ریست کردن تایمر عدم فعالیت
["mousemove", "keydown", "scroll", "touchstart"].forEach((event) => {
  if (event === "scroll" || event === "touchstart") {
    // برای اسکرول و تاچ، از passive: true برای بهبود عملکرد استفاده کنید
    window.addEventListener(event, debouncedResetIdleTimer, { passive: true });
  } else {
    window.addEventListener(event, debouncedResetIdleTimer);
  }
});

resetIdleTimer(); // راه‌اندازی اولیه تایمر

function showFunFact() {
  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
  funFactToastInstance = createToast(`دانستنی: ${randomFact}`, {
    id: "fun-fact-toast",
    customClass: "fun-fact-toast",
    iconClass: "fas fa-lightbulb",
    iconColor: "var(--primary-color)",
    position: "top",
    duration: 6000, // مدت زمان کمی بیشتر برای خوانایی
    closeButton: true, // اضافه کردن دکمه بستن
  });
}

// 16. فعال‌سازی افکت "جرقه" برای کارت‌های برجسته (نورواستتیک، توجه انتخابی)
function createSparkle(element) {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle-effect";
  const size = Math.random() * 10 + 5; // اندازه تصادفی بین 5 تا 15 پیکسل
  sparkle.style.width = `${size}px`;
  sparkle.style.height = `${size}px`;
  sparkle.style.left = `${Math.random() * 100}%`;
  sparkle.style.top = `${Math.random() * 100}%`;
  sparkle.style.backgroundColor = "white"; // رنگ سفید برای جرقه
  sparkle.style.opacity = 0;
  sparkle.style.position = "absolute";
  sparkle.style.borderRadius = "50%";
  sparkle.style.boxShadow = `0 0 ${size / 2}px ${
    size / 4
  }px var(--highlight-color)`; // درخشش اطراف جرقه
  sparkle.style.zIndex = 10;
  sparkle.style.pointerEvents = "none"; // اجازه می‌دهد روی عناصر زیرین کلیک شود

  element.style.position = "relative"; // برای موقعیت‌دهی absolute جرقه
  element.appendChild(sparkle);

  // انیمیشن جرقه
  sparkle.animate(
    [
      { opacity: 0, transform: "scale(0) rotate(0deg)" },
      { opacity: 1, transform: "scale(1) rotate(180deg)" },
      { opacity: 0, transform: "scale(0.5) rotate(360deg)" },
    ],
    {
      duration: 700, // مدت زمان کمی کوتاه‌تر برای حس زنده‌تر
      easing: "ease-out",
      fill: "forwards", // حفظ وضعیت نهایی انیمیشن
    }
  ).onfinish = () => sparkle.remove(); // حذف جرقه پس از اتمام انیمیشن
}

const featuredCards = document.querySelectorAll(".card.is-featured");
// IntersectionObserver برای فعال‌سازی جرقه زمانی که کارت‌های ویژه وارد دید می‌شوند
const featuredCardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // ایجاد چندین جرقه با تأخیر کم برای یک افکت پویا
        for (let i = 0; i < 3; i++) {
          setTimeout(() => createSparkle(entry.target), i * 150);
        }
        featuredCardObserver.unobserve(entry.target); // فقط یک بار برای هر کارت
      }
    });
  },
  { threshold: 0.5 } // وقتی 50% از کارت قابل مشاهده شد
);

// مشاهده هر کارت ویژه
featuredCards.forEach((card) => {
  featuredCardObserver.observe(card);
});

// 17. پیام پیشرفت "بخش‌های کاوش شده" (تحریک دوپامین، تعهد و ثبات، نقشه سفر کاربر)
const sections = document.querySelectorAll("section[id]");
const totalSections = sections.length;

// استفاده از localStorage برای حفظ وضعیت بازدید بخش‌ها و نقاط عطف
let sectionsVisited = new Set(
  JSON.parse(localStorage.getItem("sectionsVisited") || "[]")
);
let announcedMilestones = new Set(
  JSON.parse(localStorage.getItem("announcedMilestones") || "[]")
);

// تعریف نقاط عطف کاوش سایت
const explorationMilestones = [
  {
    count: Math.max(1, Math.ceil(totalSections * 0.25)), // حداقل 1 و 25%
    message: "شما ۲۵٪ از سایت را کاوش کرده‌اید! عالیه! ✨ ادامه دهید!",
    icon: "fas fa-map-marker-alt",
  },
  {
    count: Math.max(
      Math.ceil(totalSections * 0.25) + 1,
      Math.ceil(totalSections * 0.5)
    ), // حداقل بعد از 25% و 50%
    message: "نصف راه را پیمودید! شما ۵۰٪ از سایت را کاوش کرده‌اید! فوق‌العاده! 🚀",
    icon: "fas fa-rocket",
  },
  {
    count: Math.max(
      Math.ceil(totalSections * 0.5) + 1,
      Math.ceil(totalSections * 0.75)
    ), // حداقل بعد از 50% و 75%
    message: "به ۷۵٪ رسیدید! کم‌کم داریم به پایان می‌رسیم! 🌟",
    icon: "fas fa-star",
  },
  {
    count: totalSections, // نقطه عطف نهایی
    message: `تبریک! شما تمام ${totalSections} بخش سایت را کاوش کرده‌اید! شما یک کاوشگر واقعی هستید! 🎉`,
    isFinal: true,
    icon: "fas fa-trophy",
  },
];

// فیلتر کردن و مرتب‌سازی نقاط عطف برای جلوگیری از تکرار و اطمینان از ترتیب صحیح
const uniqueExplorationMilestones = [];
const counts = new Set();
explorationMilestones.forEach((milestone) => {
  if (milestone.count > 0 && !counts.has(milestone.count)) {
    uniqueExplorationMilestones.push(milestone);
    counts.add(milestone.count);
  }
});
uniqueExplorationMilestones.sort((a, b) => a.count - b.count);

let lastExplorationToastTime = 0;
const explorationToastCooldown = 8000; // زمان خنک‌کننده برای توست‌های پیشرفت

const sectionProgressObserver = new IntersectionObserver(
  (entries) => {
    const now = Date.now();

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // اضافه کردن بخش مشاهده شده به لیست بخش‌های بازدید شده
        sectionsVisited.add(entry.target.id);
        localStorage.setItem(
          "sectionsVisited",
          JSON.stringify(Array.from(sectionsVisited))
        );

        const currentSectionsCount = sectionsVisited.size;

        // بررسی و نمایش توست‌های نقاط عطف
        for (let i = 0; i < uniqueExplorationMilestones.length; i++) {
          const milestone = uniqueExplorationMilestones[i];

          if (
            currentSectionsCount >= milestone.count && // اگر تعداد بخش‌های بازدید شده به نقطه عطف رسید
            !announcedMilestones.has(milestone.count) && // و هنوز این نقطه عطف اعلام نشده باشد
            now - lastExplorationToastTime > explorationToastCooldown // و زمان خنک‌کننده سپری شده باشد
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

            lastExplorationToastTime = now; // به‌روزرسانی زمان آخرین توست

            // اگر نقطه عطف نهایی باشد، مشاهدهگر را قطع کنید
            if (milestone.isFinal) {
              sections.forEach((sec) => sectionProgressObserver.unobserve(sec));
              return; // از حلقه خارج شوید
            }
          }
        }
      }
    });
  },
  { threshold: 0.3 } // وقتی 30% از بخش قابل مشاهده شد
);

// مشاهده بخش‌ها فقط در صورتی که کاوش سایت هنوز کامل نشده باشد
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

// 19. بارگذاری تنبل تصاویر (روان‌شناسی ادراک، بار شناختی پایین، روان‌روانی)
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
          img.classList.add("loaded"); // افزودن کلاس برای انیمیشن فیدین
          observer.unobserve(img); // توقف مشاهده پس از بارگذاری
        }
      });
    },
    {
      rootMargin: "0px 0px 100px 0px", // شروع بارگذاری 100 پیکسل قبل از رسیدن به دید
      threshold: 0.01, // حتی اگر 1% از تصویر قابل مشاهده بود
    }
  );

  lazyImages.forEach((img) => {
    imageObserver.observe(img);
  });
});

// 20. دکمه بازگشت به بالا (کاربردپذیری، کاهش هزینه فرصت روانی)
const scrollToTopButton = document.createElement("button");
scrollToTopButton.id = "scroll-to-top";
scrollToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopButton.setAttribute("aria-label", "بازگشت به بالای صفحه");
document.body.appendChild(scrollToTopButton);

// تنظیمات اولیه برای انیمیشن (مخفی بودن)
scrollToTopButton.style.opacity = "0";
scrollToTopButton.style.transform = "translateY(20px)";
scrollToTopButton.style.transition =
  "opacity 0.3s ease-out, transform 0.3s ease-out";

scrollToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// 21. قابلیت کپی کردن لینک شبکه‌های اجتماعی (پاداش فوری، روان‌شناسی تعامل، اعتبار اجتماعی)
const connectLinksBlock = document.querySelector(".connect-links-block ul");
if (connectLinksBlock) {
  connectLinksBlock.addEventListener("click", function (e) {
    const socialLink = e.target.closest("a");
    if (socialLink && connectLinksBlock.contains(socialLink)) {
      if (socialLink.href && socialLink.href.startsWith("http")) {
        e.preventDefault(); // جلوگیری از رفتن به لینک

        const linkToCopy = socialLink.href;
        let linkName = socialLink.textContent.trim();
        // تلاش برای استخراج نام لینک از متن داخل <i>
        if (socialLink.querySelector("i")) {
          linkName = socialLink.querySelector("i").nextSibling
            ? socialLink.querySelector("i").nextSibling.textContent.trim()
            : linkName;
        }

        if (document.execCommand) {
          copyTextUsingExecCommand(
            linkToCopy,
            `social-link-copy-${linkName.replace(/\s/g, "")}`,
            `لینک ${linkName} کپی شد! ✅`
          );
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(linkToCopy)
            .then(() => {
              createToast(`لینک ${linkName} کپی شد! ✅`, {
                id: `social-link-copy-${linkName.replace(/\s/g, "")}`,
                iconClass: "fas fa-clipboard-check",
                iconColor: "var(--highlight-color)",
                duration: 1800, // مدت زمان کوتاه‌تر برای بازخورد سریع
              });
            })
            .catch((err) => {
              console.error("Failed to copy social link using Clipboard API:", err);
              createToast(`کپی لینک ${linkName} با خطا مواجه شد.`, {
                id: `social-link-copy-error-${linkName.replace(/\s/g, "")}`,
                iconClass: "fas fa-exclamation-triangle",
                iconColor: "red",
                duration: 3000,
              });
            });
        } else {
          createToast(
            `مرورگر شما از کپی کردن لینک ${linkName} پشتیبانی نمی‌کند.`,
            {
              id: `social-link-copy-error-${linkName.replace(/\s/g, "")}`,
              iconClass: "fas fa-exclamation-triangle",
              iconColor: "red",
              duration: 3000,
            }
          );
        }
      }
    }
  });
}

// --- ویژگی جدید: دکمه و قابلیت اشتراک‌گذاری صفحه (روان‌شناسی شناخت اجتماعی، کاهش هزینه فرصت روانی) ---
// این ویژگی به کاربر امکان می‌دهد تا به راحتی لینک صفحه فعلی را با دیگران به اشتراک بگذارد،
// که حس اعتبار اجتماعی و ارتباط را تقویت می‌کند.
const sharePageButton = document.createElement("button");
sharePageButton.id = "share-page-button";
sharePageButton.innerHTML = '<i class="fas fa-share-alt"></i>';
sharePageButton.setAttribute("aria-label", "اشتراک‌گذاری صفحه");
document.body.appendChild(sharePageButton);

// تنظیمات اولیه برای انیمیشن (مخفی بودن)
sharePageButton.style.opacity = "0";
sharePageButton.style.transform = "translateY(20px)";
sharePageButton.style.transition =
  "opacity 0.3s ease-out, transform 0.3s ease-out";
sharePageButton.style.position = "fixed";
sharePageButton.style.bottom = "140px"; // کمی بالاتر از دکمه اسکرول به بالا
sharePageButton.style.right = "20px";
sharePageButton.style.backgroundColor = "var(--accent-color)";
sharePageButton.style.color = "white";
sharePageButton.style.border = "none";
sharePageButton.style.borderRadius = "50%";
sharePageButton.style.width = "50px";
sharePageButton.style.height = "50px";
sharePageButton.style.display = "flex";
sharePageButton.style.justifyContent = "center";
sharePageButton.style.alignItems = "center";
sharePageButton.style.fontSize = "1.5rem";
sharePageButton.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
sharePageButton.style.cursor = "pointer";
sharePageButton.style.zIndex = "999";
sharePageButton.classList.add("cta-pulse-effect"); // افکت پالس برای جلب توجه

// نمایش/پنهان کردن دکمه اشتراک‌گذاری بر اساس اسکرول
window.addEventListener("scroll", () => {
  if (window.scrollY > 500) { // نمایش پس از اسکرول به پایین
    if (!sharePageButton.classList.contains("show")) {
      sharePageButton.classList.add("show");
      sharePageButton.style.opacity = "1";
      sharePageButton.style.transform = "translateY(0)";
    }
  } else {
    if (sharePageButton.classList.contains("show")) {
      sharePageButton.style.opacity = "0";
      sharePageButton.style.transform = "translateY(20px)";
      sharePageButton.addEventListener(
        "transitionend",
        function handler() {
          sharePageButton.classList.remove("show");
          sharePageButton.removeEventListener("transitionend", handler);
        },
        { once: true }
      );
    }
  }
});

sharePageButton.addEventListener("click", () => {
  const pageUrl = window.location.href;

  if (navigator.share) {
    // استفاده از Web Share API اگر پشتیبانی شود
    navigator.share({
      title: document.title,
      url: pageUrl,
    })
      .then(() => {
        createToast("لینک صفحه با موفقیت به اشتراک گذاشته شد! ✅", {
          id: "share-success-toast",
          iconClass: "fas fa-check-circle",
          iconColor: "var(--highlight-color)",
          duration: 2000,
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') { // AbortError یعنی کاربر کنسل کرده
          console.error("Failed to share:", error);
          createToast("اشتراک‌گذاری با خطا مواجه شد. 😔", {
            id: "share-error-toast",
            iconClass: "fas fa-exclamation-triangle",
            iconColor: "red",
            duration: 3000,
          });
        }
      });
  } else if (document.execCommand) {
    // Fallback برای کپی کردن لینک
    copyTextUsingExecCommand(pageUrl, "share-copy-toast", "لینک صفحه کپی شد! ✅");
  } else {
    // Fallback نهایی: اطلاع به کاربر که کپی پشتیبانی نمی‌شود
    createToast("مرورگر شما از اشتراک‌گذاری یا کپی کردن پشتیبانی نمی‌کند.", {
      id: "share-unsupported-toast",
      iconClass: "fas fa-exclamation-triangle",
      iconColor: "red",
      duration: 3000,
    });
  }
});


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
        const sectionTitle = entry.target.querySelector("h2, h3"); // عنوان بخش را پیدا کن
        if (sectionTitle) {
          // ایجاد یک افکت بصری کوچک، مثلاً یک پالس یا تغییر رنگ ظریف
          sectionTitle.classList.add("section-delight-effect");
          setTimeout(() => {
            sectionTitle.classList.remove("section-delight-effect");
          }, 1000); // مدت زمان افکت

          sectionsDelighted.add(entry.target.id);
          localStorage.setItem(
            "sectionsDelighted",
            JSON.stringify(Array.from(sectionsDelighted))
          );
        }
        observer.unobserve(entry.target); // فقط یک بار برای هر بخش
      }
    });
  },
  { threshold: 0.4 } // وقتی 40% از بخش قابل مشاهده شد
);

// مشاهده تمام بخش‌ها برای فعال‌سازی ویژگی "لحظه لذت"
sections.forEach((section) => {
  if (!sectionsDelighted.has(section.id)) {
    sectionDelightObserver.observe(section);
  }
});
