// ==========================================
// 1. FLOATING PARTICLES LOGIC
// ==========================================
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return; 

    container.innerHTML = '';
    const particleCount = 20; 
    const shapes = ['shape-circle', 'shape-square', 'shape-triangle'];

    for (let i = 0; i < particleCount; i++) {
        let particle = document.createElement('div');
        let randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        particle.classList.add('glass-particle', randomShape);
        
        let size = Math.random() * 60 + 20; 
        let leftPos = Math.random() * 100; 
        let animDuration = Math.random() * 10 + 10; 
        let delay = Math.random() * 10; 

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${leftPos}vw`;
        particle.style.animationDuration = `${animDuration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        container.appendChild(particle);
    }
}

// ==========================================
// 2. ELEGANT & SMOOTH RANDOM LOAD (HOME PAGE Jaisa!)
// ==========================================
function smoothRandomLoad() {
    // Yahan maine PIN aur TEACHER CARDS ko bhi add kar diya hai
    const elements = document.querySelectorAll('.ios-glass-header, .page-title, .subtitle, .realistic-pin-container, .teacher-card-container');

    elements.forEach((el) => {
        // Random X aur Y position (Hawa se ud ke aane ke liye)
        const randomX = (Math.random() - 0.5) * 80; 
        const randomY = (Math.random() - 0.5) * 80; 

        el.style.opacity = '0';
        el.style.transform = `translate(${randomX}px, ${randomY}px) scale(0.9)`;
        
        void el.offsetWidth; 

        setTimeout(() => {
            const duration = Math.random() * 1.2 + 0.8; 
            el.style.transition = `opacity ${duration}s ease-out, transform ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
            el.style.opacity = '1';
            el.style.transform = 'translate(0, 0) scale(1)';

            // Animation khatam hone ke baad clean up
            setTimeout(() => {
                el.style.transition = '';
                el.style.transform = '';
            }, duration * 1000 + 100);

        }, Math.random() * 500); // Alag-alag time pe aayenge
    });
}

// ==========================================
// 3. 3D CARD FLIP LOGIC
// ==========================================
function initCardFlip() {
    const cards = document.querySelectorAll('.teacher-card-container');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const inner = this.querySelector('.teacher-card');
            if(inner) inner.classList.toggle('is-flipped');
        });
    });
}

// ==========================================
// START EVERYTHING ON PAGE LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    smoothRandomLoad(); // Load animation trigger
    initCardFlip(); 
});