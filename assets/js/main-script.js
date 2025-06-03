// main-script.js
// اسکریپت اصلی برای وبسایت رسمی رسول آنلیمیتد
// نویسنده: محمد رسول سهرابی (Rasoul Unlimited)

// این فایل جاوااسکریپت با در نظر گرفتن اصول روان‌شناسی تجربه کاربری، علوم شناختی،
// اقتصاد رفتاری، انسان‌شناسی دیجیتال و تحلیل رفتار مصرف‌کننده بهینه‌سازی شده است.
// هدف، ایجاد یک تجربه کاربری جذاب، قابل پیش‌بینی، پاداش‌دهنده و با بار شناختی پایین است.

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
  delay: 0,
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
const themeToast = document.createElement('div');
themeToast.id = 'theme-toast';
themeToast.setAttribute('role', 'status');
themeToast.setAttribute('aria-live', 'polite');
document.body.appendChild(themeToast);

function applyTheme(theme, showToast = false) {
  document.body.classList.toggle("dark-mode", theme === "dark");
  document.body.classList.toggle("light-mode", theme === "light");
  themeToggleInput.checked = theme === "dark";

  if (showToast) {
    themeToast.textContent = `تم به حالت ${theme === 'dark' ? 'تاریک' : 'روشن'} تغییر یافت.`;
    themeToast.classList.add("show");
    setTimeout(() => {
      themeToast.classList.remove("show");
    }, 3000);
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
        top: targetElement.offsetTop - (document.querySelector('.navbar')?.offsetHeight || 0),
        behavior: "smooth",
      });
    }
  });
});

// 5. بازخورد بصری برای کلیک روی کارت‌ها (اصل پاداش فوری و مثبت، اصل نشانه‌های تعاملی، اصل جذابیت بصری و ظاهری، اصل برانگیختگی هیجانی)
// انیمیشن کوچک پس از کلیک، یک پاداش بصری فوری و مثبت است که تعامل کاربر را تقویت می‌کند.
// این کار حس لذت و تعامل را افزایش می‌دهد.
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", function () {
    this.classList.add("clicked-pop");
    setTimeout(() => {
      this.classList.remove("clicked-pop");
    }, 300);
  });
});

// 6. نوار پیشرفت اسکرول (اصل پیشرفت قابل مشاهده، اصل حس موفقیت، اصل تأخیر معنادار پاداش، اصل بار شناختی پایین)
// نوار پیشرفت، وضعیت کاربر را به صورت بصری نشان می‌دهد و حس پیشرفت را القا می‌کند.
// این کار بار شناختی را کاهش می‌دهد زیرا کاربر نیازی به حدس زدن موقعیت خود در صفحه ندارد.
const scrollProgressBar = document.createElement('div');
scrollProgressBar.id = 'scroll-progress-bar';
document.body.prepend(scrollProgressBar);

window.addEventListener('scroll', () => {
  const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrolled = window.scrollY;
  const progress = (scrolled / totalHeight) * 100;
  scrollProgressBar.style.width = progress + '%';

  if (progress > 90) {
    scrollProgressBar.style.backgroundColor = 'var(--highlight-color)';
  } else if (progress > 50) {
    scrollProgressBar.style.backgroundColor = 'var(--accent-color)';
  } else {
    scrollProgressBar.style.backgroundColor = 'var(--primary-color)';
  }
});

// 7. Hint برای کاوش بیشتر (اصل کشف و پیش‌بینی، اصل کنجکاوی و رمزآلود بودن، اصل انتظارات مثبت، اصل توجه)
// این المان کوچک، کنجکاوی کاربر را برمی‌انگیزد و او را به کاوش بخش‌های جدید تشویق می‌کند.
// این یک نشانه بصری ظریف برای هدایت توجه است.
const exploreHint = document.createElement('a');
exploreHint.href = '#projects';
exploreHint.id = 'explore-hint';
exploreHint.innerHTML = '<i class="fas fa-lightbulb"></i> <span class="hint-text">پروژه‌های من را کشف کنید.</span>';
exploreHint.style.opacity = '0';
exploreHint.style.transform = 'translateY(20px)';
document.body.appendChild(exploreHint);

let hintTimeout;
let hintVisible = false;

