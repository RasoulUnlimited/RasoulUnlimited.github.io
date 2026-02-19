document.addEventListener("DOMContentLoaded", function () {
  const tagline = document.querySelector("#hero .tagline");
  if (!tagline) {return;}

  if (tagline.dataset.typingInitialized === "true") {
    return;
  }

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    tagline.dataset.typingInitialized = "true";
    return;
  }

  const roleSpans = tagline.querySelectorAll('span[property="schema:jobTitle"]');
  let roles = [];

  if (roleSpans.length > 0) {
    roleSpans.forEach((span) => {
      const text = (span.textContent || "").trim();
      if (text) {roles.push(text);}
    });
  } else {
    roles = [
      "معمار محصولات دیجیتال سلامت",
      "توسعه‌دهنده فول‌استک",
      "استراتژیست هویت و برند شخصی",
    ];
  }

  if (!roles.length) {
    tagline.dataset.typingInitialized = "true";
    return;
  }

  // Keep a static screen-reader text and hide only visually.
  const originalContent = document.createElement("span");
  originalContent.className = "visually-hidden-seo";
  while (tagline.firstChild) {
    originalContent.appendChild(tagline.firstChild);
  }
  tagline.appendChild(originalContent);

  const typingWrapper = document.createElement("span");
  typingWrapper.className = "typing-wrapper";
  typingWrapper.setAttribute("aria-hidden", "true");
  typingWrapper.innerHTML =
    '<span class="typing-text"></span>' +
    '<span class="cursor" aria-hidden="true">|</span>';
  tagline.appendChild(typingWrapper);

  const typeSpan = typingWrapper.querySelector(".typing-text");
  if (!typeSpan) {
    tagline.dataset.typingInitialized = "true";
    return;
  }

  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 80;

  function type() {
    if (!document.body.contains(tagline)) {return;}

    const currentRole = roles[roleIndex];
    if (isDeleting) {
      typeSpan.textContent = currentRole.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 40;
    } else {
      typeSpan.textContent = currentRole.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 80 + Math.random() * 50;
    }

    if (!isDeleting && charIndex === currentRole.length) {
      isDeleting = true;
      typeSpeed = 2000;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
  }

  tagline.dataset.typingInitialized = "true";
  setTimeout(type, 1000);
});
