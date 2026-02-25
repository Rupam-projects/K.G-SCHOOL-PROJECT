// ==========================================
// 🔥 PUBLIC HOME PAGE ENGINE (ANIMATIONS + LIVE SYNC) 🔥
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. 🔥 BACKGROUND PARTICLES ANIMATION 🔥
    // ==========================================
    function createParticles() { 
        const c = document.getElementById('particles-container'); 
        if(!c) return; 
        c.innerHTML = ''; 
        for(let i=0; i<25; i++) { 
            let p = document.createElement('div'); 
            p.className = 'glass-particle'; 
            let size = Math.random() * 40 + 10; 
            p.style.width = size + 'px'; 
            p.style.height = size + 'px'; 
            p.style.left = `${Math.random() * 100}vw`; 
            p.style.animationDuration = `${Math.random() * 15 + 10}s`; 
            p.style.animationDelay = `${Math.random() * 5}s`;
            c.appendChild(p); 
        } 
    }
    createParticles();

    // ==========================================
    // 2. 🔥 SCROLL ANIMATIONS (SLIDE-UP) 🔥
    // ==========================================
    const observerOptions = {
        threshold: 0.15, // Element 15% dikhne par animation start hogi
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observer.unobserve(entry.target); // Ek baar aane ke baad wapas upar-neeche karne pe gayab nahi hoga
            }
        });
    }, observerOptions);

    document.querySelectorAll('.slide-up').forEach(el => {
        observer.observe(el);
    });

    // ==========================================
    // 3. 🔥 NOTICE BOARD LIVE SYNC 🔥
    // ==========================================
    const noticeList = document.getElementById('home-notice-list');
    let notices = JSON.parse(localStorage.getItem('nk_notices')) || [];
    
    if (noticeList) {
        if (notices.length > 0) {
            noticeList.innerHTML = notices.map(n => `
                <div class="notice-item" style="padding:15px; border-left:4px solid var(--ios-blue); background:rgba(0,122,255,0.05); margin-bottom:10px; border-radius:5px;">
                    <h4 style="margin:0 0 5px 0; color:var(--ios-blue); font-size: 1.1rem;">${n.title}</h4>
                    <p style="margin:0; font-size:0.9rem; color:#555; line-height: 1.4;">${n.body}</p>
                    <span style="font-size:0.75rem; color:#888; display:block; margin-top:8px;">
                        <i class="fa-regular fa-calendar"></i> Posted: ${n.date}
                    </span>
                </div>
            `).join('');
        } else {
            noticeList.innerHTML = '<p style="color:#888;">No new notices at the moment. Please check back later.</p>';
        }
    }

    // ==========================================
    // 4. 🔥 GALLERY LIVE SYNC & RENDER 🔥
    // ==========================================
    const galleryPreview = document.getElementById('home-gallery-grid');
    const fullGallery = document.getElementById('full-gallery-grid');
    let galleryData = JSON.parse(localStorage.getItem('nk_gallery')) || [];

    function renderImages(images, startIndex = 0) {
        return images.map((g, i) => `
            <div style="cursor:pointer; border-radius:10px; overflow:hidden; border:2px solid rgba(0,0,0,0.1); aspect-ratio: 4/3; position: relative;" onclick="openSlideshow(${startIndex + i})">
                <img src="${g.src}" alt="School Gallery" style="width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
            </div>
        `).join('');
    }

    if (galleryData.length > 0) {
        if (galleryPreview) {
            galleryPreview.style.display = 'grid';
            galleryPreview.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
            galleryPreview.style.gap = '15px';
            galleryPreview.innerHTML = renderImages(galleryData.slice(0, 6), 0); 
        }
        if (fullGallery) {
            fullGallery.style.display = 'grid';
            fullGallery.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
            fullGallery.style.gap = '15px';
            fullGallery.innerHTML = renderImages(galleryData, 0); 
        }
    } else {
        if (galleryPreview) galleryPreview.innerHTML = '<p style="color:#888; grid-column:1/-1;">No photos uploaded yet by Administration.</p>';
        if (fullGallery) fullGallery.innerHTML = '<p style="color:#888; text-align:center; width: 100%;">No photos available in the vault.</p>';
    }

    // ==========================================
    // 5. 🔥 BUG-FREE UI BUTTONS & MODALS LOGIC 🔥
    // ==========================================
    const fullGalleryModal = document.getElementById('full-gallery-modal');
    document.getElementById('view-more-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        if(fullGalleryModal) fullGalleryModal.classList.add('active'); 
    });
    document.getElementById('close-full-gallery-btn')?.addEventListener('click', () => {
        if(fullGalleryModal) fullGalleryModal.classList.remove('active');
    });

    const navDropdown = document.getElementById('nav-dropdown');
    document.getElementById('menu-btn')?.addEventListener('click', () => {
        if(navDropdown) navDropdown.classList.toggle('active');
    });

    // 🔴 THE REAL FIX: Close all modals before opening a new one 🔴
    function closeAllModals() {
        document.querySelectorAll('.contact-modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Mapping Buttons to their exact Modals safely
    const modalMap = {
        'contact-btn-desktop': 'contact-modal',
        'contact-btn-mobile': 'contact-modal',
        'academics-widget-btn': 'academics-modal',
        'admission-widget-btn': 'admission-modal',
        'activities-widget-btn': 'activities-modal',
        'timings-btn': 'timings-modal',
        'office-btn': 'office-modal'
    };

    // Attach listeners safely without overlapping
    for (const [btnId, modalId] of Object.entries(modalMap)) {
        let btn = document.getElementById(btnId);
        let modal = document.getElementById(modalId);
        
        if (btn && modal) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                closeAllModals(); // Close every popup first
                modal.classList.add('active'); // Open only the required one
                if(navDropdown) navDropdown.classList.remove('active'); // Hide mobile menu if open
            });
        }
    }

    // Back buttons inside Academics Modal
    document.getElementById('back-from-timings')?.addEventListener('click', () => {
        closeAllModals();
        document.getElementById('academics-modal')?.classList.add('active');
    });
    
    document.getElementById('back-from-office')?.addEventListener('click', () => {
        closeAllModals();
        document.getElementById('academics-modal')?.classList.add('active');
    });

    // Universal Close Button logic
    document.querySelectorAll('.close-contact').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeAllModals);
    });

    // Close on clicking outside the modal box
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('contact-modal-overlay')) {
            closeAllModals();
        }
    });
});

