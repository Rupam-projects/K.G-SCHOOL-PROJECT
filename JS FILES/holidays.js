// ==========================================
// FLOATING PARTICLES LOGIC
// ==========================================
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return; 

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

// Start animation on load
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
});