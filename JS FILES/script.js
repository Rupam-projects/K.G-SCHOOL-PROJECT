// --- BACKGROUND PARTICLES ---
function createParticles() {
    const container = document.getElementById('particles-container');
    const particleCount = 20;
    const shapes = ['shape-circle', 'shape-square', 'shape-triangle'];
    if (!container) return;

    const fragment = document.createDocumentFragment();

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
        fragment.appendChild(particle);
    }
    container.appendChild(fragment);
}
window.onload = createParticles;

function safeReadJSON(key, fallback, storage = localStorage) {
    try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function getAdminCredentials() {
    const username =
        localStorage.getItem('admin_login_username') ||
        localStorage.getItem('nk_admin_id') ||
        localStorage.getItem('nk_login_user') ||
        localStorage.getItem('nk_master_user') ||
        'admin';

    const password =
        localStorage.getItem('admin_login_password') ||
        localStorage.getItem('nk_admin_pass') ||
        localStorage.getItem('nk_login_pass') ||
        localStorage.getItem('nk_master_pass') ||
        '1234';

    return { username: String(username).trim(), password: String(password).trim() };
}

function canAttemptLogin(scope, maxAttempts = 5, lockMinutes = 3) {
    const key = `nk_login_guard_${scope}`;
    const now = Date.now();
    const guard = safeReadJSON(key, { attempts: 0, lockedUntil: 0 }, sessionStorage);

    if (guard.lockedUntil && now < guard.lockedUntil) {
        const waitSec = Math.ceil((guard.lockedUntil - now) / 1000);
        return { ok: false, waitSec };
    }

    if (guard.lockedUntil && now >= guard.lockedUntil) {
        sessionStorage.removeItem(key);
    }

    return { ok: true, waitSec: 0 };
}

function trackLoginFailure(scope, maxAttempts = 5, lockMinutes = 3) {
    const key = `nk_login_guard_${scope}`;
    const now = Date.now();
    const guard = safeReadJSON(key, { attempts: 0, lockedUntil: 0 }, sessionStorage);
    guard.attempts = (guard.attempts || 0) + 1;
    if (guard.attempts >= maxAttempts) {
        guard.lockedUntil = now + lockMinutes * 60 * 1000;
        guard.attempts = 0;
    }
    sessionStorage.setItem(key, JSON.stringify(guard));
}

function clearLoginGuard(scope) {
    sessionStorage.removeItem(`nk_login_guard_${scope}`);
}

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
    const scope = boxId === 'admin-login' ? 'admin' : 'student';

    const guard = canAttemptLogin(scope);
    if (!guard.ok) {
        showErrorPopup(`Too many attempts. Try again in ${guard.waitSec} sec.`);
        return;
    }

    // ADMIN LOGIN
    if (boxId === 'admin-login') {
        const admin = getAdminCredentials();
        if (inputs[0].value.trim() !== admin.username || inputs[1].value !== admin.password) {
            trackLoginFailure(scope);
            showErrorPopup('Invalid Admin Username or Password.');
            return;
        }
    }

    // STUDENT LOGIN (FAKE DB CONNECTION)
    if (boxId === 'student-login') {
        let dbStudents = safeReadJSON('nk_students', []);
        let inputId = inputs[0].value;
        let inputPass = inputs[1].value;

        let foundStudent = dbStudents.find(s => s.id === inputId && s.pass === inputPass);

        // Fallback demo account for presentation
        if (!foundStudent && inputId === 'student' && inputPass === '1234') {
            foundStudent = { id: 'NKGC-101', name: 'Demo Student', class: 'IV-A', fees: 'Paid' };
        }

        if (!foundStudent) {
            trackLoginFailure(scope);
            showErrorPopup('Student ID or Password not found in Database.');
            return;
        }

        // Bacche ka naam save kar lo taaki dashboard usey welcome kar sake
        localStorage.setItem('current_student_id', foundStudent.id);
    }

    clearLoginGuard(scope);

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
