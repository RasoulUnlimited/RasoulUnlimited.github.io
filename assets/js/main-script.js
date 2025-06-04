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

function getGreetingBasedOnTime() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) {
        return 'صبح بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.';
    } else if (hour >= 10 && hour < 16) {
        return 'ظهر بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.';
    } else if (hour >= 16 && hour < 20) {
        return 'عصر بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.';
    } else {
        return 'شب بخیر! به وبسایت رسمی رسول آنلیمیتد خوش آمدید.';
    }
}

window.addEventListener('load', () => {
    const hasVisited = localStorage.getItem('hasVisited');
    let message = '';

    if (hasVisited) {
        message = 'خوش آمدید! از بازگشت شما خرسندیم.'; // پیام دلنشین‌تر برای بازگشتی‌ها
    } else {
        message = getGreetingBasedOnTime(); // پیام جذاب‌تر برای جدیدها با شخصی‌سازی زمانی
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
function showToastNotification(message, duration = 3000, customClass = '') {
    const dynamicToast = document.createElement('div');
    dynamicToast.className = 'dynamic-toast';
    if (customClass) {
        dynamicToast.classList.add(customClass);
    }
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
let userIsIdle = false;
let idleTimeout;

function resetIdleTimer() {
    clearTimeout(idleTimeout);
    userIsIdle = false;
    idleTimeout = setTimeout(() => {
        userIsIdle = true;
        if (!funFactToastElement) { // فقط اگر پیام دانستنی نمایش داده نشده باشد
            showFunFact();
        }
    }, 30000); // کاربر پس از 30 ثانیه عدم فعالیت، بیکار محسوب می‌شود
}

// رویدادهای فعالیت کاربر
['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetIdleTimer);
});

// شروع اولیه تایمر بیکاری
resetIdleTimer();


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
        resetIdleTimer(); // پس از بستن دستی، تایمر بیکاری را ریست کن
    });

    setTimeout(() => {
        if (funFactToastElement) {
            funFactToastElement.classList.remove('show');
            funFactToastElement.addEventListener('transitionend', () => funFactToastElement.remove());
            funFactToastElement = null;
        }
    }, 8000); // نمایش برای 8 ثانیه
}

