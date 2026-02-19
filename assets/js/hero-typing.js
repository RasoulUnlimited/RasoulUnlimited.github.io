document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("hero");
  const tagline = document.querySelector("#hero .tagline");
  if (!hero || !tagline) {
    return;
  }

  if (tagline.dataset.typingBound === "true") {
    return;
  }
  tagline.dataset.typingBound = "true";

  const reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const coarsePointerQuery = window.matchMedia
    ? window.matchMedia("(pointer: coarse)")
    : null;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const MIN_FULL_MOTION_VIEWPORT = 1100;
  const originalTaglineHTML = tagline.innerHTML;

  let typingTimer = null;
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingWrapper = null;
  let typingText = null;
  let active = false;

  function isNetworkConstrained() {
    if (!connection) {
      return false;
    }

    const saveData = Boolean(connection.saveData);
    const type = String(connection.effectiveType || "").toLowerCase();
    return saveData || type.includes("2g") || type.includes("slow-2g");
  }

  function resolveMotionMode() {
    if (reducedMotionQuery?.matches || isNetworkConstrained()) {
      return "off";
    }

    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    const lowPowerDevice = (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);

    if (
      coarsePointerQuery?.matches ||
      window.innerWidth < MIN_FULL_MOTION_VIEWPORT ||
      lowPowerDevice
    ) {
      return "lite";
    }

    return "full";
  }

  function setHeroMotionIfNeeded(mode) {
    const current = hero.getAttribute("data-hero-motion");
    if (!current || current === "off" || current === "lite" || current === "full") {
      hero.setAttribute("data-hero-motion", mode);
    }
  }

  function getRolesFromCurrentMarkup() {
    const roleSpans = tagline.querySelectorAll('span[property="schema:jobTitle"]');
    return Array.from(roleSpans)
      .map((node) => (node.textContent || "").trim())
      .filter(Boolean);
  }

  function clearTypingTimer() {
    if (typingTimer !== null) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
  }

  function restoreStaticTagline() {
    clearTypingTimer();
    active = false;
    roleIndex = 0;
    charIndex = 0;
    isDeleting = false;
    typingWrapper = null;
    typingText = null;
    tagline.innerHTML = originalTaglineHTML;
    tagline.dataset.typingInitialized = "true";
  }

  function ensureTypingMarkup() {
    const staticContent = document.createElement("span");
    staticContent.className = "visually-hidden-seo";
    staticContent.innerHTML = originalTaglineHTML;

    const wrapper = document.createElement("span");
    wrapper.className = "typing-wrapper";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML =
      '<span class="typing-text"></span><span class="cursor" aria-hidden="true">|</span>';

    tagline.innerHTML = "";
    tagline.appendChild(staticContent);
    tagline.appendChild(wrapper);

    typingWrapper = wrapper;
    typingText = wrapper.querySelector(".typing-text");
  }

  function scheduleTick(delay) {
    clearTypingTimer();
    typingTimer = window.setTimeout(runTypingTick, delay);
  }

  function runTypingTick() {
    if (!active || !typingText || !document.body.contains(tagline)) {
      return;
    }

    if (document.hidden) {
      scheduleTick(300);
      return;
    }

    if (resolveMotionMode() !== "full") {
      restoreStaticTagline();
      return;
    }

    const roles = getRolesFromCurrentMarkup();
    if (!roles.length) {
      restoreStaticTagline();
      return;
    }

    const currentRole = roles[roleIndex % roles.length];

    if (isDeleting) {
      charIndex = Math.max(0, charIndex - 1);
      typingText.textContent = currentRole.slice(0, charIndex);
    } else {
      charIndex = Math.min(currentRole.length, charIndex + 1);
      typingText.textContent = currentRole.slice(0, charIndex);
    }

    let nextDelay = isDeleting ? 44 : 78 + Math.random() * 34;

    if (!isDeleting && charIndex >= currentRole.length) {
      isDeleting = true;
      nextDelay = 1400;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      nextDelay = 320;
    }

    scheduleTick(nextDelay);
  }

  function startTyping() {
    if (typingWrapper && typingText) {
      active = true;
      scheduleTick(220);
      return;
    }

    const roles = getRolesFromCurrentMarkup();
    if (!roles.length) {
      tagline.dataset.typingInitialized = "true";
      return;
    }

    ensureTypingMarkup();
    active = true;
    roleIndex = 0;
    charIndex = 0;
    isDeleting = false;
    tagline.dataset.typingInitialized = "true";
    scheduleTick(520);
  }

  let resizeTimer = null;

  function syncTypingMode() {
    const mode = resolveMotionMode();
    setHeroMotionIfNeeded(mode);

    if (mode !== "full") {
      if (typingWrapper) {
        restoreStaticTagline();
      } else {
        tagline.dataset.typingInitialized = "true";
      }
      return;
    }

    startTyping();
  }

  function onVisibilityChange() {
    if (document.hidden) {
      clearTypingTimer();
      return;
    }

    if (typingWrapper && active) {
      scheduleTick(120);
      return;
    }

    syncTypingMode();
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncTypingMode, 120);
  }

  function onMotionRelatedChange() {
    syncTypingMode();
  }

  function cleanup() {
    clearTypingTimer();
    clearTimeout(resizeTimer);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", cleanup);
    window.removeEventListener("pagehide", cleanup);

    reducedMotionQuery?.removeEventListener?.("change", onMotionRelatedChange);
    coarsePointerQuery?.removeEventListener?.("change", onMotionRelatedChange);
    connection?.removeEventListener?.("change", onMotionRelatedChange);

    reducedMotionQuery?.removeListener?.(onMotionRelatedChange);
    coarsePointerQuery?.removeListener?.(onMotionRelatedChange);
    connection?.removeListener?.(onMotionRelatedChange);
  }

  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });

  reducedMotionQuery?.addEventListener?.("change", onMotionRelatedChange);
  coarsePointerQuery?.addEventListener?.("change", onMotionRelatedChange);
  connection?.addEventListener?.("change", onMotionRelatedChange);

  reducedMotionQuery?.addListener?.(onMotionRelatedChange);
  coarsePointerQuery?.addListener?.(onMotionRelatedChange);
  connection?.addListener?.(onMotionRelatedChange);

  syncTypingMode();
});
