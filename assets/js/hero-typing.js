document.addEventListener("DOMContentLoaded", function () {
  const tagline = document.querySelector(".tagline");
  if (!tagline) return;

  // اگر قبلاً این اسکریپت روی این عنصر اجرا شده، دوباره دست نزن
  if (tagline.dataset.typingInitialized === "true") {
    return;
  }

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // اگر کاربر motion رو کم کرده، متن اصلی رو دست‌نخورده نگه داریم
  if (prefersReducedMotion) {
    tagline.dataset.typingInitialized = "true";
    return;
  }

  // Extract roles from the existing HTML to ensure consistency
  const roleSpans = tagline.querySelectorAll(
    'span[property="schema:jobTitle"]'
  );
  let roles = [];

  if (roleSpans.length > 0) {
    roleSpans.forEach((span) => {
      const text = span.textContent.trim();
      if (text) roles.push(text);
    });
  } else {
    // Fallback if structure changes
    roles = [
      "دانشجوی مهندسی پزشکی",
      "توسعه‌دهنده فول‌استک",
      "استراتژیست برند شخصی",
    ];
  }

  // اگر به هر دلیل هیچ role معتبری نداشتیم، بهتره انیمیشن رو اجرا نکنیم
  if (!roles.length) {
    tagline.dataset.typingInitialized = "true";
    return;
  }

  // Hide original content visually but keep for SEO
  const originalContent = document.createElement("span");
  originalContent.className = "visually-hidden-seo";

  while (tagline.firstChild) {
    originalContent.appendChild(tagline.firstChild);
  }
  tagline.appendChild(originalContent);

  // Create typing wrapper
  const typingWrapper = document.createElement("span");
  typingWrapper.className = "typing-wrapper";
  typingWrapper.innerHTML =
    '<span class="typing-text" aria-live="polite"></span>' +
    '<span class="cursor" aria-hidden="true">|</span>';
  tagline.appendChild(typingWrapper);

  const typeSpan = typingWrapper.querySelector(".typing-text");

  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 80; // Slightly faster typing

  function type() {
    // اگر در حین کار این بلاک از DOM حذف شد، حلقه رو متوقف کن
    if (!document.body.contains(tagline)) return;

    const currentRole = roles[roleIndex];

    if (isDeleting) {
      typeSpan.textContent = currentRole.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 40; // Fast deleting
    } else {
      typeSpan.textContent = currentRole.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 80 + Math.random() * 50; // Natural typing variation
    }

    if (!isDeleting && charIndex === currentRole.length) {
      // Pause at end of word
      isDeleting = true;
      typeSpeed = 2000;
    } else if (isDeleting && charIndex === 0) {
      // Move to next word
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typeSpeed = 500; // Pause before typing next word
    }

    setTimeout(type, typeSpeed);
  }

  tagline.dataset.typingInitialized = "true";

  // Start typing loop
  setTimeout(type, 1000);
});