// 16. فعال‌سازی افکت "جرقه" برای کارت‌های برجسته (روان‌شناسی توجه، پاداش دوپامینی، لذت زیبایی‌شناختی)
// این افکت بصری ظریف، توجه کاربر را به محتوای مهم‌تر جلب می‌کند و یک پاداش بصری کوچک ارائه می‌دهد.
function createSparkle(element) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle-effect';
    const size = Math.random() * 10 + 5; // اندازه بین 5 تا 15 پیکسل
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${Math.random() * 100}%`;
    sparkle.style.backgroundColor = 'white'; // رنگ درخشش
    sparkle.style.opacity = 0;
    sparkle.style.position = 'absolute';
    sparkle.style.borderRadius = '50%';
    sparkle.style.boxShadow = `0 0 ${size / 2}px ${size / 4}px var(--highlight-color)`; // درخشش اطراف
    sparkle.style.zIndex = 10;
    sparkle.style.pointerEvents = 'none'; // برای اینکه روی کلیک تداخلی ایجاد نکند

    element.style.position = 'relative'; // اطمینان از موقعیت‌دهی صحیح
    element.appendChild(sparkle);

    sparkle.animate([
        { opacity: 0, transform: 'scale(0) rotate(0deg)' },
        { opacity: 1, transform: 'scale(1) rotate(180deg)' },
        { opacity: 0, transform: 'scale(0.5) rotate(360deg)' }
    ], {
        duration: 800, // مدت زمان انیمیشن
        easing: 'ease-out',
        fill: 'forwards'
    }).onfinish = () => sparkle.remove();
}

const featuredCards = document.querySelectorAll('.card.is-featured');
const featuredCardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // ایجاد چند جرقه در نقاط مختلف کارت
            for (let i = 0; i < 3; i++) { // 3 جرقه برای هر کارت
                setTimeout(() => createSparkle(entry.target), i * 150); // با کمی تأخیر
            }
            featuredCardObserver.unobserve(entry.target); // فقط یک بار جرقه بزند
        }
    });
}, { threshold: 0.5 }); // وقتی 50% از کارت قابل مشاهده باشد

featuredCards.forEach(card => {
    featuredCardObserver.observe(card);
});

// 17. پیام پیشرفت "بخش‌های کاوش شده" (اصل پیشرفت قابل مشاهده، اصل حس موفقیت، انگیزه درونی)
// این قابلیت به کاربر حس پیشرفت و موفقیت در کاوش سایت را می‌دهد و انگیزه او را برای ادامه افزایش می‌دهد.
const sections = document.querySelectorAll('section[id]');
// تعداد کل بخش‌های سایت را به 10 تغییر می‌دهیم
const totalSections = 10; 
const sectionsVisited = new Set();

// نقاط عطف برای نمایش پیام پیشرفت
const explorationMilestones = [
    { count: 3, message: 'شما ۳ بخش از سایت را کاوش کرده‌اید! عالیه! ✨ ادامه دهید!' },
    { count: 6, message: 'نصف راه را پیمودید! شما ۶ بخش را کاوش کرده‌اید! فوق‌العاده! 🚀' },
    { count: 9, message: 'به ۹ بخش رسیدید! کم‌کم داریم به پایان می‌رسیم! 🌟' },
];

// یک آرایه برای پیگیری اینکه کدام نقاط عطف قبلاً اعلام شده‌اند
const milestonesAnnounced = new Array(explorationMilestones.length).fill(false);
let allSectionsExploredAnnounced = false; // پرچم جداگانه برای پیام نهایی تمام بخش‌ها

// زمان آخرین نمایش پیام پیشرفت برای جلوگیری از نمایش‌های پشت سر هم
let lastExplorationToastTime = 0;
const explorationToastCooldown = 10000; // 10 ثانیه مکث بین پیام‌های پیشرفت

const sectionProgressObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            sectionsVisited.add(entry.target.id);

            const currentSectionsCount = sectionsVisited.size;
            const now = Date.now();

            // ابتدا بررسی می‌کنیم که آیا تمام بخش‌ها کاوش شده‌اند یا خیر
            // از totalSections به جای sections.length استفاده می‌کنیم تا با تعداد واقعی بخش‌ها هماهنگ باشد
            if (currentSectionsCount >= totalSections && !allSectionsExploredAnnounced) {
                // اطمینان از اینکه این پیام با پیام‌های دیگر تداخل نداشته باشد
                if (now - lastExplorationToastTime > explorationToastCooldown || lastExplorationToastTime === 0) {
                    showToastNotification(`تبریک! شما تمام ${totalSections} بخش سایت را کاوش کرده‌اید! شما یک کاوشگر واقعی هستید! 🎉`, 5000, 'exploration-toast final-exploration-toast');
                    allSectionsExploredAnnounced = true; // پیام نهایی اعلام شد
                    lastExplorationToastTime = now; // به‌روزرسانی زمان آخرین نمایش
                }
                return; // پس از نمایش پیام نهایی، دیگر نیازی به بررسی نقاط عطف دیگر نیست
            }

            // سپس نقاط عطف عمومی را بررسی می‌کنیم، تنها در صورتی که پیام نهایی هنوز نمایش داده نشده باشد
            if (!allSectionsExploredAnnounced) {
                for (let i = 0; i < explorationMilestones.length; i++) {
                    if (!milestonesAnnounced[i] && currentSectionsCount >= explorationMilestones[i].count) {
                        if (now - lastExplorationToastTime > explorationToastCooldown) {
                            showToastNotification(explorationMilestones[i].message, 5000, 'exploration-toast');
                            milestonesAnnounced[i] = true; // این نقطه عطف اعلام شد
                            lastExplorationToastTime = now; // به‌روزرسانی زمان آخرین نمایش
                        }
                    }
                }
            }
        }
    });
}, { threshold: 0.3 }); // وقتی 30% از بخش قابل مشاهده باشد

sections.forEach(section => {
    sectionProgressObserver.observe(section);
});

// 18. افکت پالس/گلو برای دکمه‌های CTA اصلی (روان‌شناسی توجه، پاداش دوپامینی)
// این انیمیشن‌های ظریف، دکمه‌های اصلی را برجسته‌تر کرده و کاربر را به کلیک تشویق می‌کنند.
// این یک پاداش بصری برای جلب توجه است.
const mainCTAs = document.querySelectorAll('.main-cta-button'); // فرض بر وجود کلاسی به این نام برای دکمه‌های اصلی

mainCTAs.forEach(button => {
    // اضافه کردن یک کلاس برای انیمیشن CSS
    button.classList.add('cta-pulse-effect');
});

// 19. بارگذاری تنبل تصاویر (Lazy Loading) (اصل بار شناختی پایین، اصل سرعت بارگذاری، اصل روان‌روانی)
// این بخش تصاویر را تنها زمانی بارگذاری می‌کند که به viewport نزدیک شوند تا عملکرد و تجربه کاربری بهبود یابد.
document.addEventListener("DOMContentLoaded", function() {
    const lazyImages = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }
                img.removeAttribute('data-src');
                img.removeAttribute('data-srcset');
                img.classList.add('loaded'); // اضافه کردن کلاس برای انیمیشن یا استایل پس از بارگذاری
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '0px 0px 100px 0px', // بارگذاری 100px قبل از رسیدن به viewport
        threshold: 0.01 // حتی اگر 1% از تصویر قابل مشاهده باشد
    });

    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
});

// 20. دکمه بازگشت به بالا (Scroll-to-Top Button) (اصل سهولت و تلاش کم، اصل قابلیت پیش‌بینی)
// این دکمه به کاربر کمک می‌کند تا به راحتی و با تلاش کم به بالای صفحه بازگردد، به خصوص در صفحات طولانی.
const scrollToTopButton = document.createElement('button');
scrollToTopButton.id = 'scroll-to-top';
scrollToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopButton.setAttribute('aria-label', 'بازگشت به بالای صفحه');
document.body.appendChild(scrollToTopButton);

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) { // نمایش پس از 300px اسکرول
        scrollToTopButton.classList.add('show');
    } else {
        scrollToTopButton.classList.remove('show');
    }
});

scrollToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// 21. قابلیت کپی کردن لینک شبکه‌های اجتماعی (اصل بازخورد آنی، اصل تلاش کم)
// این قابلیت به کاربر اجازه می‌دهد تا با یک کلیک، لینک شبکه‌های اجتماعی را کپی کند،
// که باعث افزایش راحتی و کاهش تلاش برای به اشتراک‌گذاری می‌شود.
document.querySelectorAll('.connect-links-block ul li a').forEach(socialLink => {
    socialLink.addEventListener('click', (e) => {
        // فقط در صورتی که لینک به یک صفحه خارجی باشد و نه یک # (لینک داخلی)
        if (socialLink.href && socialLink.href.startsWith('http')) {
            e.preventDefault(); // جلوگیری از باز شدن لینک در تب جدید

            const linkToCopy = socialLink.href;
            const tempInput = document.createElement('input');
            tempInput.value = linkToCopy;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy'); // کپی کردن متن
            document.body.removeChild(tempInput);

            let linkName = socialLink.textContent.trim();
            if (socialLink.querySelector('i')) {
                linkName = socialLink.querySelector('i').nextSibling.textContent.trim(); // گرفتن متن بعد از آیکون
            }
            showToastNotification(`لینک ${linkName} کپی شد! ✅`);
        }
    });
});