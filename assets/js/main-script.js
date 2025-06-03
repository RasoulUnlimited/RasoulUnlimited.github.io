// main-script.js
// اسکریپت اصلی برای وبسایت رسمی رسول آنلیمیتد
// نویسنده: محمد رسول سهرابی (Rasoul Unlimited)

// این فایل جاوااسکریپت با در نظر گرفتن اصول روان‌شناسی تجربه کاربری، علوم شناختی،
// اقتصاد رفتاری، انسان‌شناسی دیجیتال و تحلیل رفتار مصرف‌کننده بهینه‌سازی شده است.
// هدف، ایجاد یک تجربه کاربری جذاب، قابل پیش‌بینی، پاداش‌دهنده و با بار شناختی پایین است.

// 1. به‌روزرسانی سال جاری در فوتر
// این بخش تضمین می‌کند که سال کپی‌رایت در پایین صفحه همیشه به‌روز باشد.
// این یک نکته کوچک اما مهم برای حفظ دقت و اعتبار سایت است که حس "قابلیت پیش‌بینی"
// و "حس کنترل" را به کاربر می‌دهد، زیرا اطلاعات همیشه دقیق و به‌روز هستند.
document.getElementById("current-year").textContent = new Date().getFullYear();

// 2. راه‌اندازی کتابخانه AOS (Animate On Scroll)
// AOS یک کتابخانه جاوااسکریپت برای افزودن انیمیشن‌های اسکرول به عناصر صفحه است.
// این کار باعث بهبود تجربه کاربری (UX) و جذابیت بصری سایت می‌شود.
// انیمیشن‌ها حس "کشف و پیش‌بینی" را تقویت می‌کنند، زیرا عناصر به شکلی پویا ظاهر می‌شوند.
// همچنین، حرکت‌های روان و جذاب، "پاداش فوری و مثبت" بصری را برای کاربر فراهم می‌آورند.
// تنظیمات پیش‌فرض:
//   - disable: false (انیمیشن‌ها فعال هستند)
//   - startEvent: "DOMContentLoaded" (شروع انیمیشن‌ها پس از بارگذاری کامل DOM)
//   - duration: 800 (مدت زمان انیمیشن به میلی‌ثانیه)
//   - once: false (انیمیشن‌ها هر بار که عنصر وارد viewport شود، اجرا می‌شوند)
//   - mirror: false (انیمیشن‌ها هنگام اسکرول به بالا، معکوس نمی‌شوند)
AOS.init({
  disable: false, // انیمیشن‌ها فعال هستند
  startEvent: "DOMContentLoaded", // شروع انیمیشن‌ها پس از بارگذاری کامل DOM
  initClassName: "aos-init", // کلاسی که به عناصر AOS پس از مقداردهی اولیه اضافه می‌شود
  animatedClassName: "aos-animate", // کلاسی که هنگام فعال شدن انیمیشن اضافه می‌شود
  useClassNames: false, // استفاده از کلاس‌های AOS به جای ویژگی‌های data-aos
  disableMutationObserver: false, // غیرفعال کردن MutationObserver (برای بهبود عملکرد در برخی موارد)
  debounceDelay: 50, // تاخیر برای debounce کردن رویدادهای اسکرول (کاهش بار شناختی با بهینه‌سازی عملکرد)
  throttleDelay: 99, // تاخیر برای throttle کردن رویدادهای اسکرول (کاهش بار شناختی با بهینه‌سازی عملکرد)

  offset: 120, // فاصله (پیکسل) از بالای صفحه که انیمیشن شروع می‌شود
  delay: 0, // تاخیر (میلی‌ثانیه) قبل از شروع انیمیشن
  duration: 800, // مدت زمان انیمیشن (میلی‌ثانیه)
  easing: "ease", // نوع easing برای انیمیشن (زیبایی تعاملی)
  once: false, // آیا انیمیشن فقط یک بار اجرا شود؟ (false = هر بار که عنصر وارد viewport شود - حس پیشرفت و دستاورد)
  mirror: false, // آیا انیمیشن هنگام اسکرول به بالا معکوس شود؟
  anchorPlacement: "top-bottom", // محل قرارگیری لنگر برای تشخیص شروع انیمیشن
});

