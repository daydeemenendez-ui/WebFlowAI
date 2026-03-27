document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Static 3D Positioning (Laptop & Overlay) ---
    const img = document.getElementById('laptop-img');
    const overlay = document.getElementById('dashboard-overlay');
    const hero = document.querySelector('.hero');
    
    // Apply the clean static layout transform exactly once
    const transformStr = `perspective(1200px) rotateX(0deg) rotateY(-5deg) translate3d(0, 0, 0) scale(1)`;
    
    if (img) img.style.transform = transformStr;
    if (overlay) overlay.style.transform = transformStr;

    // --- 2. Interactive HTML5 Canvas Particle Engine ---
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    // Futuristic palette: Cyan, Purple, Green, Space Gray, Deep Black
    const colors = ['#00bfff', '#8a2be2', '#00ffcc', '#1c1d21', '#0d0d10'];
    
    // Context bindings
    let cw = canvas.width = hero.offsetWidth;
    let ch = canvas.height = hero.offsetHeight;
    
    window.addEventListener('resize', () => {
        cw = canvas.width = hero.offsetWidth;
        ch = canvas.height = hero.offsetHeight;
        initParticles();
    });

    let bounds;
    const updateBounds = () => { bounds = hero.getBoundingClientRect(); };
    window.addEventListener('resize', updateBounds);
    updateBounds();

    // Mouse pointer interactive state
    const pointer = {
        x: null,
        y: null,
        radius: 200 // Increased subtle interaction radius
    };

    // Listeners for pointer movement (Desktop & Touch)
    hero.addEventListener('mousemove', (e) => {
        if (!bounds) return;
        pointer.x = e.clientX - bounds.left;
        pointer.y = e.clientY - bounds.top;
    });
    
    hero.addEventListener('touchmove', (e) => {
        if (!bounds || !e.touches[0]) return;
        pointer.x = e.touches[0].clientX - bounds.left;
        pointer.y = e.touches[0].clientY - bounds.top;
    });

    // Clear forces smoothly
    hero.addEventListener('mouseleave', () => { pointer.x = null; pointer.y = null; });
    hero.addEventListener('touchend', () => { pointer.x = null; pointer.y = null; });

    class Particle {
        constructor(initial = false) {
            this.reset(initial);
        }

        reset(initial) {
            // If initially generating, spread across screen. Otherwise emit from right
            this.x = initial ? Math.random() * cw : cw + Math.random() * 50;
            // Emit roughly from the vertical center (laptop area) and drift
            this.y = (ch * 0.3) + Math.random() * (ch * 0.4); 
            if(initial) this.y = Math.random() * ch; // initial spread
            
            this.baseX = this.x;
            this.baseY = this.y;
            
            this.vx = 0;
            this.vy = 0;

            // Parallax Depth (0 to 1, where 1 is closer to viewer)
            this.z = Math.random(); 
            
            // Flow leftward speed (near particles move noticeably faster)
            this.baseSpeedX = (Math.random() * 0.35 + 0.15) * (1 + this.z * 1.5);
            // Drift vertically very slowly
            this.baseSpeedY = (Math.random() - 0.5) * 0.15;
            
            // Physics variables - Tuned for dynamic but fluid snapback
            this.friction = 0.92; 
            this.springFactor = 0.02; 
            
            // Visual Design Logic
            // 70% dark carbon fragments, 30% glowing data nodes
            const isDark = Math.random() > 0.3; 
            if (isDark) {
                this.color = colors[3 + Math.floor(Math.random() * 2)];
                this.glow = 'transparent';
                // Near fragments are significantly larger to push depth
                this.size = (Math.random() * 1.5 + 0.5) * (1 + this.z * 1.5); 
            } else {
                this.color = colors[Math.floor(Math.random() * 3)];
                this.glow = this.color;
                // Glowing nodes scale slightly with depth
                this.size = (Math.random() * 0.8 + 0.5) * (1 + this.z * 1.5); 
            }
            
            // Organic autonomous flow 
            this.angle = Math.random() * Math.PI * 2;
            this.orbitSpeed = Math.random() * 0.015 + 0.003;
            this.orbitRadius = Math.random() * 15 + 5; 
        }

        update() {
            // Sweep the base path slowly
            this.baseX -= this.baseSpeedX;
            this.baseY += this.baseSpeedY;

            // Calculate organic wobble target
            this.angle += this.orbitSpeed;
            const targetX = this.baseX + Math.cos(this.angle) * this.orbitRadius;
            const targetY = this.baseY + Math.sin(this.angle) * this.orbitRadius;

            // Interactive Repulsion Mechanics
            if (pointer.x != null && pointer.y != null) {
                let dx = pointer.x - this.x;
                let dy = pointer.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < pointer.radius) {
                    let force = (pointer.radius - distance) / pointer.radius;
                    let dirX = dx / distance;
                    let dirY = dy / distance;
                    
                    // Repel dynamically (closer particles react more strongly)
                    let depthForce = force * 1.8 * (1 + this.z);
                    this.vx -= dirX * depthForce;
                    this.vy -= dirY * depthForce;
                }
            }

            // Spring return to organic orbit path
            this.vx += (targetX - this.x) * this.springFactor;
            this.vy += (targetY - this.y) * this.springFactor;

            // Enact decay on raw velocity
            this.vx *= this.friction;
            this.vy *= this.friction;

            // Limit maximum velocity to allow visible dispersion while retaining control
            const maxV = 6.0;
            if (this.vx > maxV) this.vx = maxV;
            if (this.vx < -maxV) this.vx = -maxV;
            if (this.vy > maxV) this.vy = maxV;
            if (this.vy < -maxV) this.vy = -maxV;

            this.x += this.vx;
            this.y += this.vy;

            // Respawn if off-screen to the left
            if (this.x < -100 || this.y < -100 || this.y > ch + 100) {
                this.reset(false);
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            if (this.glow !== 'transparent') {
                ctx.shadowBlur = this.size * 8;
                ctx.shadowColor = this.glow;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.fill();
        }
    }

    const initParticles = () => {
        particles = [];
        const isMobile = window.innerWidth <= 768;
        const count = isMobile ? 50 : 180; 
        
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(true));
        }
    };

    const animateParticles = () => {
        // Semi-transparent clears cause trails on high-movement geometry causing 'warp' trails
        // Resetting with pure black on a standard canvas works, but since the canvas lays over a generic `#000` body
        // we can composite directly with transparent fills
        ctx.clearRect(0, 0, cw, ch);
        
        for (let particle of particles) {
            particle.update();
            particle.draw();
        }
        requestAnimationFrame(animateParticles);
    };

    initParticles();
    animateParticles();

    // --- 3. Showcase Dashboard Parallax ---
    const showcaseWrapper = document.getElementById('showcase-visual-wrapper');
    const showcaseDashboard = document.getElementById('showcase-dashboard');
    const valueLabels = document.querySelectorAll('.value-label');

    if (showcaseWrapper && showcaseDashboard) {
        let scBounds;
        const updateScBounds = () => { scBounds = showcaseWrapper.getBoundingClientRect(); };
        window.addEventListener('resize', updateScBounds);
        updateScBounds();

        showcaseWrapper.addEventListener('mousemove', (e) => {
            if (!scBounds) return;
            // Center calculations
            const mouseX = e.clientX - scBounds.left;
            const mouseY = e.clientY - scBounds.top;
            const centerX = scBounds.width / 2;
            const centerY = scBounds.height / 2;
            
            // Normalize values from -1 to 1
            const factorX = (mouseX - centerX) / centerX;
            const factorY = (mouseY - centerY) / centerY;
            
            // Max rotation limits
            const rotX = -(factorY * 6); // Up to 6deg
            const rotY = (factorX * 6); // Up to 6deg
            
            // Apply 3D transform to dashboard
            showcaseDashboard.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(10px)`;
            
            // Subtle counter parallax on floating labels
            valueLabels.forEach((label, i) => {
                const depth = (i + 1) * 8;
                label.style.transform = `translate3d(${factorX * -depth}px, ${factorY * -depth}px, ${depth}px)`;
            });
        });

        // Reset on leave
        showcaseWrapper.addEventListener('mouseleave', () => {
            showcaseDashboard.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            showcaseDashboard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
            
            valueLabels.forEach(label => {
                label.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                label.style.transform = 'translate3d(0, 0, 0)';
            });
            
            // Remove transition to restore smooth tracking
            setTimeout(() => {
                showcaseDashboard.style.transition = 'none';
                valueLabels.forEach(label => label.style.transition = 'none');
            }, 500);
        });
    }

    // --- 4. Video Section Animations ---
    const widgets = document.querySelectorAll('.slide-in-left, .slide-in-right');
    if (widgets.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('widget-visible');
                    
                    // Increment counter logic for workflows if this is the left widget
                    const counter = entry.target.querySelector('#workflows-count');
                    if (counter && !counter.dataset.animated) {
                        counter.dataset.animated = "true";
                        let count = 13800; // Start a bit lower
                        const target = 14208;
                        const interval = setInterval(() => {
                            count += Math.floor(Math.random() * 5) + 1;
                            if (count >= target) {
                                count = target;
                                clearInterval(interval);
                            }
                            counter.innerText = count.toLocaleString();
                        }, 30);
                    }
                }
            });
        }, { threshold: 0.2 });
        
        widgets.forEach(widget => observer.observe(widget));
    }

    // --- 5. Scroll-Activated Single-Play Video ---
    const bgVideo = document.getElementById('bgVidHero');
    const videoSection = document.getElementById('hero-video-section');
    
    if (bgVideo && videoSection) {
        // Trim settings
        const INTRO_START = 1.2; 
        let videoEnded = false;
        let playEnd = Infinity;
        
        bgVideo.addEventListener('loadedmetadata', () => {
            bgVideo.currentTime = INTRO_START;
            playEnd = bgVideo.duration - 0.3; // Stop exactly before recording UI freeze
        });

        // Watch the time to freeze securely at the final frame
        bgVideo.addEventListener('timeupdate', () => {
            if (!videoEnded && bgVideo.currentTime >= playEnd && playEnd > 0) {
                videoEnded = true;
                bgVideo.pause(); // Freeze exactly on the beautiful final frame
            }
        });

        // Scroll observer to play/pause intelligently
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!videoEnded) {
                        bgVideo.play().catch(console.error);
                        // Trigger smooth CSS fade-in
                        bgVideo.classList.add('is-playing');
                    }
                } else {
                    bgVideo.pause(); // Suspend playback to save browser CPU
                }
            });
        }, { threshold: 0.65 }); // Start playing ONLY when 65% of the section is scrolled into view

        videoObserver.observe(videoSection);
    }

});
