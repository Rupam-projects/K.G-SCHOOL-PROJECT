function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return; 
    const shapes = ['shape-circle', 'shape-square', 'shape-triangle'];
    for (let i = 0; i < 20; i++) {
        let p = document.createElement('div');
        p.className = `glass-particle ${shapes[Math.floor(Math.random() * shapes.length)]}`;
        p.style.width = p.style.height = `${Math.random() * 40 + 10}px`;
        p.style.left = `${Math.random() * 100}vw`; 
        p.style.animationDuration = `${Math.random() * 10 + 5}s`; 
        p.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(p);
    }
}
function smoothRandomLoad() {
    const elements = document.querySelectorAll('.ios-glass-header, .page-title, .subtitle, .rules-list li, .board-clip');
    elements.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = `translate(${(Math.random() - 0.5) * 80}px, ${(Math.random() - 0.5) * 80}px) scale(0.9)`;
        setTimeout(() => {
            const duration = Math.random() * 1.2 + 0.8; 
            el.style.transition = `all ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
            el.style.opacity = '1';
            el.style.transform = 'translate(0, 0) scale(1)';
        }, Math.random() * 400); 
    });
}
document.addEventListener('DOMContentLoaded', () => { createParticles(); smoothRandomLoad(); });