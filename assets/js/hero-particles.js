document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("hero-particles");
  if (!canvas) {return;}

  const ctx = canvas.getContext("2d");
  if (!ctx) {return;}

  const MIN_FULL_MOTION_VIEWPORT = 992;
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const coarsePointerQuery = window.matchMedia
    ? window.matchMedia("(pointer: coarse)")
    : null;

  let particlesArray = [];
  let resizeTimeout;
  let rafId = null;
  let destroyed = false;
  let heroVisible = true;
  let pageVisible = !document.hidden;
  let particlesEnabled = false;
  let canvasObserver = null;
  let themeObserver = null;

  function isNetworkConstrained() {
    if (!connection) {return false;}
    const saveData = !!connection.saveData;
    const type = String(connection.effectiveType || "").toLowerCase();
    return saveData || type.includes("2g") || type.includes("slow-2g");
  }

  function isMotionConstrained() {
    return (
      !!reducedMotionQuery?.matches ||
      !!coarsePointerQuery?.matches ||
      isNetworkConstrained() ||
      window.innerWidth < MIN_FULL_MOTION_VIEWPORT
    );
  }

  function shouldAnimateParticles() {
    return !destroyed && heroVisible && pageVisible && !isMotionConstrained();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight));
    canvas.width = width;
    canvas.height = height;
  }

  function resolveParticleColor() {
    const fromVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--particle-color")
      .trim();

    if (fromVar) {
      return fromVar;
    }

    const prefersDark =
      document.body.classList.contains("dark-mode") ||
      (window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    return prefersDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.2)";
  }

  class Particle {
    constructor(x, y, directionX, directionY, size, color) {
      this.x = x;
      this.y = y;
      this.directionX = directionX;
      this.directionY = directionY;
      this.size = size;
      this.color = color;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    update(mouse) {
      if (this.x > canvas.width || this.x < 0) {
        this.directionX = -this.directionX;
      }
      if (this.y > canvas.height || this.y < 0) {
        this.directionY = -this.directionY;
      }

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius + this.size) {
        if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
          this.x += 10;
        }
        if (mouse.x > this.x && this.x > this.size * 10) {
          this.x -= 10;
        }
        if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
          this.y += 10;
        }
        if (mouse.y > this.y && this.y > this.size * 10) {
          this.y -= 10;
        }
      }

      this.x += this.directionX;
      this.y += this.directionY;
      this.draw();
    }
  }

  const mouse = {
    x: null,
    y: null,
    radius: 140,
  };

  function initParticles() {
    particlesArray = [];
    const particleColor = resolveParticleColor();
    const count = Math.min(
      170,
      Math.max(18, Math.floor((canvas.width * canvas.height) / 12000))
    );

    for (let i = 0; i < count; i++) {
      const size = Math.random() * 4 + 1;
      const x = Math.random() * (canvas.width - size * 4) + size * 2;
      const y = Math.random() * (canvas.height - size * 4) + size * 2;
      const directionX = Math.random() * 1.5 - 0.75;
      const directionY = Math.random() * 1.5 - 0.75;
      particlesArray.push(
        new Particle(x, y, directionX, directionY, size, particleColor)
      );
    }
  }

  let cachedR = 99;
  let cachedG = 102;
  let cachedB = 241;
  let lastColorUpdateTime = 0;
  const COLOR_CACHE_INTERVAL = 1000;

  function updateParticleColorCache() {
    const now = Date.now();
    if (now - lastColorUpdateTime < COLOR_CACHE_INTERVAL) {return;}

    lastColorUpdateTime = now;
    const particleColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--particle-color")
        .trim() || "rgba(99, 102, 241, 0.2)";
    const rgbaMatch = particleColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      cachedR = parseInt(rgbaMatch[1], 10);
      cachedG = parseInt(rgbaMatch[2], 10);
      cachedB = parseInt(rgbaMatch[3], 10);
    }
  }

  function connectParticles() {
    updateParticleColorCache();
    const maxDistanceSq = (canvas.width / 8) * (canvas.height / 8);

    for (let a = 0; a < particlesArray.length; a++) {
      for (let b = a + 1; b < particlesArray.length; b++) {
        const distance =
          (particlesArray[a].x - particlesArray[b].x) *
            (particlesArray[a].x - particlesArray[b].x) +
          (particlesArray[a].y - particlesArray[b].y) *
            (particlesArray[a].y - particlesArray[b].y);

        if (distance < maxDistanceSq) {
          const opacityValue = 1 - distance / 22000;
          ctx.strokeStyle = `rgba(${cachedR}, ${cachedG}, ${cachedB}, ${opacityValue})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
          ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function stopAnimationLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function renderFrame() {
    if (!particlesEnabled || destroyed) {
      rafId = null;
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update(mouse);
    }
    connectParticles();
    rafId = requestAnimationFrame(renderFrame);
  }

  function startAnimationLoop() {
    if (rafId === null) {
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  function setParticlesMode(active) {
    if (active === particlesEnabled) {return;}
    particlesEnabled = active;
    canvas.dataset.particlesState = active ? "active" : "disabled";

    if (active) {
      resizeCanvas();
      initParticles();
      startAnimationLoop();
    } else {
      stopAnimationLoop();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function syncParticlesMode() {
    setParticlesMode(shouldAnimateParticles());
  }

  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
      if (particlesEnabled) {
        initParticles();
      }
      syncParticlesMode();
    }, 140);
  }

  function onMouseMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }

  function onVisibilityChange() {
    pageVisible = !document.hidden;
    syncParticlesMode();
  }

  function onMediaOrNetworkChange() {
    syncParticlesMode();
  }

  function cleanup() {
    destroyed = true;
    clearTimeout(resizeTimeout);
    stopAnimationLoop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.dataset.particlesState = "disabled";

    window.removeEventListener("resize", onResize);
    window.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("beforeunload", cleanup);

    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }
    if (canvasObserver) {
      canvasObserver.disconnect();
      canvasObserver = null;
    }

    reducedMotionQuery?.removeEventListener?.("change", onMediaOrNetworkChange);
    coarsePointerQuery?.removeEventListener?.("change", onMediaOrNetworkChange);
    connection?.removeEventListener?.("change", onMediaOrNetworkChange);
  }

  resizeCanvas();
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.particlesState = "disabled";

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  if ("IntersectionObserver" in window) {
    canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        heroVisible = entry.isIntersecting;
      });
      syncParticlesMode();
    });
    canvasObserver.observe(canvas);
  }

  themeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === "class" && particlesEnabled) {
        initParticles();
      }
    }
  });
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  reducedMotionQuery?.addEventListener?.("change", onMediaOrNetworkChange);
  coarsePointerQuery?.addEventListener?.("change", onMediaOrNetworkChange);
  connection?.addEventListener?.("change", onMediaOrNetworkChange);

  syncParticlesMode();
});

document.addEventListener("DOMContentLoaded", function () {
  const heroImage = document.querySelector(".profile-image");
  const heroSection = document.getElementById("hero");
  if (!heroImage || !heroSection) {return;}

  const reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const coarsePointerQuery = window.matchMedia
    ? window.matchMedia("(pointer: coarse)")
    : null;
  const MIN_TILT_VIEWPORT = 992;

  let tiltEnabled = false;
  let destroyed = false;

  function canEnableTilt() {
    return (
      !reducedMotionQuery?.matches &&
      !coarsePointerQuery?.matches &&
      window.innerWidth >= MIN_TILT_VIEWPORT &&
      !document.hidden
    );
  }

  function syncTiltMode() {
    if (destroyed) {return;}
    const nextEnabled = canEnableTilt();
    tiltEnabled = nextEnabled;
    heroSection.dataset.heroTilt = nextEnabled ? "enabled" : "disabled";
    if (!nextEnabled) {
      heroImage.style.transform = "";
    }
  }

  function onMouseMove(e) {
    if (!tiltEnabled) {return;}
    const rect = heroSection.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const moveX = (x - 0.5) * 12;
    const moveY = (y - 0.5) * 12;
    heroImage.style.transform =
      `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg) scale(1.03)`;
  }

  function onMouseLeave() {
    heroImage.style.transform = "";
  }

  function onVisibilityChange() {
    syncTiltMode();
  }

  function cleanupTilt() {
    destroyed = true;
    heroImage.style.transform = "";
    heroSection.dataset.heroTilt = "disabled";
    heroSection.removeEventListener("mousemove", onMouseMove);
    heroSection.removeEventListener("mouseleave", onMouseLeave);
    window.removeEventListener("resize", syncTiltMode);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", cleanupTilt);
    window.removeEventListener("beforeunload", cleanupTilt);
    reducedMotionQuery?.removeEventListener?.("change", syncTiltMode);
    coarsePointerQuery?.removeEventListener?.("change", syncTiltMode);
  }

  heroSection.addEventListener("mousemove", onMouseMove);
  heroSection.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("resize", syncTiltMode, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", cleanupTilt, { once: true });
  window.addEventListener("beforeunload", cleanupTilt, { once: true });
  reducedMotionQuery?.addEventListener?.("change", syncTiltMode);
  coarsePointerQuery?.addEventListener?.("change", syncTiltMode);

  syncTiltMode();
});
