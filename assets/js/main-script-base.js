(function () {
  "use strict";

  // Ensure language strings object exists
  if (!window.langStrings) {
    window.langStrings = {};
  }

  /**
   * Safe localStorage accessor with feature / privacy mode detection
   */
  function getSafeStorage() {
    const testKey = "__theme_pref__";
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return localStorage;
    } catch (err) {
      // e.g. Safari private mode or blocked storage
      return null;
    }
  }

  const storage = getSafeStorage();
  const ASSET_FALLBACK_CLASS = "asset-fallback-active";
  const ASSET_FALLBACK_FAILED_CLASS = "asset-fallback-failed";
  const NETWORK_EVENT_NAME = "ru:network-status";
  const assetFallbackAttempts = new Set();
  let lastNetworkToastAt = 0;

  // Reuse a single MediaQueryList if available
  const darkMediaQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  const prefersDark = !!(darkMediaQuery && darkMediaQuery.matches);
  const THEME_STORAGE_KEY = "theme";
  const LEGACY_THEME_STORAGE_KEY = "app:theme";

  function isValidTheme(value) {
    return value === "dark" || value === "light";
  }

  function readStoredTheme() {
    if (!storage) {return null;}

    const storedTheme = storage.getItem(THEME_STORAGE_KEY);
    if (isValidTheme(storedTheme)) {
      return storedTheme;
    }

    const legacyTheme = storage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (!isValidTheme(legacyTheme)) {
      return null;
    }

    // One-time migration from legacy key to canonical key.
    try {
      storage.setItem(THEME_STORAGE_KEY, legacyTheme);
      storage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch (err) {
      // Ignore storage failures in restricted environments.
    }

    return legacyTheme;
  }

  const savedTheme = readStoredTheme();

  // Motion preference (for smooth scroll, etc.)
  const reduceMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const prefersReducedMotion = !!(reduceMotionQuery && reduceMotionQuery.matches);

  const TOAST_LIMIT_PER_POSITION = 3;
  const TOAST_DEFAULT_DURATION = 2800;
  const TOAST_EXIT_FALLBACK_MS = prefersReducedMotion ? 60 : 260;
  const TOAST_STACK_SHIFTS_BOTTOM = [0, -3, -6];
  const TOAST_STACK_SHIFTS_TOP = [0, 3, 6];
  const TOAST_STACK_SCALE_LOSS = [0, 0.005, 0.01];
  const TOAST_SWIPE_MIN_DISTANCE = 56;
  const TOAST_SWIPE_MAX_CROSS_AXIS = 24;
  const TOAST_SWIPE_MIN_VELOCITY = 0.35;
  const TOAST_SWIPE_DISMISS_OFFSET_VW = 72;
  const TOAST_KIND_ICONS = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    info: "fas fa-circle-info",
    default: "fas fa-bell",
  };
  const toastRegistry = new Map();
  const toastState = {
    top: {
      position: "top",
      viewport: null,
      visible: [],
      queue: [],
    },
    bottom: {
      position: "bottom",
      viewport: null,
      visible: [],
      queue: [],
    },
  };
  let toastKeyboardShortcutsInstalled = false;

  function normalizeToastKind(kind) {
    const safeKind = String(kind || "default").toLowerCase();
    if (safeKind === "success" || safeKind === "error" || safeKind === "info") {
      return safeKind;
    }
    return "default";
  }

  function normalizeToastOptions(optionsOrType) {
    const input =
      typeof optionsOrType === "string"
        ? { kind: optionsOrType }
        : optionsOrType && typeof optionsOrType === "object"
          ? optionsOrType
          : {};

    const kind = normalizeToastKind(input.kind || input.type);
    const durationRaw = Number(input.duration);
    const duration =
      Number.isFinite(durationRaw) && durationRaw >= 0
        ? Math.round(durationRaw)
        : TOAST_DEFAULT_DURATION;
    const id = typeof input.id === "string" ? input.id.trim() : "";
    const position = input.position === "top" ? "top" : "bottom";
    const customClass =
      typeof input.customClass === "string" ? input.customClass.trim() : "";
    const iconClass =
      typeof input.iconClass === "string" && input.iconClass.trim()
        ? input.iconClass.trim()
        : TOAST_KIND_ICONS[kind];
    const iconColor =
      typeof input.iconColor === "string" ? input.iconColor.trim() : "";
    const closeButton = !!input.closeButton;
    const role =
      typeof input.role === "string" && input.role.trim()
        ? input.role.trim()
        : kind === "error"
          ? "alert"
          : "status";
    const ariaLive =
      typeof input.ariaLive === "string" && input.ariaLive.trim()
        ? input.ariaLive.trim()
        : kind === "error"
          ? "assertive"
          : "polite";
    const swipeDismiss =
      input.swipeDismiss === true
        ? true
        : input.swipeDismiss === false
          ? false
          : "auto";

    return {
      id,
      kind,
      duration,
      position,
      customClass,
      iconClass,
      iconColor,
      closeButton,
      role,
      ariaLive,
      swipeDismiss,
    };
  }

  function getToastState(position) {
    return position === "top" ? toastState.top : toastState.bottom;
  }

  function ensureToastViewport(position) {
    const state = getToastState(position);
    if (state.viewport && state.viewport.isConnected) {
      return state.viewport;
    }

    const selector = `.toast-viewport[data-toast-position="${position}"]`;
    const existing = document.querySelector(selector);
    if (existing instanceof HTMLElement) {
      state.viewport = existing;
      return state.viewport;
    }

    if (!document.body) {
      return null;
    }

    const viewport = document.createElement("div");
    viewport.className = "toast-viewport";
    viewport.dataset.toastPosition = position;
    viewport.setAttribute("aria-live", "off");
    document.body.appendChild(viewport);
    state.viewport = viewport;
    return viewport;
  }

  function canUseToastSwipe() {
    const touchCapable =
      (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0) ||
      "ontouchstart" in window;

    if (typeof window.matchMedia !== "function") {
      return touchCapable;
    }
    try {
      return window.matchMedia("(pointer: coarse)").matches || touchCapable;
    } catch {
      return touchCapable;
    }
  }

  function isSwipeEnabled(entry) {
    const setting = entry && entry.settings ? entry.settings.swipeDismiss : "auto";
    if (setting === false) {
      return false;
    }
    if (setting === true) {
      return true;
    }
    return canUseToastSwipe();
  }

  function syncToastStack(state) {
    if (!state || !Array.isArray(state.visible) || state.visible.length === 0) {
      return;
    }

    const shifts =
      state.position === "top" ? TOAST_STACK_SHIFTS_TOP : TOAST_STACK_SHIFTS_BOTTOM;

    // The newest visible toast gets the front-most stack values.
    const ordered = state.visible.slice().reverse();
    ordered.forEach((entry, index) => {
      if (!entry || !(entry.toast instanceof HTMLElement)) {
        return;
      }

      const shift = shifts[Math.min(index, shifts.length - 1)];
      const scaleLoss =
        TOAST_STACK_SCALE_LOSS[Math.min(index, TOAST_STACK_SCALE_LOSS.length - 1)];
      entry.toast.style.setProperty("--toast-stack-shift", `${shift}px`);
      entry.toast.style.setProperty("--toast-stack-scale-loss", String(scaleLoss));
      entry.toast.style.setProperty("--toast-z", String(300 - index));
    });
  }

  function removeEntry(collection, entry) {
    const index = collection.indexOf(entry);
    if (index >= 0) {
      collection.splice(index, 1);
    }
  }

  function pruneToastState(state) {
    state.visible = state.visible.filter((entry) => {
      if (!entry || !(entry.toast instanceof HTMLElement)) {
        return false;
      }
      if (entry.toast.isConnected && entry.mounted) {
        return true;
      }

      stopToastTimers(entry);
      releaseToastInteractions(entry);
      entry.mounted = false;
      entry.dismissing = false;
      if (entry.settings.id && toastRegistry.get(entry.settings.id) === entry) {
        toastRegistry.delete(entry.settings.id);
      }
      return false;
    });

    state.queue = state.queue.filter((entry) => !!entry && !entry.dismissing);
  }

  function stopToastTimers(entry) {
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (entry.progressAnimation) {
      try {
        entry.progressAnimation.cancel();
      } catch {}
      entry.progressAnimation = null;
    }
    entry.lifecycleStartedAt = 0;
  }

  function getEntryRemainingDuration(entry) {
    if (!entry || !entry.settings || entry.settings.duration <= 0) {
      return 0;
    }
    if (!Number.isFinite(entry.remainingDuration)) {
      return entry.settings.duration;
    }
    return Math.max(0, Math.round(entry.remainingDuration));
  }

  function pauseToastLifecycle(entry) {
    if (
      !entry ||
      !entry.settings ||
      entry.settings.duration <= 0 ||
      entry.lifecyclePaused
    ) {
      return;
    }

    const baseDuration = getEntryRemainingDuration(entry);
    if (entry.lifecycleStartedAt > 0) {
      const elapsed = Math.max(0, Date.now() - entry.lifecycleStartedAt);
      entry.remainingDuration = Math.max(0, baseDuration - elapsed);
    } else {
      entry.remainingDuration = baseDuration;
    }

    entry.lifecyclePaused = true;
    stopToastTimers(entry);
  }

  function resumeToastLifecycle(entry) {
    if (
      !entry ||
      !entry.settings ||
      entry.settings.duration <= 0 ||
      !entry.lifecyclePaused
    ) {
      return;
    }

    entry.lifecyclePaused = false;
    startToastLifecycle(entry, { useRemaining: true });
  }

  function installToastInteractions(entry) {
    if (
      !entry ||
      !(entry.toast instanceof HTMLElement) ||
      entry.interactionsInstalled
    ) {
      return;
    }

    const toast = entry.toast;
    const onPointerEnter = () => {
      pauseToastLifecycle(entry);
    };
    const onPointerLeave = () => {
      resumeToastLifecycle(entry);
    };
    const onFocusIn = () => {
      pauseToastLifecycle(entry);
    };
    const onFocusOut = (event) => {
      const next = event.relatedTarget;
      if (next instanceof Node && toast.contains(next)) {
        return;
      }
      resumeToastLifecycle(entry);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      event.stopPropagation();
      dismissToastEntry(entry);
    };

    toast.addEventListener("pointerenter", onPointerEnter);
    toast.addEventListener("pointerleave", onPointerLeave);
    toast.addEventListener("focusin", onFocusIn);
    toast.addEventListener("focusout", onFocusOut);
    toast.addEventListener("keydown", onKeyDown);

    entry.interactionsInstalled = true;
    entry.interactionsCleanup = () => {
      toast.removeEventListener("pointerenter", onPointerEnter);
      toast.removeEventListener("pointerleave", onPointerLeave);
      toast.removeEventListener("focusin", onFocusIn);
      toast.removeEventListener("focusout", onFocusOut);
      toast.removeEventListener("keydown", onKeyDown);
      entry.interactionsInstalled = false;
    };
  }

  function releaseToastInteractions(entry) {
    if (!entry || typeof entry.interactionsCleanup !== "function") {
      if (entry) {
        entry.interactionsInstalled = false;
      }
      return;
    }
    entry.interactionsCleanup();
    entry.interactionsCleanup = null;
    entry.interactionsInstalled = false;
  }

  function getMostRecentVisibleToastEntry() {
    const visible = [...toastState.top.visible, ...toastState.bottom.visible]
      .filter(
        (entry) =>
          !!entry &&
          !!entry.mounted &&
          !!entry.toast &&
          entry.toast.isConnected &&
          !entry.dismissing
      )
      .sort((a, b) => (b.lastMountedAt || 0) - (a.lastMountedAt || 0));

    return visible[0] || null;
  }

  function installToastKeyboardShortcuts() {
    if (toastKeyboardShortcutsInstalled || !document) {
      return;
    }
    toastKeyboardShortcutsInstalled = true;

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const topEntry = getMostRecentVisibleToastEntry();
      if (!topEntry) {
        return;
      }

      event.stopPropagation();
      dismissToastEntry(topEntry);
    });
  }

  function stopSwipeRebound(entry) {
    if (entry && entry.swipe && entry.swipe.reboundTimer) {
      clearTimeout(entry.swipe.reboundTimer);
      entry.swipe.reboundTimer = null;
    }
  }

  function resetSwipeState(entry) {
    if (!entry || !(entry.toast instanceof HTMLElement)) {
      return;
    }

    stopSwipeRebound(entry);
    entry.toast.style.setProperty("--toast-swipe-x", "0px");
    entry.toast.classList.remove("is-swiping", "swipe-dismiss", "swipe-rebound");
  }

  function releaseToastSwipe(entry) {
    if (!entry || !entry.swipe || typeof entry.swipe.cleanup !== "function") {
      return;
    }
    entry.swipe.cleanup();
    entry.swipe.cleanup = null;
  }

  function installToastSwipe(entry) {
    if (
      !entry ||
      !(entry.toast instanceof HTMLElement) ||
      !isSwipeEnabled(entry) ||
      (entry.swipe && typeof entry.swipe.cleanup === "function")
    ) {
      return;
    }

    const toast = entry.toast;
    const state = {
      pointerId: null,
      active: false,
      startX: 0,
      startY: 0,
      startAt: 0,
      lastX: 0,
      lastY: 0,
      lastAt: 0,
      reboundTimer: null,
      cleanup: null,
    };
    entry.swipe = state;

    const onPointerDown = (event) => {
      if (entry.dismissing || event.isPrimary === false || event.button > 0) {
        return;
      }
      if (event.target instanceof Element && event.target.closest(".toast-close")) {
        return;
      }

      state.pointerId = event.pointerId;
      state.active = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.startAt = Date.now();
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastAt = state.startAt;
      stopSwipeRebound(entry);
      toast.classList.add("is-swiping");
      toast.classList.remove("swipe-rebound", "swipe-dismiss");
      pauseToastLifecycle(entry);

      if (typeof toast.setPointerCapture === "function") {
        try {
          toast.setPointerCapture(event.pointerId);
        } catch {}
      }
    };

    const onPointerMove = (event) => {
      if (!state.active || event.pointerId !== state.pointerId) {
        return;
      }

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastAt = Date.now();

      if (Math.abs(dy) > TOAST_SWIPE_MAX_CROSS_AXIS * 1.6) {
        return;
      }

      toast.style.setProperty("--toast-swipe-x", `${dx}px`);
    };

    const completeSwipe = (event) => {
      if (!state.active || event.pointerId !== state.pointerId) {
        return;
      }

      state.active = false;
      const dx = state.lastX - state.startX;
      const dy = state.lastY - state.startY;
      const elapsed = Math.max(1, state.lastAt - state.startAt);
      const velocity = Math.abs(dx) / elapsed;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const validSwipe =
        absDx >= TOAST_SWIPE_MIN_DISTANCE &&
        absDy <= TOAST_SWIPE_MAX_CROSS_AXIS &&
        velocity >= TOAST_SWIPE_MIN_VELOCITY;

      if (validSwipe) {
        toast.classList.remove("is-swiping", "swipe-rebound");
        toast.classList.add("swipe-dismiss");
        const direction = dx >= 0 ? 1 : -1;
        const targetOffset = Math.round((window.innerWidth * TOAST_SWIPE_DISMISS_OFFSET_VW) / 100);
        toast.style.setProperty("--toast-swipe-x", `${direction * targetOffset}px`);

        if (prefersReducedMotion) {
          dismissToastEntry(entry);
          return;
        }

        setTimeout(() => {
          dismissToastEntry(entry);
        }, 110);
        return;
      }

      toast.classList.remove("is-swiping", "swipe-dismiss");
      toast.classList.add("swipe-rebound");
      toast.style.setProperty("--toast-swipe-x", "0px");
      state.reboundTimer = setTimeout(() => {
        toast.classList.remove("swipe-rebound");
        state.reboundTimer = null;
      }, prefersReducedMotion ? 1 : 220);
      resumeToastLifecycle(entry);
    };

    const onPointerCancel = (event) => {
      if (!state.active || event.pointerId !== state.pointerId) {
        return;
      }
      state.active = false;
      toast.classList.remove("is-swiping", "swipe-dismiss");
      toast.classList.add("swipe-rebound");
      toast.style.setProperty("--toast-swipe-x", "0px");
      state.reboundTimer = setTimeout(() => {
        toast.classList.remove("swipe-rebound");
        state.reboundTimer = null;
      }, prefersReducedMotion ? 1 : 220);
      resumeToastLifecycle(entry);
    };

    toast.addEventListener("pointerdown", onPointerDown);
    toast.addEventListener("pointermove", onPointerMove);
    toast.addEventListener("pointerup", completeSwipe);
    toast.addEventListener("pointercancel", onPointerCancel);
    toast.addEventListener("lostpointercapture", onPointerCancel);

    state.cleanup = () => {
      toast.removeEventListener("pointerdown", onPointerDown);
      toast.removeEventListener("pointermove", onPointerMove);
      toast.removeEventListener("pointerup", completeSwipe);
      toast.removeEventListener("pointercancel", onPointerCancel);
      toast.removeEventListener("lostpointercapture", onPointerCancel);
      stopSwipeRebound(entry);
      if (entry && entry.swipe) {
        entry.swipe.active = false;
      }
    };
  }

  function applyToastContent(entry) {
    const { settings, toast } = entry;
    const classes = ["dynamic-toast", `toast-kind-${settings.kind}`];
    if (settings.customClass) {
      classes.push(settings.customClass);
    }
    toast.className = classes.join(" ");
    toast.dataset.toastKind = settings.kind;
    toast.dataset.toastPosition = settings.position;
    toast.setAttribute("role", settings.role);
    toast.setAttribute("aria-live", settings.ariaLive);
    toast.setAttribute("aria-atomic", "true");
    toast.tabIndex = -1;
    if (settings.id) {
      toast.id = settings.id;
    } else {
      toast.removeAttribute("id");
    }

    const fragment = document.createDocumentFragment();
    if (settings.iconClass) {
      const icon = document.createElement("i");
      icon.className = `${settings.iconClass} toast-icon`.trim();
      if (settings.iconColor) {
        icon.dataset.iconColor = settings.iconColor;
      }
      icon.setAttribute("aria-hidden", "true");
      fragment.appendChild(icon);
    }

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = entry.message;
    fragment.appendChild(text);

    if (settings.closeButton) {
      const isFaLocale = (document.documentElement.lang || "")
        .toLowerCase()
        .startsWith("fa");
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "toast-close";
      closeBtn.setAttribute(
        "aria-label",
        isFaLocale ? "بستن پیام" : "Close message"
      );
      closeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
      closeBtn.addEventListener(
        "click",
        () => dismissToastEntry(entry),
        { once: true }
      );
      fragment.appendChild(closeBtn);
    }

    const progress = document.createElement("span");
    progress.className = "toast-progress";
    progress.setAttribute("aria-hidden", "true");
    fragment.appendChild(progress);

    toast.replaceChildren(fragment);
  }

  function startToastProgress(entry, durationOverride) {
    const progress = entry.toast.querySelector(".toast-progress");
    if (!(progress instanceof HTMLElement)) {
      return;
    }

    const duration =
      Number.isFinite(durationOverride) && durationOverride >= 0
        ? Math.round(durationOverride)
        : entry.settings.duration;
    progress.hidden = duration <= 0;
    if (prefersReducedMotion || duration <= 0) {
      return;
    }

    if (typeof progress.animate !== "function") {
      return;
    }

    try {
      entry.progressAnimation = progress.animate(
        [
          { transform: "scaleX(1)" },
          { transform: "scaleX(0)" },
        ],
        {
          duration,
          easing: "linear",
          fill: "forwards",
        }
      );
    } catch {}
  }

  function startToastLifecycle(entry, options = {}) {
    const useRemaining = !!options.useRemaining;
    stopToastTimers(entry);
    const duration =
      entry.settings.duration > 0
        ? useRemaining
          ? getEntryRemainingDuration(entry)
          : entry.settings.duration
        : 0;
    entry.remainingDuration = duration;
    entry.lifecycleStartedAt = duration > 0 ? Date.now() : 0;
    startToastProgress(entry, duration);

    if (duration > 0) {
      entry.timer = setTimeout(() => {
        dismissToastEntry(entry);
      }, duration);
    }
  }

  function refreshVisibleToast(entry) {
    if (!entry.mounted || !entry.toast) {
      return;
    }

    entry.dismissing = false;
    entry.lifecyclePaused = false;
    entry.remainingDuration = entry.settings.duration;
    entry.lifecycleStartedAt = 0;
    entry.lastMountedAt = Date.now();
    resetSwipeState(entry);
    applyToastContent(entry);
    entry.toast.classList.add("show");
    entry.toast.classList.remove("is-closing");
    installToastInteractions(entry);
    startToastLifecycle(entry);
    syncToastStack(entry.state || getToastState(entry.settings.position));
  }

  function mountToastEntry(entry) {
    const state = entry.state || getToastState(entry.settings.position);
    const viewport = ensureToastViewport(state.position);
    if (!viewport) {
      return;
    }

    entry.state = state;
    entry.mounted = true;
    entry.dismissing = false;
    entry.lifecyclePaused = false;
    entry.remainingDuration = entry.settings.duration;
    entry.lifecycleStartedAt = 0;
    entry.lastMountedAt = Date.now();
    resetSwipeState(entry);
    applyToastContent(entry);
    viewport.appendChild(entry.toast);
    state.visible.push(entry);
    syncToastStack(state);
    installToastSwipe(entry);
    installToastInteractions(entry);

    requestAnimationFrame(() => {
      if (!entry.mounted) {
        return;
      }

      entry.toast.classList.add("show");
      startToastLifecycle(entry);

      if (typeof window.__ruToastFeedback === "function") {
        try {
          window.__ruToastFeedback();
        } catch {}
      }
    });
  }

  function flushToastQueue(position) {
    const state = getToastState(position);
    ensureToastViewport(position);
    pruneToastState(state);

    while (
      state.visible.length < TOAST_LIMIT_PER_POSITION &&
      state.queue.length > 0
    ) {
      const next = state.queue.shift();
      if (!next) {
        continue;
      }

      if (next.dismissing) {
        continue;
      }

      mountToastEntry(next);
    }
    syncToastStack(state);
  }

  function dismissToastEntry(entry) {
    if (!entry || entry.dismissing) {
      return;
    }

    entry.dismissing = true;
    stopToastTimers(entry);
    stopSwipeRebound(entry);

    if (!entry.mounted || !(entry.toast instanceof HTMLElement)) {
      const queuedState = entry.state || getToastState(entry.settings.position);
      removeEntry(queuedState.queue, entry);
      if (entry.settings.id && toastRegistry.get(entry.settings.id) === entry) {
        toastRegistry.delete(entry.settings.id);
      }
      releaseToastSwipe(entry);
      releaseToastInteractions(entry);
      entry.dismissing = false;
      return;
    }

    const { toast } = entry;
    toast.classList.remove("show");
    toast.classList.add("is-closing");

    let finalized = false;
    const finalize = () => {
      if (finalized) {
        return;
      }
      finalized = true;

      const state = entry.state || getToastState(entry.settings.position);
      removeEntry(state.visible, entry);
      removeEntry(state.queue, entry);
      if (entry.settings.id && toastRegistry.get(entry.settings.id) === entry) {
        toastRegistry.delete(entry.settings.id);
      }
      releaseToastSwipe(entry);
      releaseToastInteractions(entry);
      toast.remove();
      entry.mounted = false;
      entry.dismissing = false;
      flushToastQueue(state.position);
      syncToastStack(state);
    };

    toast.addEventListener(
      "transitionend",
      (event) => {
        if (event.target === toast) {
          finalize();
        }
      },
      { once: true }
    );
    setTimeout(finalize, TOAST_EXIT_FALLBACK_MS);
  }

  function createToastEntry(message, optionsOrType) {
    if (!message && message !== 0) {
      return null;
    }
    if (!document.body) {
      console.warn("Cannot show toast: document.body not ready");
      return null;
    }

    const settings = normalizeToastOptions(optionsOrType);
    const text = String(message);

    pruneToastState(toastState.top);
    pruneToastState(toastState.bottom);

    if (settings.id && toastRegistry.has(settings.id)) {
      const entry = toastRegistry.get(settings.id);
      entry.message = text;
      entry.settings = {
        ...entry.settings,
        ...settings,
        position: entry.mounted ? entry.settings.position : settings.position,
      };

      if (entry.mounted) {
        refreshVisibleToast(entry);
        return entry;
      }

      const targetState = getToastState(entry.settings.position);
      removeEntry(toastState.top.queue, entry);
      removeEntry(toastState.bottom.queue, entry);
      entry.state = targetState;
      targetState.queue.push(entry);
      flushToastQueue(targetState.position);
      return entry;
    }

    const entry = {
      message: text,
      settings,
      state: getToastState(settings.position),
      toast: document.createElement("div"),
      timer: null,
      progressAnimation: null,
      dismissing: false,
      mounted: false,
      swipe: null,
      remainingDuration: settings.duration,
      lifecycleStartedAt: 0,
      lifecyclePaused: false,
      interactionsInstalled: false,
      interactionsCleanup: null,
      lastMountedAt: 0,
    };

    if (settings.id) {
      toastRegistry.set(settings.id, entry);
    }

    entry.state.queue.push(entry);
    flushToastQueue(entry.state.position);
    return entry;
  }

  /**
   * Unified toast API.
   * Backward compatible signatures:
   *  - createToast(message, "success"|"error"|"info"|"default")
   *  - createToast(message, options)
   */
  function createToast(message, optionsOrType) {
    const entry = createToastEntry(message, optionsOrType);
    return entry ? entry.toast : null;
  }

  // Expose the unified toast API globally.
  window.createToast = createToast;
  installToastKeyboardShortcuts();

  function getNetworkMessage(online) {
    const strings = window.langStrings || {};
    const keyOrder = online
      ? ["backOnline", "online", "connectionRestored"]
      : ["offline", "connectionLost"];

    for (const key of keyOrder) {
      const value = strings[key];
      if (typeof value === "function") {
        const result = value();
        if (typeof result === "string" && result.trim()) {
          return result;
        }
      } else if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    return online
      ? "Connection restored."
      : "You are offline. Some features may be unavailable.";
  }

  function emitNetworkStatusEvent(online) {
    const detail = { online, timestamp: Date.now() };
    try {
      window.dispatchEvent(
        new CustomEvent(NETWORK_EVENT_NAME, {
          detail,
        })
      );
    } catch (err) {
      // CustomEvent fallback for old browsers.
      try {
        const event = document.createEvent("CustomEvent");
        event.initCustomEvent(NETWORK_EVENT_NAME, false, false, detail);
        window.dispatchEvent(event);
      } catch {}
    }
  }

  function updateNetworkState(online, notify) {
    const isOnline = !!online;

    document.documentElement.classList.toggle("online", isOnline);
    document.documentElement.classList.toggle("offline", !isOnline);
    document.documentElement.setAttribute("data-network-status", isOnline ? "online" : "offline");

    if (document.body) {
      document.body.classList.toggle("online", isOnline);
      document.body.classList.toggle("offline", !isOnline);
    }

    emitNetworkStatusEvent(isOnline);

    if (!notify || typeof window.createToast !== "function") {
      return;
    }

    const now = Date.now();
    if (now - lastNetworkToastAt < 1200) {
      return;
    }
    lastNetworkToastAt = now;
    window.createToast(getNetworkMessage(isOnline), {
      id: "network-status-toast",
      kind: isOnline ? "success" : "info",
      duration: 2600,
    });
  }

  function installNetworkResilience() {
    const initialOnline = navigator.onLine !== false;
    updateNetworkState(initialOnline, false);
    window.addEventListener("online", () => updateNetworkState(true, true));
    window.addEventListener("offline", () => updateNetworkState(false, true));
  }

  function toSameOriginUrl(rawUrl) {
    if (!rawUrl) {
      return null;
    }

    try {
      const parsed = new URL(rawUrl, window.location.href);
      if (parsed.origin !== window.location.origin) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function resolveAssetFallback(rawUrl) {
    const parsed = toSameOriginUrl(rawUrl);
    if (!parsed) {
      return null;
    }

    const next = new URL(parsed.toString());
    const path = next.pathname;

    if (/\.min\.js$/i.test(path)) {
      next.pathname = path.replace(/\.min\.js$/i, ".js");
      return next.toString();
    }

    if (/\.min\.css$/i.test(path)) {
      next.pathname = path.replace(/\.min\.css$/i, ".css");
      return next.toString();
    }

    return null;
  }

  function markAssetFallbackAttempt(target, originalUrl, fallbackUrl) {
    const key = `${originalUrl}::${fallbackUrl}`;
    if (assetFallbackAttempts.has(key)) {
      return false;
    }

    assetFallbackAttempts.add(key);
    target.setAttribute("data-asset-failed", "true");
    document.documentElement.classList.add(ASSET_FALLBACK_CLASS);
    const currentCount = Number(document.documentElement.dataset.assetFallbackCount || "0");
    document.documentElement.dataset.assetFallbackCount = String(currentCount + 1);
    return true;
  }

  function injectScriptFallback(target, fallbackUrl) {
    const script = document.createElement("script");
    script.src = fallbackUrl;
    script.defer = !!target.defer;
    script.async = !!target.async;
    if (target.type) {
      script.type = target.type;
    }
    if (target.crossOrigin) {
      script.crossOrigin = target.crossOrigin;
    }
    if (target.referrerPolicy) {
      script.referrerPolicy = target.referrerPolicy;
    }
    if (target.nonce) {
      script.nonce = target.nonce;
    }
    script.setAttribute("data-asset-fallback", "true");
    script.setAttribute("data-asset-fallback-from", target.src || "");
    script.addEventListener(
      "error",
      () => {
        document.documentElement.classList.add(ASSET_FALLBACK_FAILED_CLASS);
      },
      { once: true }
    );
    target.insertAdjacentElement("afterend", script);
  }

  function injectStylesheetFallback(target, fallbackUrl) {
    if ((target.rel || "").toLowerCase() !== "stylesheet") {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fallbackUrl;
    if (target.media) {
      link.media = target.media;
    }
    if (target.crossOrigin) {
      link.crossOrigin = target.crossOrigin;
    }
    if (target.referrerPolicy) {
      link.referrerPolicy = target.referrerPolicy;
    }
    if (target.nonce) {
      link.nonce = target.nonce;
    }
    link.setAttribute("data-asset-fallback", "true");
    link.setAttribute("data-asset-fallback-from", target.href || "");
    link.addEventListener(
      "error",
      () => {
        document.documentElement.classList.add(ASSET_FALLBACK_FAILED_CLASS);
      },
      { once: true }
    );
    target.insertAdjacentElement("afterend", link);
  }

  function installAssetFallbackResilience() {
    window.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (!target || target === window) {
          return;
        }

        if (
          typeof HTMLScriptElement !== "undefined" &&
          target instanceof HTMLScriptElement
        ) {
          const originalUrl = target.src || "";
          const fallbackUrl = resolveAssetFallback(originalUrl);
          if (!fallbackUrl) {
            return;
          }

          if (!markAssetFallbackAttempt(target, originalUrl, fallbackUrl)) {
            return;
          }

          injectScriptFallback(target, fallbackUrl);
          return;
        }

        if (
          typeof HTMLLinkElement !== "undefined" &&
          target instanceof HTMLLinkElement
        ) {
          const originalUrl = target.href || "";
          const fallbackUrl = resolveAssetFallback(originalUrl);
          if (!fallbackUrl) {
            return;
          }

          if (!markAssetFallbackAttempt(target, originalUrl, fallbackUrl)) {
            return;
          }

          injectStylesheetFallback(target, fallbackUrl);
        }
      },
      true
    );
  }

  installNetworkResilience();
  installAssetFallbackResilience();

  /**
   * Apply theme and sync toggle + a11y attributes.
   * @param {"dark"|"light"} theme
   * @param {boolean} [showToast=false]
   */
  function applyTheme(theme, showToast) {
    const isDark = theme === "dark";
    const shouldShowToast = !!showToast;

    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);

    // Optional: expose theme on <html> for CSS theming
    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.checked = isDark;
      toggle.setAttribute("aria-checked", String(isDark));
    }

    if (
      shouldShowToast &&
      typeof window.langStrings.themeChanged === "function"
    ) {
      // themeChanged(theme) → localized message
      const msg = window.langStrings.themeChanged(theme);
      if (msg) {
        createToast(msg, {
          id: "theme-change-toast",
          kind: "info",
          customClass: "theme-toast",
          duration: 1800,
          position: "top",
        });
      }
    }
  }

  // Initial theme: stored preference > system preference
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
  } else {
    applyTheme(prefersDark ? "dark" : "light");
  }

  // React to OS theme changes only if user has not explicitly chosen a theme
  if (darkMediaQuery) {
    const handleThemeSystemChange = function (e) {
      // If user later sets a theme, this check prevents overriding it
      if (!readStoredTheme()) {
        applyTheme(e.matches ? "dark" : "light");
      }
    };

    if (typeof darkMediaQuery.addEventListener === "function") {
      darkMediaQuery.addEventListener("change", handleThemeSystemChange);
    } else if (typeof darkMediaQuery.addListener === "function") {
      // Older browsers
      darkMediaQuery.addListener(handleThemeSystemChange);
    }
  }

  /**
   * Initialize theme toggle (can be called multiple times safely).
   */
  function initThemeToggle() {
    const themeToggleInput = document.getElementById("theme-toggle");
    if (!themeToggleInput) {return;}

    // Avoid attaching listeners multiple times on dynamic includes
    if (themeToggleInput.dataset.themeToggleInit === "true") {
      return;
    }
    themeToggleInput.dataset.themeToggleInit = "true";

    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "dark" || currentTheme === "light") {
      themeToggleInput.checked = currentTheme === "dark";
    }

    // Sync ARIA
    themeToggleInput.setAttribute(
      "aria-checked",
      String(!!themeToggleInput.checked)
    );
    themeToggleInput.setAttribute("role", "switch");

    // Change by click
    themeToggleInput.addEventListener("change", () => {
      const newTheme = themeToggleInput.checked ? "dark" : "light";
      applyTheme(newTheme, true);
      try {
        storage?.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (err) {
        // Ignore storage failures (e.g., private mode)
      }
    });

    // Keyboard accessibility (Space / Enter)
    themeToggleInput.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        themeToggleInput.checked = !themeToggleInput.checked;
        const newTheme = themeToggleInput.checked ? "dark" : "light";
        applyTheme(newTheme, true);
        try {
          storage?.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (err) {}
      }
    });
  }

  // Init theme toggle on first load
  initThemeToggle();
  // Re-init if header/footer includes loaded dynamically
  document.addEventListener("includesLoaded", initThemeToggle, false);

  // ---- End-of-page toast logic ----

  let endOfPageShown = false;
  let lastScrollY = 0;
  let ticking = false;

  function checkPageEnd() {
    const scrollPosition = window.innerHeight + lastScrollY;
    const docHeight =
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      ) || 0;

    // Reset flag if user scrolls back up (more than 100px from bottom)
    if (scrollPosition < docHeight - 100) {
      endOfPageShown = false;
    }

    if (!endOfPageShown && scrollPosition >= docHeight - 50 && docHeight > 0) {
      endOfPageShown = true;
      if (typeof window.langStrings.endOfPage === "string") {
        createToast(window.langStrings.endOfPage, {
          id: "end-of-page-toast",
          kind: "info",
          customClass: "end-of-page-toast",
          duration: 3200,
        });
      } else if (typeof window.langStrings.endOfPage === "function") {
        const msg = window.langStrings.endOfPage();
        if (msg) {
          createToast(msg, {
            id: "end-of-page-toast",
            kind: "info",
            customClass: "end-of-page-toast",
            duration: 3200,
          });
        }
      }
    }
    ticking = false;
  }

  function updateProgressBar() {
    const progressBar = document.getElementById("scroll-progress-bar");
    if (!progressBar) {return;}

    const scrollTop =
      window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    if (docHeight <= 0) {
      progressBar.style.width = "0%";
      progressBar.setAttribute("aria-valuenow", "0");
      return;
    }

    const scrollPercent = (scrollTop / docHeight) * 100;
    const clamped = Math.max(0, Math.min(100, scrollPercent));

    progressBar.style.width = clamped + "%";
    progressBar.setAttribute("aria-valuenow", Math.round(clamped));
  }

  window.addEventListener(
    "scroll",
    () => {
      lastScrollY = window.scrollY || window.pageYOffset || 0;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkPageEnd();
          updateProgressBar();
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  // Footer year
  const yearEl =
    document.getElementById("current-year") ||
    document.getElementById("footer-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Back to Top Button Logic
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    window.addEventListener(
      "scroll",
      () => {
        if (window.scrollY > 300) {
          backToTopBtn.classList.add("show");
        } else {
          backToTopBtn.classList.remove("show");
        }
      },
      { passive: true }
    );

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }

  function resolveCopyToastMessage(kind, subject = "email") {
    const strings = window.langStrings || {};
    const keyOrder = {
      success:
        subject === "link"
          ? ["linkCopied", "copySuccess"]
          : ["copySuccess", "emailCopied"],
      error: ["copyError", "emailCopyError"],
      unsupported: ["copyUnsupported", "clipboardUnsupported"],
    };

    const keys = keyOrder[kind] || [];
    for (const key of keys) {
      const value = strings[key];
      if (typeof value === "function") {
        const message = value();
        if (typeof message === "string" && message.trim()) {return message;}
      } else if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    const isFa = (document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("fa");

    const fallback = {
      success: isFa
        ? subject === "link"
          ? "\u0644\u06cc\u0646\u06a9 \u06a9\u067e\u06cc \u0634\u062f."
          : "\u0627\u06cc\u0645\u06cc\u0644 \u06a9\u067e\u06cc \u0634\u062f."
        : subject === "link"
          ? "Link copied."
          : "Email copied.",
      error: isFa
        ? "\u06a9\u067e\u06cc \u0628\u0627 \u0645\u0634\u06a9\u0644 \u0645\u0648\u0627\u062c\u0647 \u0634\u062f."
        : "Copy failed.",
      unsupported: isFa
        ? "\u0645\u0631\u0648\u0631\u06af\u0631 \u0634\u0645\u0627 \u0627\u0632 \u06a9\u067e\u06cc \u062e\u0648\u062f\u06a9\u0627\u0631 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc \u0646\u0645\u06cc\u200c\u06a9\u0646\u062f."
        : "Your browser does not support automatic copy.",
    };

    return fallback[kind] || fallback.error;
  }

  function resolveShareToastMessage(kind) {
    const strings = window.langStrings || {};
    const keyOrder = {
      success: ["shareOk", "shareSuccess"],
      error: ["shareErr", "shareError"],
    };
    const keys = keyOrder[kind] || [];

    for (const key of keys) {
      const value = strings[key];
      if (typeof value === "function") {
        const message = value();
        if (typeof message === "string" && message.trim()) {
          return message;
        }
      } else if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    const isFa = (document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("fa");
    const fallback = {
      success: isFa
        ? "\u0627\u0634\u062a\u0631\u0627\u06a9\u200c\u06af\u0630\u0627\u0631\u06cc \u0645\u0648\u0641\u0642 \u0628\u0648\u062f."
        : "Shared successfully.",
      error: isFa
        ? "\u0627\u0634\u062a\u0631\u0627\u06a9\u200c\u06af\u0630\u0627\u0631\u06cc \u0628\u0627 \u0645\u0634\u06a9\u0644 \u0645\u0648\u0627\u062c\u0647 \u0634\u062f."
        : "Sharing failed.",
    };

    return fallback[kind] || fallback.error;
  }

  function copyWithExecCommand(text) {
    if (!document.body) {
      return false;
    }

    const probe = document.createElement("textarea");
    probe.value = text;
    probe.setAttribute("readonly", "");
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.top = "0";
    document.body.appendChild(probe);
    probe.select();

    try {
      return !!document.execCommand("copy");
    } catch {
      return false;
    } finally {
      probe.remove();
    }
  }

  async function copyText(text, options = {}) {
    const allowExecCommand = options.allowExecCommand === true;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { ok: true, mode: "clipboard" };
      } catch {}
    }

    if (allowExecCommand && copyWithExecCommand(text)) {
      return { ok: true, mode: "exec-command" };
    }

    return {
      ok: false,
      mode:
        navigator.clipboard && navigator.clipboard.writeText
          ? "clipboard-failed"
          : "unsupported",
    };
  }

  function emitToast(message, options) {
    if (!message || typeof window.createToast !== "function") {
      return;
    }
    window.createToast(message, options);
  }

  function showCopySuccessState(btn) {
    const originalIcon = btn.innerHTML;
    btn.innerHTML =
      '<i class="fas fa-check" aria-hidden="true"></i>';
    btn.classList.add("copied");

    setTimeout(() => {
      btn.innerHTML = originalIcon;
      btn.classList.remove("copied");
    }, 2000);
  }

  function bindCopyButton(btn) {
    if (!(btn instanceof HTMLButtonElement)) {
      return;
    }
    if (btn.dataset.toastCopyBound === "true") {
      return;
    }
    btn.dataset.toastCopyBound = "true";

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const textToCopy = btn.getAttribute("data-copy");
      if (!textToCopy) {
        console.warn("No data-copy attribute found on .copy-btn");
        return;
      }
      const subject = textToCopy.includes("@") ? "email" : "link";

      const result = await copyText(textToCopy, {
        allowExecCommand: false,
      });
      if (result.ok) {
        showCopySuccessState(btn);
        emitToast(resolveCopyToastMessage("success", subject), {
          id: "copy-success-toast",
          kind: "success",
          duration: 1800,
        });
        return;
      }

      const failedKind =
        result.mode === "unsupported"
          ? "unsupported"
          : "error";
      emitToast(resolveCopyToastMessage(failedKind), {
        id:
          failedKind === "unsupported"
            ? "copy-unsupported-toast"
            : "copy-error-toast",
        kind: failedKind === "unsupported" ? "info" : "error",
        duration: failedKind === "unsupported" ? 3000 : 2600,
      });
    });
  }

  function bindShareButton(btn) {
    if (!(btn instanceof HTMLButtonElement)) {
      return;
    }
    if (btn.dataset.toastShareBound === "true") {
      return;
    }
    btn.dataset.toastShareBound = "true";

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const shareUrl = btn.getAttribute("data-share") || window.location.href;
      if (!shareUrl) {
        return;
      }

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: document.title,
            url: shareUrl,
          });
          emitToast(resolveShareToastMessage("success"), {
            id: "share-success-toast",
            kind: "success",
            duration: 1800,
          });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") {
            return;
          }
        }
      }

      const copied = await copyText(shareUrl, {
        allowExecCommand: true,
      });
      if (copied.ok) {
        emitToast(resolveCopyToastMessage("success", "link"), {
          id: "share-copy-toast",
          kind: "success",
          duration: 2000,
        });
        return;
      }

      emitToast(resolveShareToastMessage("error"), {
        id: "share-error-toast",
        kind: "error",
        duration: 2800,
      });
    });
  }

  // Copy/share interactions (global + proof cards)
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    bindCopyButton(btn);
  });
  document.querySelectorAll(".share-btn").forEach((btn) => {
    bindShareButton(btn);
  });

  // ---- Neurodesign Enhancements Initialization ----

  // 1. Scroll Progress Bar Logic is handled by updateProgressBar() and existing HTML

  // 2. Ripple Effect for Buttons
  document.addEventListener("click", function (e) {
    const origin = e.target;
    if (!(origin instanceof Element)) {
      return;
    }

    const target = origin.closest(".btn, button, .cta-button, .hero-btn");
    if (target) {
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      target.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  });

  // 3. Success Trigger Helper
  window.triggerSuccess = function (element) {
    if (!element) {return;}
    element.classList.add("success-trigger");
    setTimeout(() => {
      element.classList.remove("success-trigger");
    }, 300);
  };

})();