const heroSection = document.getElementById('hero');
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // اگر کاربر وارد بخش Hero شد، تایمر را برای نمایش hint شروع کن
      if (!hintVisible) {
        hintTimeout = setTimeout(() => {
          exploreHint.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
          exploreHint.style.opacity = '1';
          exploreHint.style.transform = 'translateY(0)';
          hintVisible = true;
        }, 8000); // نمایش پس از 8 ثانیه در بخش Hero
      }
    } else {
      // اگر کاربر از بخش Hero خارج شد، hint را پنهان کن و تایمر را پاک کن
      clearTimeout(hintTimeout);
      if (hintVisible) {
        exploreHint.style.opacity = '0';
        exploreHint.style.transform = 'translateY(20px)';
        hintVisible = false;
      }
    }
  });
}, { threshold: 0.5 }); // وقتی 50% از Hero قابل مشاهده باشد

if (heroSection) {
  heroObserver.observe(heroSection);
}

exploreHint.addEventListener('click', (e) => {
  e.preventDefault();
  exploreHint.style.opacity = '0';
  exploreHint.style.transform = 'translateY(20px)';
  hintVisible = false; // Reset state
  window.scrollTo({
    top: document.querySelector('#projects').offsetTop - (document.querySelector('.navbar')?.offsetHeight || 0),
    behavior: 'smooth'
  });
});

// 8. پیام‌های پاداش متغیر برای مهارت‌ها (اصل تأخیر معنادار پاداش، اصل کنجکاوی و رمزآلود بودن، اصل لذت از تسلط، اصل پاداش دوپامینی)
// هنگام هاور روی هر مهارت، یک پیام تصادفی و جذاب نمایش داده می‌شود که حس کنجکاوی و پاداش متغیر را تقویت می‌کند.
// این پاداش‌های غیرقابل پیش‌بینی، ترشح دوپامین را تحریک کرده و تجربه را جذاب‌تر می‌کنند.
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
  "این مهارت بخشی از توانمندی‌های اصلی من است."
];

document.querySelectorAll("#skills .skills-list li").forEach(skillItem => {
  const messageSpan = document.createElement('span');
  messageSpan.className = 'skill-hover-message';
  skillItem.appendChild(messageSpan);

  let hideTimeout; // To store the timeout for hiding

  skillItem.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout); // Clear any pending hide
    const randomMessage = skillMessages[Math.floor(Math.random() * skillMessages.length)];
    messageSpan.textContent = randomMessage;
    messageSpan.style.opacity = '1';
    messageSpan.style.transform = 'translateY(-5px)';
  });

  skillItem.addEventListener('mouseleave', () => {
    // Add a slight delay before hiding to allow for "delayed meaningful reward"
    hideTimeout = setTimeout(() => {
      messageSpan.style.opacity = '0';
      messageSpan.style.transform = 'translateY(0)';
    }, 200); // Small delay, e.g., 200ms
  });
});

// 9. انیمیشن تایم‌لاین با پیشرفت (اصل پیشرفت قابل مشاهده، اصل حس موفقیت، اصل داستان‌پردازی، اصل حافظه هیجانی)
// این بخش انیمیشن‌های ورود عناصر تایم‌لاین را کنترل می‌کند تا حس پیشرفت در داستان زندگی را القا کند.
// ارائه اطلاعات به صورت داستانی و بصری، به بهبود حافظه هیجانی و درک ساختاری کمک می‌کند.
const timelineItems = document.querySelectorAll('.timeline li');

const timelineObserverOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.2
};

const timelineObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('timeline-item-visible');
      observer.unobserve(entry.target);
    }
  });
}, timelineObserverOptions);

timelineItems.forEach(item => {
  timelineObserver.observe(item);
});

// 10. بازخورد برای باز شدن FAQ (اصل بازخورد آنی، اصل کشف و پیش‌بینی، اصل تلاش کم)
// بازخورد بصری هنگام باز و بسته شدن آیتم‌های FAQ، تعامل را واضح‌تر و دلپذیرتر می‌کند.
// این کار به کاربر اطمینان می‌دهد که عملش نتیجه داشته است.
document.querySelectorAll('.faq-item summary').forEach(summary => {
  summary.addEventListener('click', () => {
    const parentDetails = summary.closest('details');
    if (parentDetails) {
      parentDetails.classList.toggle('faq-opened');
    }
  });
});

// 11. پیام خوش‌آمدگویی برای کاربران جدید/بازگشتی (اصل شخصی‌سازی، اصل تعلق و ارتباط، اصل هویت و شأن فردی، اصل هم‌ذات‌پنداری)
// این پیام برای ایجاد حس شخصی‌سازی و تعلق خاطر در کاربر طراحی شده است.
// تشخیص کاربر جدید/بازگشتی، حس احترام و درک متقابل را منتقل می‌کند.
const welcomeToast = document.createElement('div');
welcomeToast.id = 'welcome-toast';
welcomeToast.setAttribute('role', 'status');
welcomeToast.setAttribute('aria-live', 'polite');
document.body.appendChild(welcomeToast);

