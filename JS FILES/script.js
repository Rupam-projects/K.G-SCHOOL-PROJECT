// --- BACKGROUND PARTICLES ---
function createParticles() {
    const container = document.getElementById('particles-container');
    const particleCount = 20; 
    const shapes = ['shape-circle', 'shape-square', 'shape-triangle'];

    for (let i = 0; i < particleCount; i++) {
        let particle = document.createElement('div');
        let randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        particle.classList.add('glass-particle', randomShape);
        let size = Math.random() * 80 + 20; 
        let leftPos = Math.random() * 100; 
        let animDuration = Math.random() * 10 + 10; 
        let delay = Math.random() * 10; 

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${leftPos}vw`;
        particle.style.animationDuration = `${animDuration}s`;
        particle.style.animationDelay = `${delay}s`;
        if(container) container.appendChild(particle);
    }
}
window.onload = createParticles;

// --- GRAVITY & FLOOR IMPACT LOGIC ---
const selectionView = document.getElementById('selection-view');
const studentLogin = document.getElementById('student-login');
const adminLogin = document.getElementById('admin-login');
const aboutView = document.getElementById('about-view'); 

function showLogin(type) {
    if(!selectionView) return;
    selectionView.classList.remove('state-active');
    selectionView.classList.add('state-fall');
    setTimeout(() => {
        let targetBox = type === 'student' ? studentLogin : adminLogin;
        targetBox.classList.remove('state-hidden');
        targetBox.classList.add('state-active');
    }, 400); 
    setTimeout(() => {
        selectionView.classList.remove('state-fall');
        selectionView.classList.add('state-hidden');
    }, 1600);
}

function goBack(type) {
    let currentBox = type === 'student' ? studentLogin : adminLogin;
    currentBox.classList.remove('state-active');
    currentBox.classList.add('state-fall');
    setTimeout(() => { 
        selectionView.classList.remove('state-hidden');
        selectionView.classList.add('state-active'); 
    }, 400);
    setTimeout(() => {
        currentBox.classList.remove('state-fall');
        currentBox.classList.add('state-hidden');
        document.getElementById(type + 'Form').reset();
    }, 1600);
}

function showAbout() {
    const activeBox = document.querySelector('.state-active');
    if(activeBox === aboutView) return; 
    activeBox.classList.remove('state-active');
    activeBox.classList.add('state-fall');
    setTimeout(() => {
        aboutView.classList.remove('state-hidden');
        aboutView.classList.add('state-active');
    }, 400); 
    setTimeout(() => {
        activeBox.classList.remove('state-fall');
        activeBox.classList.add('state-hidden');
    }, 1600);
}

function closeAbout() {
    aboutView.classList.remove('state-active');
    aboutView.classList.add('state-fall');
    setTimeout(() => { 
        selectionView.classList.remove('state-hidden');
        selectionView.classList.add('state-active'); 
    }, 400);
    setTimeout(() => {
        aboutView.classList.remove('state-fall');
        aboutView.classList.add('state-hidden');
    }, 1600);
}

// --- REDIRECT & DUMMY DATABASE LOGIN LOGIC ---
function handleLogin(event, boxId, formId, btnId) {
    event.preventDefault(); 
    const btn = document.getElementById(btnId);
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input'); 
    
    // ADMIN LOGIN
    if (boxId === 'admin-login') {
        if (inputs[0].value !== 'admin' || inputs[1].value !== '1234') {
            showErrorPopup('Invalid Admin Username or Password.');
            return; 
        }
    }

    // STUDENT LOGIN (FAKE DB CONNECTION)
    if (boxId === 'student-login') {
        let dbStudents = JSON.parse(localStorage.getItem('nk_students')) || [];
        let inputId = inputs[0].value;
        let inputPass = inputs[1].value;
        
        let foundStudent = dbStudents.find(s => s.id === inputId && s.pass === inputPass);
        
        // Fallback demo account for presentation
        if (!foundStudent && inputId === 'student' && inputPass === '1234') {
            foundStudent = { id: 'NKGC-101', name: 'Demo Student', class: 'IV-A', fees: 'Paid' };
        }

        if (!foundStudent) {
            showErrorPopup('Student ID or Password not found in Database.');
            return; 
        }
        
        // Bacche ka naam save kar lo taaki dashboard usey welcome kar sake
        localStorage.setItem('current_student_id', foundStudent.id);
    }

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking...`;
    btn.disabled = true; 

    setTimeout(() => {
        if (boxId === 'student-login') {
            btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Redirecting...`;
            setTimeout(() => { window.location.href = 'student_dashboard.html'; }, 800);
        } else if (boxId === 'admin-login') {
            btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Redirecting...`;
            setTimeout(() => { window.location.href = 'admin_dashboard.html'; }, 800);
        }
    }, 1500); 
}