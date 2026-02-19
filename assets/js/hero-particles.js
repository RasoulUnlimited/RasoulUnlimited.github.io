document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("hero");
  if (!hero) {
    return;
  }

  const canvas = document.getElementById("hero-particles");
  const heroImage = hero.querySelector(".profile-image");
  const ctx = canvas instanceof HTMLCanvasElement ? canvas.getContext("2d") : null;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const coarsePointerQuery = window.matchMedia
    ? window.matchMedia("(pointer: coarse)")
    : null;

  const MIN_FULL_MOTION_VIEWPORT = 1100;
  const PARTICLE_DENSITY = 22000;
  const MIN_PARTICLES = 16;
  const MAX_PARTICLES = 72;
  const TARGET_FPS = 30;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  let motionMode = "full";
  let heroVisible = true;
  let pageVisible = !document.hidden;
  let particlesEnabled = false;
  let rafId = null;
  let resizeTimer = null;
  let destroyed = false;
  let particles = [];
  let lastFrameTime = 0;
  let colorCache = { r: 59, g: 130, b: 246 };
  let colorCacheTs = 0;
  let canvasObserver = null;
  let themeObserver = null;

  const mouse = {
    x: null,
    y: null,
    radius: 135,
  };

  function isNetworkConstrained() {
    if (!connection) {
      return false;
    }

    const saveData = Boolean(connection.saveData);
    const type = String(connection.effectiveType || "").toLowerCase();
    return saveData || type.includes("2g") || type.includes("slow-2g");
  }

  function isLowPowerDevice() {
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    const fewCores = cores > 0 && cores <= 4;
    const lowMemory = memory > 0 && memory <= 4;
    return fewCores || lowMemory;
  }

  function resolveMotionMode() {
    if (reducedMotionQuery?.matches || isNetworkConstrained()) {
      return "off";
    }

    const isBoundaryViewport = window.innerWidth < MIN_FULL_MOTION_VIEWPORT;
    if (coarsePointerQuery?.matches || isBoundaryViewport || isLowPowerDevice()) {
      return "lite";
    }

    return "full";
  }

  function setMotionMode(nextMode) {
    if (motionMode === nextMode && hero.dataset.heroMotion === nextMode) {
      return;
    }

    motionMode = nextMode;
    hero.dataset.heroMotion = nextMode;
    syncTiltMode();
    syncParticlesMode();
  }

  function shouldAnimateParticles() {
    return (
      !destroyed &&
      motionMode === "full" &&
      heroVisible &&
      pageVisible &&
      Boolean(ctx)
    );
  }

  function resizeCanvas() {
    if (!canvas || !ctx) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight));
    canvas.width = width;
    canvas.height = height;
  }

  function updateColorCache() {
    const now = Date.now();
    if (now - colorCacheTs < 900) {
      return;
    }

    colorCacheTs = now;
    const fromCss = getComputedStyle(document.documentElement)
      .getPropertyValue("--particle-color")
      .trim();

    const match = (fromCss || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (match) {
      colorCache = {
        r: Number.parseInt(match[1], 10),
        g: Number.parseInt(match[2], 10),
        b: Number.parseInt(match[3], 10),
      };
    }
  }

  class Particle {
    constructor(x, y, vx, vy, size) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.size = size;
    }

    draw() {
      if (!ctx) {
        return;
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colorCache.r}, ${colorCache.g}, ${colorCache.b}, 0.42)`;
      ctx.fill();
    }

    update() {
      if (!canvas) {
        return;
      }

      if (this.x > canvas.width || this.x < 0) {
        this.vx = -this.vx;
      }
      if (this.y > canvas.height || this.y < 0) {
        this.vy = -this.vy;
      }

      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius + this.size) {
          this.x -= dx * 0.008;
          this.y -= dy * 0.008;
        }
      }

      this.x += this.vx;
      this.y += this.vy;
      this.draw();
    }
  }

  function initParticles() {
    if (!canvas) {
      return;
    }

    particles = [];
    const count = Math.min(
      MAX_PARTICLES,
      Math.max(MIN_PARTICLES, Math.floor((canvas.width * canvas.height) / PARTICLE_DENSITY))
    );

    for (let i = 0; i < count; i += 1) {
      const size = Math.random() * 2.8 + 1;
      const x = Math.random() * Math.max(1, canvas.width - size * 2) + size;
      const y = Math.random() * Math.max(1, canvas.height - size * 2) + size;
      const vx = Math.random() * 1.1 - 0.55;
      const vy = Math.random() * 1.1 - 0.55;
      particles.push(new Particle(x, y, vx, vy, size));
    }
  }

  function drawConnections() {
    if (!ctx || !canvas || particles.length < 2) {
      return;
    }

    const maxDistanceSq = Math.min(20000, (canvas.width * canvas.height) / 42);
    const lineLimit = 6;

    for (let i = 0; i < particles.length; i += 1) {
      let linked = 0;
      for (let j = i + 1; j < particles.length && linked < lineLimit; j += 1) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < maxDistanceSq) {
          const alpha = Math.max(0, 0.26 - distanceSq / (maxDistanceSq * 3.8));
          ctx.strokeStyle = `rgba(${colorCache.r}, ${colorCache.g}, ${colorCache.b}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          linked += 1;
        }
      }
    }
  }

  function stopParticles() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function renderParticles(ts) {
    if (!particlesEnabled || destroyed || !ctx || !canvas) {
      rafId = null;
      return;
    }

    if (ts - lastFrameTime < FRAME_INTERVAL) {
      rafId = requestAnimationFrame(renderParticles);
      return;
    }

    lastFrameTime = ts;
    updateColorCache();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i += 1) {
      particles[i].update();
    }
    drawConnections();

    rafId = requestAnimationFrame(renderParticles);
  }

  function setParticlesMode(active) {
    if (!canvas || !ctx) {
      return;
    }

    if (active === particlesEnabled) {
      canvas.dataset.particlesState = active ? "active" : "disabled";
      return;
    }

    particlesEnabled = active;
    canvas.dataset.particlesState = active ? "active" : "disabled";

    if (!active) {
      stopParticles();
      return;
    }

    resizeCanvas();
    updateColorCache();
    initParticles();
    lastFrameTime = 0;
    if (rafId === null) {
      rafId = requestAnimationFrame(renderParticles);
    }
  }

  function syncParticlesMode() {
    setParticlesMode(shouldAnimateParticles());
  }

  let tiltEnabled = false;

  function syncTiltMode() {
    const next = motionMode === "full" && !document.hidden && heroImage instanceof HTMLElement;
    tiltEnabled = Boolean(next);
    hero.dataset.heroTilt = tiltEnabled ? "enabled" : "disabled";

    if (!tiltEnabled && heroImage instanceof HTMLElement) {
      heroImage.style.transform = "";
    }
  }

  function onHeroPointerMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;

    if (!tiltEnabled || !(heroImage instanceof HTMLElement)) {
      return;
    }

    const rect = hero.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const rx = (event.clientX - rect.left) / rect.width;
    const ry = (event.clientY - rect.top) / rect.height;
    const rotateY = (rx - 0.5) * 10;
    const rotateX = (ry - 0.5) * -10;

    heroImage.style.transform = `perspective(920px) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(1.025)`;
  }

  function onHeroPointerLeave() {
    mouse.x = null;
    mouse.y = null;
    if (heroImage instanceof HTMLElement) {
      heroImage.style.transform = "";
    }
  }

  function onVisibilityChange() {
    pageVisible = !document.hidden;
    syncTiltMode();
    syncParticlesMode();
  }

  function onMediaOrNetworkChange() {
    setMotionMode(resolveMotionMode());
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCanvas();
      setMotionMode(resolveMotionMode());
      if (particlesEnabled) {
        initParticles();
      }
    }, 140);
  }

  function cleanup() {
    destroyed = true;
    clearTimeout(resizeTimer);
    stopParticles();

    if (canvas) {
      canvas.dataset.particlesState = "disabled";
    }
    hero.dataset.heroTilt = "disabled";

    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", cleanup);
    window.removeEventListener("pagehide", cleanup);
    hero.removeEventListener("pointermove", onHeroPointerMove);
    hero.removeEventListener("pointerleave", onHeroPointerLeave);

    if (canvasObserver) {
      canvasObserver.disconnect();
      canvasObserver = null;
    }
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    reducedMotionQuery?.removeEventListener?.("change", onMediaOrNetworkChange);
    coarsePointerQuery?.removeEventListener?.("change", onMediaOrNetworkChange);
    connection?.removeEventListener?.("change", onMediaOrNetworkChange);

    reducedMotionQuery?.removeListener?.(onMediaOrNetworkChange);
    coarsePointerQuery?.removeListener?.(onMediaOrNetworkChange);
    connection?.removeListener?.(onMediaOrNetworkChange);
  }

  if (canvas) {
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.particlesState = "disabled";
  }

  hero.dataset.heroMotion = "off";
  hero.dataset.heroTilt = "disabled";

  hero.addEventListener("pointermove", onHeroPointerMove, { passive: true });
  hero.addEventListener("pointerleave", onHeroPointerLeave, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });

  if (canvas && "IntersectionObserver" in window) {
    canvasObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        heroVisible = entry.isIntersecting;
      }
      syncParticlesMode();
    });
    canvasObserver.observe(canvas);
  }

  themeObserver = new MutationObserver(() => {
    if (particlesEnabled) {
      updateColorCache();
      initParticles();
    }
  });
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  reducedMotionQuery?.addEventListener?.("change", onMediaOrNetworkChange);
  coarsePointerQuery?.addEventListener?.("change", onMediaOrNetworkChange);
  connection?.addEventListener?.("change", onMediaOrNetworkChange);

  reducedMotionQuery?.addListener?.(onMediaOrNetworkChange);
  coarsePointerQuery?.addListener?.(onMediaOrNetworkChange);
  connection?.addListener?.(onMediaOrNetworkChange);

  resizeCanvas();
  setMotionMode(resolveMotionMode());
});
