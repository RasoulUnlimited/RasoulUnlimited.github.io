document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particlesArray;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Handle resize
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
    });

    // Mouse interaction
    const mouse = {
        x: null,
        y: null,
        radius: 150
    }

    window.addEventListener('mousemove', function(event) {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    // Particle class
    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }

        // Method to draw individual particle
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // Check particle position, check mouse position, move the particle, draw the particle
        update() {
            // Check if particle is still within canvas
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }

            // Check collision detection - mouse position / particle position
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx*dx + dy*dy);
            if (distance < mouse.radius + this.size){
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
            
            // Move particle
            this.x += this.directionX;
            this.y += this.directionY;
            
            // Draw particle
            this.draw();
        }
    }

    // Create particle array
    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 5) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1; // -1 to 1
            let directionY = (Math.random() * 2) - 1; // -1 to 1
            
            // Theme aware colors
            let color = getComputedStyle(document.documentElement).getPropertyValue('--particle-color').trim() || 'rgba(100, 100, 100, 0.2)';
            
            // Check if we can detect theme from body class or computed style
            // This is a simple check, might need adjustment based on actual theme implementation
            const isDark = document.body.classList.contains('dark-mode') || 
                           window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (isDark) {
                 color = 'rgba(255, 255, 255, 0.2)';
            } else {
                 color = 'rgba(0, 0, 0, 0.2)';
            }

            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    // Cache computed particle color to avoid repeated getComputedStyle calls
    let cachedR = 99, cachedG = 102, cachedB = 241; // Default Indigo
    let lastColorUpdateTime = 0;
    const COLOR_CACHE_INTERVAL = 1000; // Update color cache every 1 second
    
    function updateParticleColorCache() {
        const now = Date.now();
        if (now - lastColorUpdateTime < COLOR_CACHE_INTERVAL) return;
        
        lastColorUpdateTime = now;
        const style = getComputedStyle(document.documentElement);
        const particleColor = style.getPropertyValue('--particle-color').trim() || 'rgba(99, 102, 241, 0.2)';
        
        // Parse RGBA color once per interval
        const rgbaMatch = particleColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
            cachedR = parseInt(rgbaMatch[1], 10);
            cachedG = parseInt(rgbaMatch[2], 10);
            cachedB = parseInt(rgbaMatch[3], 10);
        }
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    // Check if particles are close enough to draw line between them
    function connect() {
        updateParticleColorCache();
        
        let opacityValue = 1;
        const maxDistanceSq = (canvas.width/7) * (canvas.height/7);

        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a + 1; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                
                if (distance < maxDistanceSq) {
                    opacityValue = 1 - (distance/20000);
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

    init();
    animate();
    
    // Re-init on theme change if possible
    // Assuming there is a theme toggle that might trigger a class change or event
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === "class") {
                init();
            }
        });
    });
    observer.observe(document.body, { attributes: true });
});

document.addEventListener('DOMContentLoaded', function() {
  // Hero Image Tilt Effect
  const heroImage = document.querySelector('.profile-image');
  const heroSection = document.getElementById('hero');

  if (heroImage && heroSection) {
    heroSection.addEventListener('mousemove', function(e) {
      const { left, top, width, height } = heroSection.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;

      const moveX = (x - 0.5) * 15; 
      const moveY = (y - 0.5) * 15;

      heroImage.style.transform = `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg) scale(1.05)`;
    });

    heroSection.addEventListener('mouseleave', function() {
      heroImage.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)';
    });
  }
});