window.addEventListener('load', () => {
  const hasVisited = localStorage.getItem('hasVisited');
  let message = '';

  if (hasVisited) {
    message = 'خوش آمدید! از بازگشت شما خرسندیم.'; // پیام دلنشین‌تر برای بازگشتی‌ها
  } else {
    message = 'به وبسایت رسمی رسول آنلیمیتد خوش آمدید.'; // پیام جذاب‌تر برای جدیدها
    localStorage.setItem('hasVisited', 'true');
  }

  if (message) {
    welcomeToast.textContent = message;
    welcomeToast.classList.add('show');
    setTimeout(() => {
      welcomeToast.classList.remove('show');
    }, 3500); // کمی کوتاه‌تر برای حس حرفه‌ای‌تر
  }
});

// 12. جشن اتمام صفحه (اصل اثر پایان خوش، اصل حس موفقیت، اصل جذابیت بصری و ظاهری، اصل پاداش دوپامینی)
// این بخش یک حس مثبت قوی در پایان تجربه کاربری ایجاد می‌کند و با افکت کنفتی، یک پاداش بصری و هیجانی ارائه می‌دهد.
// این کار باعث می‌شود کاربر با حس خوبی صفحه را ترک کند و احتمال بازگشتش بیشتر شود.
const endOfPageToast = document.createElement('div');
endOfPageToast.id = 'end-of-page-toast';
endOfPageToast.setAttribute('role', 'status');
endOfPageToast.setAttribute('aria-live', 'polite');
document.body.appendChild(endOfPageToast);

let hasReachedEnd = false;
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && !hasReachedEnd) {
    endOfPageToast.textContent = 'شما به انتهای صفحه رسیدید. از بازدید شما سپاسگزارم. 🎉';
    endOfPageToast.classList.add('show');
    hasReachedEnd = true;
    setTimeout(() => {
      endOfPageToast.classList.remove('show');
      createConfetti(); // ایجاد افکت کنفتی
    }, 4000); // مدت زمان کوتاه‌تر برای حس حرفه‌ای‌تر
  }
});

// 13. بازخورد برای کپی ایمیل (اصل بازخورد آنی، اصل پاداش فوری، اصل نشانه‌های تعاملی، اصل تلاش کم)
// ارائه بازخورد فوری و واضح برای یک عمل مهم، به کاربر اطمینان می‌دهد که عملش موفقیت‌آمیز بوده است.
// این کار بار شناختی را کاهش می‌دهد و حس کارآمدی را منتقل می‌کند.
const emailLink = document.querySelector('.contact-info a[href^="mailto:"]');
if (emailLink) {
  emailLink.addEventListener('click', (e) => {
    e.preventDefault(); // جلوگیری از باز شدن ایمیل کلاینت
    const email = emailLink.href.replace('mailto:', '');

    // ایجاد یک المان موقت برای کپی کردن متن
    const tempInput = document.createElement('input');
    tempInput.value = email;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy'); // کپی کردن متن
    document.body.removeChild(tempInput);

    showToastNotification('ایمیل کپی شد. ✅');
  });
}

// تابع کمکی برای نمایش پیام‌های Toast (اصل بازخورد آنی، اصل روان‌روانی و سهولت جریان، اصل بار شناختی پایین)
// این تابع به صورت مرکزی برای نمایش پیام‌های کوتاه و غیرمزاحم استفاده می‌شود.
// پیام‌های کوتاه و واضح، بار شناختی را کم کرده و جریان کاربری را حفظ می‌کنند.
function showToastNotification(message, duration = 3000) {
  const dynamicToast = document.createElement('div');
  dynamicToast.className = 'dynamic-toast';
  dynamicToast.textContent = message;
  document.body.appendChild(dynamicToast);

  setTimeout(() => {
    dynamicToast.classList.add('show');
  }, 100);

  setTimeout(() => {
    dynamicToast.classList.remove('show');
    dynamicToast.addEventListener('transitionend', () => dynamicToast.remove());
  }, duration);
}