// 3. مدیریت تغییر تم (حالت روشن/تاریک)
// این بخش مسئول پیاده‌سازی قابلیت تغییر تم سایت بین حالت روشن و تاریک است.
// این ویژگی به بهبود دسترسی‌پذیری و تجربه کاربری (UX) کمک می‌کند،
// و به کاربر حس "کنترل" و "شخصی‌سازی" می‌دهد که با اصل "پاداش فوری و مثبت" و "زیبایی تعاملی" همسو است.
// انتخاب تم مناسب با "پیش‌زمینه و زمینه" (کنتراست کافی) نیز در اینجا رعایت می‌شود.
const themeToggleInput = document.getElementById("theme-toggle"); // المان ورودی برای تغییر تم
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; // بررسی ترجیح سیستم کاربر برای حالت تاریک
const savedTheme = localStorage.getItem("theme"); // بازیابی تم ذخیره شده از Local Storage (پیش‌فرض هوشمند)

// تابع applyTheme: تم را بر اساس ورودی اعمال می‌کند و وضعیت دکمه را به‌روز می‌کند.
// این تابع از Local Storage برای حفظ انتخاب کاربر بین بازدیدها استفاده می‌کند.
function applyTheme(theme) {
  // افزودن یا حذف کلاس 'dark-mode' از بدنه HTML
  document.body.classList.toggle("dark-mode", theme === "dark");
  // افزودن یا حذف کلاس 'light-mode' از بدنه HTML (اختیاری، برای وضوح بیشتر)
  document.body.classList.toggle("light-mode", theme === "light");
  // به‌روزرسانی وضعیت دکمه (چک‌باکس) بر اساس تم اعمال شده
  themeToggleInput.checked = theme === "dark";
  // اینجا می‌توان یک بازخورد صوتی یا ویژوال کوچک (مثلاً یک پاپ‌آپ محو شونده) اضافه کرد
  // تا حس "پاداش فوری" را تقویت کند، اما در حال حاضر فقط تغییر بصری انجام می‌شود.
}

// بررسی تم ذخیره شده یا ترجیح سیستم در هنگام بارگذاری صفحه
// این یک "پیش‌فرض هوشمند" است که تجربه کاربر را از ابتدا بهبود می‌بخشد.
if (savedTheme) {
  // اگر تمی در Local Storage ذخیره شده باشد، آن را اعمال کن
  applyTheme(savedTheme);
} else {
  // در غیر این صورت، تم را بر اساس ترجیح سیستم کاربر اعمال کن
  applyTheme(prefersDark ? "dark" : "light");
}

// افزودن Event Listener برای تغییر تم هنگام کلیک کاربر روی دکمه
themeToggleInput.addEventListener("change", () => {
  // تعیین تم جدید بر اساس وضعیت فعلی دکمه
  const newTheme = themeToggleInput.checked ? "dark" : "light";
  // اعمال تم جدید
  applyTheme(newTheme);
  // ذخیره تم جدید در Local Storage برای بازدیدهای بعدی
  localStorage.setItem("theme", newTheme);
});

// 4. مدیریت اسکرول صاف برای لینک‌های ناوبری (Smooth Scroll)
// این بخش تضمین می‌کند که کلیک بر روی لینک‌های ناوبری به جای پرش ناگهانی،
// با یک اسکرول نرم به بخش مربوطه منتقل شود. این کار "بار شناختی" را کاهش داده
// و حس "زیبایی تعاملی" را افزایش می‌دهد، زیرا کاربر می‌تواند مسیر حرکت صفحه را دنبال کند.
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault(); // جلوگیری از رفتار پیش‌فرض لینک

    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      // اسکرول نرم به سمت عنصر هدف
      window.scrollTo({
        top: targetElement.offsetTop - (document.querySelector('.navbar')?.offsetHeight || 0), // تنظیم آفست برای نوار ناوبری ثابت
        behavior: "smooth", // اسکرول نرم
      });
    }
  });
});

// 5. بازخورد بصری برای کلیک روی کارت‌ها (پاداش فوری و مثبت، کشف و پیش‌بینی)
// این بخش یک بازخورد بصری کوچک (مثلاً یک انیمیشن پاپ) را هنگام کلیک روی کارت‌ها اضافه می‌کند.
// این کار حس "پاداش فوری" را تقویت کرده و تعامل را جذاب‌تر می‌کند.
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", function () {
    // افزودن یک کلاس موقت برای فعال کردن انیمیشن "پاپ"
    this.classList.add("clicked-pop");
    // حذف کلاس پس از اتمام انیمیشن برای آماده‌سازی برای کلیک‌های بعدی
    setTimeout(() => {
      this.classList.remove("clicked-pop");
    }, 300); // مدت زمان انیمیشن (میلی‌ثانیه)
  });
});

// این کلاس CSS باید در فایل main-style-fa.css اضافه شود تا انیمیشن کار کند:
/*
.card.clicked-pop {
  animation: cardPop 0.3s ease-out;
}

@keyframes cardPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.01); } // یک بزرگنمایی کوچک
  100% { transform: scale(1); }
}
*/