// ==========================================
// 🔥 6. FULLSCREEN SLIDESHOW LOGIC 🔥
// ==========================================
let currentSlideIndex = 0;

window.openSlideshow = function(index) {
    let galleryData = JSON.parse(localStorage.getItem('nk_gallery')) || [];
    if (galleryData.length === 0) return;
    
    currentSlideIndex = index;
    let imgEl = document.getElementById('slideshow-image');
    let modal = document.getElementById('slideshow-modal');
    
    if (imgEl && modal) {
        imgEl.src = galleryData[currentSlideIndex].src;
        modal.style.display = 'flex'; 
        modal.classList.add('active');
    }
}

document.getElementById('close-slideshow-btn')?.addEventListener('click', () => {
    let modal = document.getElementById('slideshow-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
});

document.getElementById('prev-slide-btn')?.addEventListener('click', () => {
    let galleryData = JSON.parse(localStorage.getItem('nk_gallery')) || [];
    if (galleryData.length === 0) return;
    
    currentSlideIndex--;
    if (currentSlideIndex < 0) currentSlideIndex = galleryData.length - 1; 
    
    let imgEl = document.getElementById('slideshow-image');
    if (imgEl) imgEl.src = galleryData[currentSlideIndex].src;
});

document.getElementById('next-slide-btn')?.addEventListener('click', () => {
    let galleryData = JSON.parse(localStorage.getItem('nk_gallery')) || [];
    if (galleryData.length === 0) return;
    
    currentSlideIndex++;
    if (currentSlideIndex >= galleryData.length) currentSlideIndex = 0; 
    
    let imgEl = document.getElementById('slideshow-image');
    if (imgEl) imgEl.src = galleryData[currentSlideIndex].src;
});

document.addEventListener('keydown', function(event) {
    let modal = document.getElementById('slideshow-modal');
    if (modal && (modal.classList.contains('active') || modal.style.display === 'flex')) {
        if (event.key === "ArrowLeft") { document.getElementById('prev-slide-btn')?.click(); } 
        else if (event.key === "ArrowRight") { document.getElementById('next-slide-btn')?.click(); } 
        else if (event.key === "Escape") { document.getElementById('close-slideshow-btn')?.click(); }
    }
});