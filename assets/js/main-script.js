// main-script.js
// اسکریپت اصلی برای وبسایت رسمی رسول آنلیمیتد
// نویسنده: محمد رسول سهرابی (Rasoul Unlimited)

// این فایل جاوااسکریپت با در نظر گرفتن اصول روان‌شناسی تجربه کاربری، علوم شناختی،
// اقتصاد رفتاری، انسان‌شناسی دیجیتال و تحلیل رفتار مصرف‌کننده بهینه‌سازی شده است.
// هدف، ایجاد یک تجربه کاربری جذاب، قابل پیش‌بینی، پاداش‌دهنده و با بار شناختی پایین است.

// --- ابزارهای کمکی برای بهبود عملکرد (Performance Utilities) ---

/**
 * تابع throttle برای محدود کردن تعداد دفعات اجرای یک تابع در یک بازه زمانی مشخص.
 * این به بهبود عملکرد در رویدادهایی مانند اسکرول یا تغییر اندازه پنجره کمک می‌کند.
 * (اصل روان‌روانی و سهولت جریان، اصل بار شناختی پایین)
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
 * این به بهبود عملکرد در رویدادهایی مانند تغییر اندازه پنجره یا ورودی‌های تایپ شده کمک می‌کند.
 * (اصل روان‌روانی و سهولت جریان، اصل بار شناختی پایین)
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

// 1. به‌روزرسانی سال جاری در فوتر (اصل قابلیت پیش‌بینی، اصل کنترل و انتخاب)
// این بخش تضمین می‌کند که سال کپی‌رایت در پایین صفحه همیشه به‌روز باشد.
// با ارائه اطلاعات به‌روز و قابل پیش‌بینی، حس اطمینان و کنترل به کاربر منتقل می‌شود.
document.getElementById("current-year").textContent = new Date().getFullYear();

// 2. راه‌اندازی کتابخانه AOS (Animate On Scroll) (اصل کشف و پیش‌بینی، اصل پاداش فوری، اصل تضاد و تنوع حسی، اصل لذت زیبایی‌شناختی)
// AOS یک کتابخانه جاوااسکریپت برای افزودن انیمیشن‌های اسکرول به عناصر صفحه است.
// این کار باعث بهبود تجربه کاربری (UX) و جذابیت بصری سایت می‌شود.
// انیمیشن‌ها حس کشف و پاداش بصری را ایجاد می‌کنند و با تنوع حسی، توجه کاربر را جلب می‌کنند.
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
  duration: 800,
  easing: "ease",
  once: false,
  mirror: false,
  anchorPlacement: "top-bottom",
});

// 3. مدیریت تغییر تم (حالت روشن/تاریک) (اصل کنترل و انتخاب، اصل شخصی‌سازی، اصل پاداش فوری، اصل بازخورد آنی، اصل زیبایی‌شناسی، اصل انعکاس شخصیت کاربر)
// این قابلیت به کاربر امکان شخصی‌سازی تجربه بصری را می‌دهد که حس کنترل و تعلق را تقویت می‌کند.
// بازخورد آنی و زیبایی‌شناسی در تغییر تم، پاداش فوری را به همراه دارد.
const themeToggleInput = document.getElementById("theme-toggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme");

// تابع مرکزی برای نمایش پیام‌های Toast (اصل بازخورد آنی، اصل روان‌روانی و سهولت جریان، اصل بار شناختی پایین)
// این تابع به صورت مرکزی برای نمایش پیام‌های کوتاه و غیرمزاحم استفاده می‌شود.
// پیام‌های کوتاه و واضح، بار شناختی را کم کرده و جریان کاربری را حفظ می‌کنند.
// همچنین از تکرار پیام‌ها جلوگیری می‌کند و مدیریت بهتری برای موقعیت و ظاهر دارد.
function createToast(message, options = {}) {
  const defaultOptions = {
    duration: 3000,
    customClass: "",
    iconClass: "", // مثال: 'fas fa-info-circle'
    iconColor: "",
    position: "bottom", // 'top', 'bottom'
    isPersistent: false, // اگر true باشد، به صورت خودکار حذف نمی‌شود
    id: "", // برای شناسایی یکتای Toast و جلوگیری از تکرار
  };
  const settings = { ...defaultOptions, ...options };

  // اگر یک Toast با همین ID قبلاً نمایش داده شده و هنوز فعال است، آن را حذف نکن
  if (settings.id) {
    const existingToast = document.getElementById(settings.id);
    if (existingToast && existingToast.classList.contains("show")) {
      return; // Toast قبلاً نمایش داده شده و فعال است، پس تکرار نمی‌کنیم
    }
  }

  // حذف هر Toast دینامیک دیگری که ممکن است در حال نمایش باشد (غیر از persistent)
  document
    .querySelectorAll(".dynamic-toast:not(.persistent-toast)")
    .forEach((toast) => {
      if (toast.id !== settings.id) {
        // فقط Toastهای دیگر را حذف کن
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

  // موقعیت‌دهی Toast
  if (settings.position === "top") {
    dynamicToast.style.top = "20px";
    dynamicToast.style.bottom = "auto";
    dynamicToast.style.transform = "translateX(-50%) translateY(-150%)"; // شروع از بالا
  } else {
    // پیش‌فرض 'bottom'
    dynamicToast.style.bottom = "20px";
    dynamicToast.style.top = "auto";
    dynamicToast.style.transform = "translateX(-50%) translateY(150%)"; // شروع از پایین
  }

  // انیمیشن نمایش
  setTimeout(() => {
    dynamicToast.classList.add("show");
    dynamicToast.style.transform = "translateX(-50%) translateY(0)"; // حرکت به موقعیت نهایی
  }, 100);

  // پنهان شدن خودکار مگر اینکه isPersistent باشد
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
    dynamicToast.classList.add("persistent-toast"); // علامت‌گذاری به عنوان persistent
  }

  return dynamicToast; // برگرداندن المنت Toast برای مدیریت دستی در صورت نیاز
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
        id: "theme-change-toast", // ID یکتا برای این Toast
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

// 4. مدیریت اسکرول صاف برای لینک‌های ناوبری (Smooth Scroll) (اصل روان‌روانی و سهولت جریان، اصل زیبایی‌شناسی، اصل تلاش کم)
// اسکرول نرم، حرکت را طبیعی‌تر و دلپذیرتر می‌کند و بار شناختی را کاهش می‌دهد، زیرا کاربر نیازی به پردازش پرش‌های ناگهانی ندارد.
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

// 5. بازخورد بصری برای کلیک روی کارت‌ها (اصل پاداش فوری و مثبت، اصل نشانه‌های تعاملی، اصل جذابیت بصری و ظاهری، اصل برانگیختگی هیجانی)
// بهینه‌سازی: استفاده از Event Delegation برای مدیریت کلیک روی کارت‌ها
// به جای افزودن شنونده رویداد به هر کارت، یک شنونده به والد مشترک اضافه می‌کنیم.
// این کار تعداد شنونده‌های رویداد در DOM را کاهش می‌دهد و حافظه را بهینه‌سازی می‌کند.
document.addEventListener("click", function (event) {
  const card = event.target.closest(".card");
  if (card) {
    card.classList.add("clicked-pop");
    setTimeout(() => {
      card.classList.remove("clicked-pop");
    }, 300);
  }
});

// 6. نوار پیشرفت اسکرول (اصل پیشرفت قابل مشاهده، اصل حس موفقیت، اصل تأخیر معنادار پاداش، اصل بار شناختی پایین)
// نوار پیشرفت، وضعیت کاربر را به صورت بصری نشان می‌دهد و حس پیشرفت را القا می‌کند.
// این کار بار شناختی را کاهش می‌دهد زیرا کاربر نیازی به حدس زدن موقعیت خود در صفحه ندارد.
const scrollProgressBar = document.createElement("div");
scrollProgressBar.id = "scroll-progress-bar";
document.body.prepend(scrollProgressBar);

let lastScrollY = 0;
let ticking = false;
let hasReachedEndOfPageSession = false; // پرچم برای اطمینان از نمایش یک بار در هر جلسه

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

  // به‌روزرسانی وضعیت دکمه بازگشت به بالا
  if (lastScrollY > 300) {
    scrollToTopButton.classList.add("show");
  } else {
    scrollToTopButton.classList.remove("show");
  }

  // 12. جشن اتمام صفحه (اصل اثر پایان خوش، اصل حس موفقیت، اصل جذابیت بصری و ظاهری، اصل پاداش دوپامینی)
  // این بخش یک حس مثبت قوی در پایان تجربه کاربری ایجاد می‌کند و با افکت کنفتی، یک پاداش بصری و هیجانی ارائه می‌دهد.
  // این کار باعث می‌شود کاربر با حس خوبی صفحه را ترک کند و احتمال بازگشتش بیشتر شود.
  // هماهنگ شده با سیستم ردیابی پیشرفت بخش ۱۷.
  // اگر کاربر به انتهای صفحه رسیده باشد و پیام پایان صفحه هنوز در این جلسه نمایش داده نشده باشد
  if (
    window.innerHeight + lastScrollY >= document.body.offsetHeight &&
    !hasReachedEndOfPageSession
  ) {
    createToast("شما به انتهای صفحه رسیدید. از بازدید شما سپاسگزارم. 🎉", {
      id: "end-of-page-toast", // ID یکتا
      customClass: "end-of-page-toast",
      iconClass: "fas fa-flag-checkered", // آیکون پایان
      iconColor: "var(--highlight-color)",
      duration: 4000,
    });
    hasReachedEndOfPageSession = true; // پیام پایان صفحه برای این جلسه نمایش داده شد

    // وقتی کاربر به انتهای صفحه می‌رسد، مطمئن می‌شویم که نقطه عطف نهایی کاوش نیز ثبت و اعلام شود
    // این کار از تکرار پیام‌های میانی پیشرفت جلوگیری می‌کند
    if (!announcedMilestones.has(totalSections)) {
      announcedMilestones.add(totalSections);
      localStorage.setItem(
        "announcedMilestones",
        JSON.stringify(Array.from(announcedMilestones))
      );
      // از unobserve کردن در اینجا مطمئن می‌شویم تا دیگر پیام‌های پیشرفت ظاهر نشوند
      sections.forEach((sec) => sectionProgressObserver.unobserve(sec));
    }

    // ایجاد افکت کنفتی پس از کمی تأخیر برای هماهنگی با Toast
    setTimeout(() => {
      createConfetti();
    }, 3500); // کمی قبل از ناپدید شدن Toast
  }
  ticking = false;
}

// بهینه‌سازی: استفاده از requestAnimationFrame برای رویداد اسکرول و افزودن passive listener
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
); // افزودن { passive: true }


// 7. Hint برای کاوش بیشتر (اصل کشف و پیش‌بینی، اصل کنجکاوی و رمزآلود بودن، اصل انتظارات مثبت، اصل توجه)
// این المان کوچک، کنجکاوی کاربر را برمی‌انگیزد و او را به کاوش بخش‌های جدید تشویق می‌کند.
// این یک نشانه بصری ظریف برای هدایت توجه است.
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
        // اگر کاربر وارد بخش Hero شد، تایمر را برای نمایش hint شروع کن
        if (!hintVisible) {
          hintTimeout = setTimeout(() => {
            exploreHint.style.transition =
              "opacity 0.5s ease-out, transform 0.5s ease-out";
            exploreHint.style.opacity = "1";
            exploreHint.style.transform = "translateY(0)";
            hintVisible = true;
          }, 8000); // نمایش پس از 8 ثانیه در بخش Hero
        }
      } else {
        // اگر کاربر از بخش Hero خارج شد، hint را پنهان کن و تایمر را پاک کن
        clearTimeout(hintTimeout);
        if (hintVisible) {
          exploreHint.style.opacity = "0";
          exploreHint.style.transform = "translateY(20px)";
          hintVisible = false;
        }
      }
    });
  },
  { threshold: 0.5 }
); // وقتی 50% از Hero قابل مشاهده باشد

if (heroSection) {
  heroObserver.observe(heroSection);
}

exploreHint.addEventListener("click", (e) => {
  e.preventDefault();
  exploreHint.style.opacity = "0";
  exploreHint.style.transform = "translateY(20px)";
  hintVisible = false; // Reset state
  window.scrollTo({
    top:
      document.querySelector("#projects").offsetTop -
      (document.querySelector(".navbar")?.offsetHeight || 0),
    behavior: "smooth",
  });
});

// 8. پیام‌های پاداش متغیر برای مهارت‌ها (اصل تأخیر معنادار پاداش، اصل کنجکاوی و رمزآلود بودن، اصل لذت از تسلط، اصل پاداش دوپامینی)
// بهینه‌سازی: استفاده از Event Delegation برای مدیریت هاور روی مهارت‌ها
// به جای افزودن شنونده رویداد به هر آیتم مهارت، یک شنونده به والد مشترک (#skills .skills-list) اضافه می‌کنیم.
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
      // اگر پیام قبلی وجود دارد و برای یک آیتم دیگر است، آن را پنهان کن
      if (
        currentSkillMessageSpan &&
        currentSkillMessageSpan.parentElement !== skillItem
      ) {
        clearTimeout(hideTimeoutForSkill);
        currentSkillMessageSpan.style.opacity = "0";
        currentSkillMessageSpan.style.transform = "translateY(0)";
        currentSkillMessageSpan = null;
      }

      // اگر آیتم فعلی هنوز پیام ندارد، آن را ایجاد کن
      let messageSpan = skillItem.querySelector(".skill-hover-message");
      if (!messageSpan) {
        messageSpan = document.createElement("span");
        messageSpan.className = "skill-hover-message";
        skillItem.appendChild(messageSpan);
      }
      currentSkillMessageSpan = messageSpan;

      clearTimeout(hideTimeoutForSkill); // Clear any pending hide
      const randomMessage =
        skillMessages[Math.floor(Math.random() * skillMessages.length)];
      messageSpan.textContent = randomMessage;
      messageSpan.style.opacity = "1";
      messageSpan.style.transform = "translateY(-5px)";
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
        }, 200); // Small delay, e.g., 200ms
      }
    }
  });
}

// 10. بازخورد برای باز شدن FAQ (اصل بازخورد آنی، اصل کشف و پیش‌بینی، اصل تلاش کم)
// بهینه‌سازی: استفاده از Event Delegation برای مدیریت باز شدن FAQ
// به جای افزودن شنونده رویداد به هر summary، یک شنونده به والد مشترک (.faq-container) اضافه می‌کنیم.
const faqContainer = document.querySelector(".faq-container");
const faqItems = document.querySelectorAll(".faq-item"); // Get all FAQ items

if (faqContainer) {
  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector("p"); // Assuming answer content is directly within a <p> tag inside <details>
    const questionId =
      item.dataset.questionId || summary.textContent.trim().substring(0, 50); // Fallback ID

    // Initial state for smooth animation
    if (answer) {
      answer.style.maxHeight = "0px";
      answer.style.overflow = "hidden";
      answer.style.transition =
        "max-height 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), padding 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.4s ease-out";
      answer.style.paddingTop = "0";
      answer.style.paddingBottom = "0";
      answer.style.opacity = "0";

      // Check initial open state (for cases where details is open on load or after search)
      if (item.open) {
        answer.style.maxHeight = "1000px"; // Set to a large value to ensure content fits
        answer.style.paddingTop = "1.6rem";
        answer.style.paddingBottom = "2.8rem";
        answer.style.opacity = "1";
      }
    }

    summary.addEventListener("click", (event) => {
      // Prevent default toggle behavior if it's an interactive element inside summary (e.g., a link)
      if (event.target.tagName === "A") {
        event.preventDefault();
        window.location.href = event.target.href;
        return;
      }

      event.preventDefault(); // Prevent default details toggle to manage animation manually

      const wasAlreadyOpen = item.open; // Check current state BEFORE toggling

      // Add pop effect to the clicked summary
      summary.classList.add("faq-summary-clicked");
      setTimeout(() => {
        summary.classList.remove("faq-summary-clicked");
      }, 300); // Match CSS transition duration

      faqItems.forEach((otherItem) => {
        // Close other items if they are currently open AND not the clicked item
        if (otherItem !== item && otherItem.open) {
          const otherAnswer = otherItem.querySelector("p");
          if (otherAnswer) {
            otherAnswer.style.maxHeight = "0px";
            otherAnswer.style.paddingTop = "0";
            otherAnswer.style.paddingBottom = "0";
            otherAnswer.style.opacity = "0";
            // Set open to false after transition for smooth closing
            setTimeout(() => {
              otherItem.open = false;
            }, 400); // Match CSS transition duration
          } else {
            otherItem.open = false; // Fallback if no answer element
          }
          // Optional: Track auto-collapse for analytics
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
        // If it was open and user clicked to close it
        if (answer) {
          answer.style.maxHeight = "0px";
          answer.style.paddingTop = "0";
          answer.style.paddingBottom = "0";
          answer.style.opacity = "0";
          setTimeout(() => {
            item.open = false;
          }, 400); // Match CSS transition duration
        } else {
          item.open = false; // Fallback if no answer element
        }

        // GA4 Event: Track FAQ collapse
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
        // If it was closed and user clicked to open it
        item.open = true; // Set open immediately to apply summary styles
        if (answer) {
          answer.style.maxHeight = "1000px"; // Set to a large value to ensure content fits
          answer.style.paddingTop = "1.6rem";
          answer.style.paddingBottom = "2.8rem";
          answer.style.opacity = "1";
        }

        // For accessibility and better UX, scroll to the opened item if it's off-screen
        setTimeout(() => {
          const rect = item.getBoundingClientRect();
          // Check if top is above viewport OR bottom is below viewport (partially or fully off screen)
          // Consider navbar height for accurate scrolling
          const navbarHeight =
            document.querySelector(".navbar")?.offsetHeight || 0;
          if (rect.top < navbarHeight || rect.bottom > window.innerHeight) {
            window.scrollTo({
              top: item.offsetTop - navbarHeight - 20, // Add a small offset for breathing room
              behavior: "smooth",
            });
          }
        }, 450); // Delay slightly after animation starts

        // GA4 Event: Track FAQ expand
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
}

// 11. پیام خوش‌آمدگویی برای کاربران جدید/بازگشتی (اصل شخصی‌سازی، اصل تعلق و ارتباط، اصل هویت و شأن فردی، اصل هم‌ذات‌پنداری)
// این پیام برای ایجاد حس شخصی‌سازی و تعلق خاطر در کاربر طراحی شده است.
// تشخیص کاربر جدید/بازگشتی، حس احترام و درک متقابل را منتقل می‌کند.
// از createToast برای نمایش پیام استفاده می‌شود.
window.addEventListener("load", () => {
  const hasVisited = localStorage.getItem("hasVisited");
  let message = "";

  if (hasVisited) {
    message = "خوش آمدید! از بازگشت شما خرسندیم."; // پیام دلنشین‌تر برای بازگشتی‌ها
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
      id: "welcome-toast", // ID یکتا
      customClass: "welcome-toast",
      iconClass: "fas fa-hand-sparkles", // آیکون خوش‌آمدگویی
      iconColor: "var(--highlight-color)",
      duration: 3500,
    });
  }
});

// 13. بازخورد برای کپی ایمیل (اصل بازخورد آنی، اصل پاداش فوری، اصل نشانه‌های تعاملی، اصل تلاش کم)
// ارائه بازخورد فوری و واضح برای یک عمل مهم، به کاربر اطمینان می‌دهد که عملش موفقیت‌آمیز بوده است.
// این کار بار شناختی را کاهش می‌دهد و حس کارآمدی را منتقل می‌کند.
const emailLink = document.querySelector('.contact-info a[href^="mailto:"]');
if (emailLink) {
  emailLink.addEventListener("click", (e) => {
    e.preventDefault(); // جلوگیری از باز شدن ایمیل کلاینت
    const email = emailLink.href.replace("mailto:", "");

    // استفاده از Clipboard API برای کپی کردن متن (مدرن‌تر و امن‌تر)
    // در محیط‌های iframe ممکن است نیاز به fallback به execCommand باشد.
    if (document.execCommand) { // Check for execCommand support first for broader compatibility
      copyTextUsingExecCommand(email, "email-copy-toast");
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(email)
        .then(() => {
          createToast("ایمیل کپی شد. ✅", {
            id: "email-copy-toast", // ID یکتا
            iconClass: "fas fa-check-circle",
            iconColor: "var(--highlight-color)",
          });
        })
        .catch((err) => {
          console.error("Failed to copy email using Clipboard API:", err);
          // Fallback to execCommand if Clipboard API fails (though execCommand is checked first now)
          // This catch block might not be reached if execCommand is used first.
        });
    } else {
      // Fallback for very old browsers or environments without any copy method
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
  document.execCommand("copy"); // کپی کردن متن
  document.body.removeChild(tempInput);

  createToast("ایمیل کپی شد. ✅", {
    id: toastId, // ID یکتا
    iconClass: "fas fa-check-circle",
    iconColor: "var(--highlight-color)",
  });
}

// 14. افکت کنفتی (اصل اثر پایان خوش، اصل حس موفقیت، اصل جذابیت بصری و ظاهری)
// این تابع افکت بصری کنفتی را برای جشن گرفتن اتمام صفحه ایجاد می‌کند.
// این یک پاداش هیجانی قوی است که تجربه کاربری را به یاد ماندنی می‌کند.
// بهینه‌سازی: استفاده از DocumentFragment برای کاهش دستکاری‌های DOM
function createConfetti() {
  const confettiContainer = document.createElement("div");
  confettiContainer.id = "confetti-container";
  document.body.appendChild(confettiContainer);

  const confettiCount = 30; // کاهش تعداد کنفتی برای حس حرفه‌ای‌تر و ظریف‌تر
  const colors = ["#ffc107", "#007acc", "#005a9e", "#f0f0f0"]; // رنگ‌های تم سایت
  const fragment = document.createDocumentFragment(); // ایجاد DocumentFragment

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = Math.random() * 100 + "vh";
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    fragment.appendChild(confetti); // اضافه کردن به DocumentFragment

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
        }, // سقوط کمتر
      ],
      {
        duration: Math.random() * 2000 + 1500, // 1.5 تا 3.5 ثانیه
        easing: "ease-out",
        delay: Math.random() * 300,
        fill: "forwards",
      }
    );

    confetti.addEventListener("animationend", () => {
      confetti.remove();
    });
  }
  confettiContainer.appendChild(fragment); // یک بار اضافه کردن تمام کنفتی‌ها به DOM

  setTimeout(() => {
    confettiContainer.remove();
  }, 3600); // کمی بیشتر از طولانی‌ترین انیمیشن کنفتی
}

// 15. پیام‌های "دانستنی جالب" (Fun Fact) (اصل کنجکاوی و رمزآلود بودن، اصل تضاد و تنوع حسی، اصل تأخیر معنادار پاداش، اصل توجه، اصل حافظه هیجانی)
// این بخش پیام‌های تصادفی با دانستنی‌های جالب را در زمان‌های غیرقابل پیش‌بینی و با فرکانس کمتر نمایش می‌دهد.
// این عناصر غیرمنتظره، کنجکاوی را برمی‌انگیزند و به دلیل تازگی، توجه را جلب می‌کنند و به ماندگاری در حافظه کمک می‌کنند.
const funFacts = [
  "اولین ربات فارسی دیسکورد توسط من در ۱۴ سالگی توسعه یافت.",
  "من در کاراته دان ۱ رسمی فدراسیون هستم.",
  "فلسفه 'آنلیمیتد' به معنای به چالش کشیدن محدودیت‌هاست.",
  "من دانشجوی مهندسی پزشکی دانشگاه تهران هستم.",
  "پروژه‌های برنامه‌نویسی من در Zenodo نمایه شده‌اند و دارای DOI هستند.",
];

let funFactToastInstance = null; // برای نگهداری رفرنس Toast دانستنی
let idleTimeout;

// بهینه‌سازی: استفاده از debounce برای resetIdleTimer
const debouncedResetIdleTimer = debounce(resetIdleTimer, 500); // 500ms تأخیر برای ریست تایمر

function resetIdleTimer() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    // فقط اگر Toast دانستنی فعال نیست، آن را نمایش بده
    if (
      !funFactToastInstance ||
      !funFactToastInstance.classList.contains("show")
    ) {
      showFunFact();
    }
  }, 30000); // کاربر پس از 30 ثانیه عدم فعالیت، بیکار محسوب می‌شود
}

// رویدادهای فعالیت کاربر
["mousemove", "keydown", "scroll", "touchstart"].forEach((event) => {
  // بهینه‌سازی: افزودن { passive: true } به رویدادهای scroll و touchstart
  if (event === "scroll" || event === "touchstart") {
    window.addEventListener(event, debouncedResetIdleTimer, { passive: true });
  } else {
    window.addEventListener(event, debouncedResetIdleTimer);
  }
});

// شروع اولیه تایمر بیکاری
resetIdleTimer();

function showFunFact() {
  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
  funFactToastInstance = createToast(`دانستنی: ${randomFact}`, {
    id: "fun-fact-toast", // ID یکتا
    customClass: "fun-fact-toast",
    iconClass: "fas fa-lightbulb",
    iconColor: "var(--primary-color)",
    position: "top",
    duration: 8000,
  });

  // افزودن دکمه بستن به صورت دستی (چون innerHTML مستقیم نیست)
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
      funFactToastInstance = null; // پاک کردن رفرنس
      resetIdleTimer(); // پس از بستن دستی، تایمر بیکاری را ریست کن
    },
    { once: true }
  );
}

// 16. فعال‌سازی افکت "جرقه" برای کارت‌های برجسته (روان‌شناسی توجه، پاداش دوپامینی، لذت زیبایی‌شناختی)
// این افکت بصری ظریف، توجه کاربر را به محتوای مهم‌تر جلب می‌کند و یک پاداش بصری کوچک ارائه می‌دهد.
function createSparkle(element) {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle-effect";
  const size = Math.random() * 10 + 5; // اندازه بین 5 تا 15 پیکسل
  sparkle.style.width = `${size}px`;
  sparkle.style.height = `${size}px`;
  sparkle.style.left = `${Math.random() * 100}%`;
  sparkle.style.top = `${Math.random() * 100}%`;
  sparkle.style.backgroundColor = "white"; // رنگ درخشش
  sparkle.style.opacity = 0;
  sparkle.style.position = "absolute";
  sparkle.style.borderRadius = "50%";
  sparkle.style.boxShadow = `0 0 ${size / 2}px ${
    size / 4
  }px var(--highlight-color)`; // درخشش اطراف
  sparkle.style.zIndex = 10;
  sparkle.style.pointerEvents = "none"; // برای اینکه روی کلیک تداخلی ایجاد نکند

  element.style.position = "relative"; // اطمینان از موقعیت‌دهی صحیح
  element.appendChild(sparkle);

  sparkle.animate(
    [
      { opacity: 0, transform: "scale(0) rotate(0deg)" },
      { opacity: 1, transform: "scale(1) rotate(180deg)" },
      { opacity: 0, transform: "scale(0.5) rotate(360deg)" },
    ],
    {
      duration: 800, // مدت زمان انیمیشن
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
        // ایجاد چند جرقه در نقاط مختلف کارت
        for (let i = 0; i < 3; i++) {
          // 3 جرقه برای هر کارت
          setTimeout(() => createSparkle(entry.target), i * 150); // با کمی تأخیر
        }
        featuredCardObserver.unobserve(entry.target); // فقط یک بار جرقه بزند
      }
    });
  },
  { threshold: 0.5 }
); // وقتی 50% از کارت قابل مشاهده باشد

featuredCards.forEach((card) => {
  featuredCardObserver.observe(card);
});

// 17. پیام پیشرفت "بخش‌های کاوش شده" (اصل پیشرفت قابل مشاهده، اصل حس موفقیت، انگیزه درونی)
// این قابلیت به کاربر حس پیشرفت و موفقیت در کاوش سایت را می‌دهد و انگیزه او را برای ادامه افزایش می‌دهد.
const sections = document.querySelectorAll("section[id]");
const totalSections = sections.length; // تعداد کل بخش‌های سایت بر اساس المنت‌های موجود در DOM

// بارگذاری وضعیت از localStorage برای پایداری
let sectionsVisited = new Set(
  JSON.parse(localStorage.getItem("sectionsVisited") || "[]")
);
let announcedMilestones = new Set(
  JSON.parse(localStorage.getItem("announcedMilestones") || "[]")
);

// نقاط عطف برای نمایش پیام پیشرفت
const explorationMilestones = [
  {
    count: 3,
    message: "شما ۳ بخش از سایت را کاوش کرده‌اید! عالیه! ✨ ادامه دهید!",
    icon: "fas fa-map-marker-alt",
  },
  {
    count: 6,
    message: "نصف راه را پیمودید! شما ۶ بخش را کاوش کرده‌اید! فوق‌العاده! 🚀",
    icon: "fas fa-rocket",
  },
  {
    count: 9,
    message: "به ۹ بخش رسیدید! کم‌کم داریم به پایان می‌رسیم! 🌟",
    icon: "fas fa-star",
  },
  {
    count: totalSections,
    message: `تبریک! شما تمام ${totalSections} بخش سایت را کاوش کرده‌اید! شما یک کاوشگر واقعی هستید! 🎉`,
    isFinal: true,
    icon: "fas fa-trophy",
  },
];

let lastExplorationToastTime = 0;
const explorationToastCooldown = 10000; // 10 ثانیه مکث بین پیام‌های پیشرفت

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

        // بررسی نقاط عطف
        // پیمایش از کوچکترین نقطه عطف تا بزرگترین
        for (let i = 0; i < explorationMilestones.length; i++) {
          const milestone = explorationMilestones[i];

          // اگر تعداد بخش‌های کاوش شده به این نقطه عطف رسیده باشد
          // و این نقطه عطف هنوز اعلام نشده باشد (در announcedMilestones نباشد)
          // و زمان کافی از آخرین نمایش پیام گذشته باشد
          if (
            currentSectionsCount >= milestone.count &&
            !announcedMilestones.has(milestone.count) &&
            now - lastExplorationToastTime > explorationToastCooldown
          ) {
            let customClass = "exploration-toast";
            let iconColor = "var(--accent-color)"; // رنگ پیش‌فرض آیکون
            if (milestone.isFinal) {
              customClass += " final-exploration-toast";
              iconColor = "var(--primary-color)"; // رنگ آیکون برای پیام نهایی
            }

            createToast(milestone.message, {
              id: `exploration-milestone-${milestone.count}`, // ID یکتا برای هر نقطه عطف
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

            // اگر این نقطه عطف نهایی باشد، Observer را از تمام بخش‌ها جدا می‌کنیم
            // این کار باعث می‌شود پس از اتمام کاوش، دیگر نیازی به ردیابی نباشد.
            if (milestone.isFinal) {
              sections.forEach((sec) => sectionProgressObserver.unobserve(sec));
              return; // از حلقه و از تابع callback خارج می‌شویم
            }
          }
        }
      }
    });
  },
  { threshold: 0.3 }
); // وقتی 30% از بخش قابل مشاهده باشد

// در زمان بارگذاری صفحه، Observer را به تمام بخش‌ها متصل می‌کنیم
// اما فقط در صورتی که پیام نهایی کاوش قبلاً نمایش داده نشده باشد.
const isAllSectionsExploredPreviously = announcedMilestones.has(totalSections);
if (!isAllSectionsExploredPreviously) {
  sections.forEach((section) => {
    sectionProgressObserver.observe(section);
  });
} else {
  // اگر قبلاً تمام بخش‌ها کاوش شده‌اند، می‌توانیم یک پیام خوش‌آمدگویی متفاوت نمایش دهیم
  // یا هیچ پیامی نمایش ندهیم. در اینجا، فرض می‌کنیم نیازی به اعلام مجدد نیست.
  // اگر می‌خواهید هر بار که کاربر برمی‌گردد پیام نهایی را ببیند، می‌توانید خط زیر را فعال کنید:
  // createToast(`خوش آمدید! شما قبلاً تمام ${totalSections} بخش سایت را کاوش کرده‌اید! 🎉`, {
  //    id: 're-welcome-explored-toast',
  //    customClass: 'exploration-toast final-exploration-toast',
  //    iconClass: 'fas fa-trophy',
  //    iconColor: 'var(--primary-color)',
  //    duration: 5000
  // });
}

// 18. افکت پالس/گلو برای دکمه‌های CTA اصلی (روان‌شناسی توجه، پاداش دوپامینی)
// این انیمیشن‌های ظریف، دکمه‌های اصلی را برجسته‌تر کرده و کاربر را به کلیک تشویق می‌کنند.
// این یک پاداش بصری برای جلب توجه است.
const mainCTAs = document.querySelectorAll(".main-cta-button"); // فرض بر وجود کلاسی به این نام برای دکمه‌های اصلی

mainCTAs.forEach((button) => {
  // اضافه کردن یک کلاس برای انیمیشن CSS
  button.classList.add("cta-pulse-effect");
});

// 19. بارگذاری تنبل تصاویر (Lazy Loading) (اصل بار شناختی پایین، اصل سرعت بارگذاری، اصل روان‌روانی)
// این بخش تصاویر را تنها زمانی بارگذاری می‌کند که به viewport نزدیک شوند تا عملکرد و تجربه کاربری بهبود یابد.
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
          img.classList.add("loaded"); // اضافه کردن کلاس برای انیمیشن یا استایل پس از بارگذاری
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: "0px 0px 100px 0px", // بارگذاری 100px قبل از رسیدن به viewport
      threshold: 0.01, // حتی اگر 1% از تصویر قابل مشاهده باشد
    }
  );

  lazyImages.forEach((img) => {
    imageObserver.observe(img);
  });
});

// 20. دکمه بازگشت به بالا (Scroll-to-Top Button) (اصل سهولت و تلاش کم، اصل قابلیت پیش‌بینی)
// این دکمه به کاربر کمک می‌کند تا به راحتی و با تلاش کم به بالای صفحه بازگردد، به خصوص در صفحات طولانی.
const scrollToTopButton = document.createElement("button");
scrollToTopButton.id = "scroll-to-top";
scrollToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopButton.setAttribute("aria-label", "بازگشت به بالای صفحه");
document.body.appendChild(scrollToTopButton);

scrollToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// 21. قابلیت کپی کردن لینک شبکه‌های اجتماعی (اصل بازخورد آنی، اصل تلاش کم)
// این قابلیت به کاربر اجازه می‌دهد تا با یک کلیک، لینک شبکه‌های اجتماعی را کپی کند،
// که باعث افزایش راحتی و کاهش تلاش برای به اشتراک‌گذاری می‌شود.
// بهینه‌سازی: استفاده از Event Delegation برای مدیریت کلیک روی لینک‌های شبکه‌های اجتماعی
const connectLinksBlock = document.querySelector(".connect-links-block ul");
if (connectLinksBlock) {
  connectLinksBlock.addEventListener("click", function (e) {
    const socialLink = e.target.closest("a");
    if (socialLink && connectLinksBlock.contains(socialLink)) {
      // فقط در صورتی که لینک به یک صفحه خارجی باشد و نه یک # (لینک داخلی)
      if (socialLink.href && socialLink.href.startsWith("http")) {
        e.preventDefault(); // جلوگیری از باز شدن لینک در تب جدید

        const linkToCopy = socialLink.href;

        // استفاده از Clipboard API برای کپی کردن متن (مدرن‌تر و امن‌تر)
        if (document.execCommand) { // Check for execCommand support first for broader compatibility
          let linkName = socialLink.textContent.trim();
          if (socialLink.querySelector("i")) {
            linkName = socialLink
              .querySelector("i")
              .nextSibling.textContent.trim(); // گرفتن متن بعد از آیکون
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
                  .nextSibling.textContent.trim(); // گرفتن متن بعد از آیکون
              }
              createToast(`لینک ${linkName} کپی شد! ✅`, {
                id: `social-link-copy-${linkName.replace(/\s/g, "")}`, // ID یکتا
                iconClass: "fas fa-clipboard-check",
                iconColor: "var(--highlight-color)",
              });
            })
            .catch((err) => {
              console.error(
                "Failed to copy social link using Clipboard API:",
                err
              );
              // Fallback to execCommand if Clipboard API fails (though execCommand is checked first now)
            });
        } else {
          // Fallback for very old browsers or environments without any copy method
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