// 14. افکت کنفتی (اصل اثر پایان خوش، اصل حس موفقیت، اصل جذابیت بصری و ظاهری، اصل برانگیختگی هیجانی)
// این تابع افکت بصری کنفتی را برای جشن گرفتن اتمام صفحه ایجاد می‌کند.
// این یک پاداش هیجانی قوی است که تجربه کاربری را به یاد ماندنی می‌کند.
function createConfetti() {
  const confettiContainer = document.createElement('div');
  confettiContainer.id = 'confetti-container';
  document.body.appendChild(confettiContainer);

  const confettiCount = 30; // کاهش تعداد کنفتی برای حس حرفه‌ای‌تر و ظریف‌تر
  const colors = ['#ffc107', '#007acc', '#005a9e', '#f0f0f0']; // رنگ‌های تم سایت

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = Math.random() * 100 + 'vh';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiContainer.appendChild(confetti);

    confetti.animate([
      { transform: `translateY(0) rotate(${Math.random() * 360}deg)`, opacity: 1 },
      { transform: `translateY(${window.innerHeight * 1.2}px) rotate(${Math.random() * 720}deg)`, opacity: 0 } // سقوط کمتر
    ], {
      duration: Math.random() * 2000 + 1500, // 1.5 تا 3.5 ثانیه
      easing: 'ease-out',
      delay: Math.random() * 300,
      fill: 'forwards'
    });

    confetti.addEventListener('animationend', () => {
      confetti.remove();
    });
  }

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
  "پروژه‌های برنامه‌نویسی من در Zenodo نمایه شده‌اند و دارای DOI هستند."
];

let funFactToastElement = null;
let funFactInterval = null;

function showFunFact() {
  if (funFactToastElement) {
    funFactToastElement.remove();
  }

  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
  funFactToastElement = document.createElement('div');
  funFactToastElement.className = 'fun-fact-toast';
  funFactToastElement.innerHTML = `
    <span class="fun-fact-text">دانستنی: ${randomFact}</span>
    <button class="fun-fact-close" aria-label="بستن پیام دانستنی"><i class="fas fa-times"></i></button>
  `;
  document.body.appendChild(funFactToastElement);

  setTimeout(() => {
    funFactToastElement.classList.add('show');
  }, 100);

  funFactToastElement.querySelector('.fun-fact-close').addEventListener('click', () => {
    funFactToastElement.classList.remove('show');
    funFactToastElement.addEventListener('transitionend', () => funFactToastElement.remove());
    funFactToastElement = null;
  });

  setTimeout(() => {
    if (funFactToastElement) {
      funFactToastElement.classList.remove('show');
      funFactToastElement.addEventListener('transitionend', () => funFactToastElement.remove());
      funFactToastElement = null;
    }
  }, 8000); // نمایش برای 8 ثانیه
}

window.addEventListener('load', () => {
  setTimeout(() => {
    showFunFact();
    funFactInterval = setInterval(() => {
      showFunFact();
    }, Math.random() * 60000 + 60000); // بین 60 تا 120 ثانیه (کاهش فرکانس برای جلوگیری از اسپم)
  }, 20000); // شروع نمایش دانستنی‌ها پس از 20 ثانیه (تأخیر بیشتر)
});

window.addEventListener('beforeunload', () => {
  if (funFactInterval) {
    clearInterval(funFactInterval);
  }
});

// 16. بازخورد کشف بخش‌ها (اصل پیشرفت قابل مشاهده، اصل پاداش فوری، اصل حس موفقیت)
// این تابع که قبلاً برای نمایش پیام toast هنگام ورود به یک بخش جدید استفاده می‌شد،
// برای حفظ حرفه‌ای بودن و جلوگیری از شلوغی، حذف شده است. AOS به تنهایی برای انتقال حس پیشرفت کافی است.
/*
const sectionTitles = {
  'hero': 'صفحه اصلی',
  'about': 'درباره من',
  'timeline': 'مسیر من',
  'skills': 'مهارت‌ها و تکنولوژی‌ها',
  'projects': 'پروژه‌ها',
  'content': 'محتوای منتخب',
  'mentions': 'حضور در رسانه‌ها و افتخارات',
  'faq': 'سوالات متداول',
  'testimonials': 'نظرات',
  'connect': 'تماس و پیوندهای من'
};

const visitedSections = new Set();

const sectionObserverOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.3
};

const sectionObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !visitedSections.has(entry.target.id)) {
      const sectionId = entry.target.id;
      const title = sectionTitles[sectionId];
      if (title) {
        // showToastNotification(`شما وارد بخش "${title}" شدید! 🌟`); // حذف این خط
        visitedSections.add(sectionId);
      }
    }
  });
}, sectionObserverOptions);

document.querySelectorAll('section').forEach(section => {
  if (section.id) {
    sectionObserver.observe(section);
  }
});
*/