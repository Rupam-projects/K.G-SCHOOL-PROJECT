// ==========================================
// 🔥 THE V55 STUDENT DASHBOARD ENGINE 🔥
// ==========================================

let studentDbCache = null;

function safeReadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch (e) {
        console.warn(`Corrupted storage for ${key}. Using fallback.`, e);
        return fallback;
    }
}

function invalidateStudentCache() {
    studentDbCache = null;
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    invalidateStudentCache();
}

function fetchFreshData(force = false) {
    if (!force && studentDbCache) return studentDbCache;
    studentDbCache = {
        notices: safeReadJSON('nk_notices', []),
        assignments: safeReadJSON('nk_assignments', []),
        events: safeReadJSON('nk_events', []),
        students: safeReadJSON('nk_students', []),
        submissions: safeReadJSON('nk_submissions', []),
        chats: safeReadJSON('nk_chats', {}),
        gallery: safeReadJSON('nk_gallery', []),
        school: safeReadJSON('nk_school_info', { name: 'Netra K.G Center', tag: 'Operations Portal' })
    };
    return studentDbCache;
}

function updateStudentAlerts() {
    let db = fetchFreshData();
    let currentId = localStorage.getItem('current_student_id') || 'NKGC-101';
    let currentStudent = db.students.find(s => s.id === currentId);
    if(!currentStudent) return;

    let feeTab = document.querySelector('.nav-item[data-target="fees"]');
    if(feeTab) {
        let feeCleared = localStorage.getItem('nk_stu_fee_alert_viewed') === 'true';
        if(currentStudent.fees === 'Pending' && !feeCleared) feeTab.classList.add('has-alert');
        else feeTab.classList.remove('has-alert');
    }

    let myChats = db.chats[currentId] || [];
    let readChatLen = parseInt(localStorage.getItem('nk_stu_read_chat_len')) || 0;
    let msgTab = document.querySelector('.nav-item[data-target="messages"]');
    if(msgTab) { if(myChats.length > readChatLen) msgTab.classList.add('has-alert'); else msgTab.classList.remove('has-alert'); }

    let readNoticeLen = parseInt(localStorage.getItem('nk_stu_read_notice_len')) || 0;
    let homeTab = document.querySelector('.nav-item[data-target="home"]');
    if(homeTab) { if(db.notices.length > readNoticeLen) homeTab.classList.add('has-alert'); else homeTab.classList.remove('has-alert'); }
}

function renderStudentDashboard() {
    let db = fetchFreshData();
    let currentId = localStorage.getItem('current_student_id') || 'NKGC-101';
    let currentStudent = db.students.find(s => s.id === currentId) || { id: 'NKGC-000', name: 'Guest Student', class: 'N/A', section: 'A', ledger: [], attendance: [], fees: 'Pending', totalPaidAmt: 0 };

    let sideName = document.getElementById('side-school-name'); if(sideName) sideName.innerText = db.school.name;
    let topTag = document.getElementById('top-school-tag'); if(topTag) topTag.innerText = db.school.tag;

    let sNameEl = document.getElementById('student-name'); if(sNameEl) sNameEl.innerText = currentStudent.name;
    let sIdEl = document.getElementById('student-id'); if(sIdEl) sIdEl.innerText = `ID: ${currentStudent.id}`;
    let sClassEl = document.getElementById('student-class'); if(sClassEl) sClassEl.innerText = `Class: ${currentStudent.class} | Sec: ${currentStudent.section || 'A'} | Roll: ${currentStudent.roll || '--'}`;
    let greetEl = document.getElementById('greeting-msg'); if(greetEl) greetEl.innerText = `Welcome, ${currentStudent.name.split(' ')[0]}`;

    let profilePicEl = document.getElementById('profile-img-sidebar');
    if(profilePicEl) profilePicEl.src = currentStudent.photo && currentStudent.photo !== '' ? currentStudent.photo : 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=150&h=150&fit=crop';

    // ==========================================
    // 🔥 ATTENDANCE CIRCLE CALCULATION FIX 🔥
    // ==========================================
    let attLog = currentStudent.attendance || [];
    let totalDays = attLog.length;
    let presentDays = attLog.filter(a => a.status === 'Present').length;
    let absentDays = totalDays - presentDays;
    let attPercent = totalDays === 0 ? 0 : Math.round((presentDays / totalDays) * 100);

    let homeAtt = document.getElementById('home-att'); if(homeAtt) homeAtt.innerText = `${attPercent}%`;
    let attPercentEl = document.getElementById('att-percent'); if(attPercentEl) attPercentEl.innerText = `${attPercent}%`;
    let totPres = document.getElementById('total-present'); if(totPres) totPres.innerHTML = `<i class="fa-solid fa-check"></i> Days Present: ${presentDays}`;
    let totAbs = document.getElementById('total-absent'); if(totAbs) totAbs.innerHTML = `<i class="fa-solid fa-xmark"></i> Days Absent: ${absentDays}`;

    // SAFARI / IPHONE COLOR BUG FIX
    let circle = document.getElementById('att-circle');
    if(circle) {
        let safeColor = '#e5e5ea';
        if (totalDays > 0) {
            safeColor = attPercent >= 75 ? '#007AFF' : (attPercent >= 50 ? '#FF9500' : '#dc3545');
        }
        circle.style.background = `conic-gradient(${safeColor} ${attPercent}%, rgba(0,0,0,0.05) 0deg)`;
    }

    let logTable = document.getElementById('attendance-log-table');
    if(logTable) {
        if(attLog.length === 0) {
            logTable.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888; padding:20px;">No attendance records found yet.</td></tr>`;
        } else {
            let sortedLog = [...attLog].sort((a,b) => new Date(b.date) - new Date(a.date));
            logTable.innerHTML = sortedLog.map(entry => {
                let d = new Date(entry.date);
                let dayName = d.toLocaleDateString('en-GB', {weekday: 'long'});
                let formattedDate = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
                let color = entry.status === 'Present' ? '#28a745' : '#dc3545';
                return `<tr><td style="font-weight:bold;">${formattedDate}</td><td>${dayName}</td><td><span style="color:${color}; font-weight:bold;">${entry.status}</span></td></tr>`;
            }).join('');
        }
    }

    // ==========================================
    // LEDGER & FEES
    // ==========================================
    let totalPaidAmt = currentStudent.totalPaidAmt || 0;
    let totalDueAmt = 0; let currentSessionFee = 0; let ledgerHtml = '';
    function getFeeForClass(className) { if(['Lower Nursery', 'Upper Nursery', 'KG'].includes(className)) return 800; if(['Class 1', 'Class 2'].includes(className)) return 1000; if(['Class 3', 'Class 4'].includes(className)) return 1200; return 1500; }
    let baseClassFee = getFeeForClass(currentStudent.class);

    if (currentStudent.ledger && currentStudent.ledger.length > 0) {
        let sortedLedger = [...currentStudent.ledger].sort((a, b) => { if (a.status === 'Pending' && b.status !== 'Pending') return -1; if (a.status !== 'Pending' && b.status === 'Pending') return 1; return 0; });
        sortedLedger.forEach(entry => {
            if(entry.status === 'Pending' && entry.due > 0) totalDueAmt += entry.due;
            currentSessionFee += (entry.paid || 0) + (entry.due || 0);
            let badgeColor = entry.status === 'Paid' ? '#28a745' : '#dc3545';
            let rowStyle = entry.status === 'Pending' ? 'background: rgba(220,53,69,0.05);' : '';
            let icon = entry.status === 'Pending' ? '<i class="fa-solid fa-triangle-exclamation" style="margin-right:5px;"></i>' : '';
            let amountText = entry.status === 'Pending' ? `<span style="color:#dc3545; font-weight:bold;">Due: ₹${entry.due}</span><br><span style="font-size:0.75rem; color:#28a745;">(Paid: ₹${entry.paid})</span>` : `<span style="color:#28a745; font-weight:bold;">Paid: ₹${entry.paid}</span>`;
            ledgerHtml += `<tr style="${rowStyle}"><td style="${entry.status === 'Pending' ? 'font-weight:bold; color:#dc3545;' : ''}">${icon}${entry.month}</td><td>${amountText}</td><td><span class="badge" style="color:${badgeColor}; border:1px solid ${badgeColor}; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold;">${entry.status}</span></td></tr>`;
        });

        if(totalDueAmt > 0) {
            let lastDue = parseFloat(localStorage.getItem('nk_stu_last_due')) || 0;
            if(totalDueAmt > lastDue) { localStorage.setItem('nk_stu_fee_alert_viewed', 'false'); }
            localStorage.setItem('nk_stu_last_due', totalDueAmt);
        } else { localStorage.setItem('nk_stu_last_due', 0); }
    } else {
        ledgerHtml = `<tr><td colspan="3" style="text-align:center; color:#888; padding:20px;">History Cleared / No records available.</td></tr>`;
        if (currentStudent.fees === 'Paid') { totalDueAmt = 0; currentSessionFee = totalPaidAmt > 0 ? totalPaidAmt : baseClassFee; } else { totalDueAmt = baseClassFee; currentSessionFee = baseClassFee; }
    }

    let homeDue = document.getElementById('home-due'); if(homeDue) homeDue.innerText = `₹ ${totalDueAmt}`;
    let totalFee = document.getElementById('total-fee'); if(totalFee) totalFee.innerText = `₹ ${currentSessionFee}`;
    let paidFee = document.getElementById('paid-fee'); if(paidFee) paidFee.innerText = `₹ ${totalPaidAmt}`;
    let dueFee = document.getElementById('due-fee'); if(dueFee) dueFee.innerText = `₹ ${totalDueAmt}`;
    let ledgerTable = document.getElementById('fee-ledger-table'); if(ledgerTable) ledgerTable.innerHTML = ledgerHtml;

    const noticeList = document.getElementById('announcement-list');
    if(noticeList) noticeList.innerHTML = db.notices.length === 0 ? '<p style="color:var(--text-secondary); font-size:0.9rem;">No new announcements.</p>' : db.notices.map(n => `<li style="padding:10px; border-left:3px solid var(--ios-blue); background:rgba(0,122,255,0.05); margin-bottom:10px; border-radius:5px;"><strong>[${n.date}] ${n.title}</strong><br><span style="font-size:0.85rem; color:#555;">${n.body}</span></li>`).join('');
    const eventsList = document.getElementById('events-list');
    if(eventsList) eventsList.innerHTML = db.events.length === 0 ? '<tr><td colspan="2" style="text-align:center; color:#888;">No events.</td></tr>' : db.events.map(e => `<tr><td style="color:var(--ios-blue); font-weight:700;">${e.date}</td><td>${e.title}</td></tr>`).join('');

    // MARKSHEET LOGIC
    let reportArea = document.getElementById('stu-marksheet-area');
    if(reportArea) {
        if(currentStudent.reportCard && currentStudent.reportCard !== '') {
            if(currentStudent.marksheetLocked) {
                reportArea.style.background = 'rgba(0,122,255,0.05)';
                reportArea.style.borderColor = 'var(--ios-blue)';
                reportArea.innerHTML = `<i class="fa-solid fa-lock" style="font-size:3rem; color:#ccc; margin-bottom:15px;"></i><h3 style="color:#666;">Marksheet Already Downloaded</h3><p style="font-size:0.85rem; color:#888;">Contact Admin if you need another copy.</p>`;
            } else {
                reportArea.style.background = 'rgba(40,167,69,0.05)';
                reportArea.style.borderColor = '#28a745';
                reportArea.innerHTML = `<i class="fa-solid fa-file-circle-check" style="font-size:3rem; color:#28a745; margin-bottom:15px;"></i><h3 style="color:#28a745; margin-bottom:10px;">Your Result is Ready!</h3><button id="dl-mark-btn" class="btn-primary" style="background:#28a745; border:none; padding:10px 20px; font-size:1rem;" onclick="triggerMarksheetDownload('${currentStudent.reportCard}', '${currentStudent.name}')"><i class="fa-solid fa-download"></i> Download Marksheet PDF</button>`;
            }
        } else {
            reportArea.style.background = 'rgba(0,122,255,0.05)';
            reportArea.style.borderColor = 'var(--ios-blue)';
            reportArea.innerHTML = `<i class="fa-solid fa-lock" style="font-size:3rem; color:var(--ios-blue); margin-bottom:15px;"></i><h3 style="color:var(--ios-blue); margin-bottom:10px;">Official Report Cards</h3><p style="color:#666;">Locked until results are published.</p>`;
        }
    }

    let galGrid = document.getElementById('stu-gallery-grid');
    if(galGrid) {
        if(db.gallery.length === 0) { galGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:#888;">No photos to display.</p>'; }
        else { galGrid.innerHTML = db.gallery.map((g, i) => `<div class="gallery-item" onclick="openLightbox(${i})"><img src="${g.src}"></div>`).join(''); }
    }

    renderStudentAssignments();
    updateStudentAlerts();
}

window.triggerMarksheetDownload = function(pdfData, stuName) {
    const link = document.createElement('a'); link.href = pdfData; link.download = stuName + '_Marksheet.pdf';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);

    let btn = document.getElementById('dl-mark-btn');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locking Section...'; btn.disabled = true; btn.style.opacity = '0.7'; }

    let toast = document.getElementById('toast-msg');
    if(toast) { toast.innerText = "Download Started! Section is being locked."; toast.style.bottom = '20px'; setTimeout(() => { toast.style.bottom = '-50px'; }, 3000); }

    setTimeout(() => {
        let db = fetchFreshData(); let currentId = localStorage.getItem('current_student_id') || 'NKGC-101'; let stuIndex = db.students.findIndex(s => s.id === currentId);
        if(stuIndex !== -1) { db.students[stuIndex].marksheetLocked = true; writeJSON('nk_students', db.students); renderStudentDashboard(); }
    }, 1500);
}

let currentSlideIndex = 0;
window.openLightbox = function(index) { currentSlideIndex = index; let db = fetchFreshData(); let lb = document.getElementById('gallery-lightbox'); let img = document.getElementById('lightbox-img'); if(lb && img && db.gallery[index]) { img.src = db.gallery[index].src; lb.classList.add('active'); } }
window.closeLightbox = function() { document.getElementById('gallery-lightbox').classList.remove('active'); }
window.changeSlide = function(step) { let db = fetchFreshData(); currentSlideIndex += step; if(currentSlideIndex >= db.gallery.length) currentSlideIndex = 0; if(currentSlideIndex < 0) currentSlideIndex = db.gallery.length - 1; document.getElementById('lightbox-img').src = db.gallery[currentSlideIndex].src; }

window.renderStudentAssignments = function() {
    let db = fetchFreshData(); let currentId = localStorage.getItem('current_student_id') || 'NKGC-101'; let currentStudent = db.students.find(s => s.id === currentId); if(!currentStudent) return;
    const assignList = document.getElementById('assignment-list'); if(!assignList) return;
    const mySubs = db.submissions.filter(s => s.studentId === currentStudent.id);
    const relevantTasks = db.assignments.filter(a => { let isCurrentTarget = (a.class === currentStudent.class) && (!a.section || a.section === 'All' || a.section === currentStudent.section); let hasSubmitted = mySubs.some(s => s.assignId === a.id); return isCurrentTarget || hasSubmitted; });
    let filterStatus = document.getElementById('stu-filter-status') ? document.getElementById('stu-filter-status').value : 'Active'; let filterClass = document.getElementById('stu-filter-class') ? document.getElementById('stu-filter-class').value : 'All'; let filterSub = document.getElementById('stu-filter-sub') ? document.getElementById('stu-filter-sub').value : 'All';
    let html = '';
    relevantTasks.forEach(a => {
        if (filterClass !== 'All' && a.class !== filterClass) return; if (filterSub !== 'All' && a.sub !== filterSub) return;
        let existingSub = mySubs.find(s => s.assignId === a.id); let isGraded = existingSub && existingSub.status === 'Graded'; let isHidden = existingSub && existingSub.studentHidden;
        if (filterStatus === 'Active' && isGraded) return; if (filterStatus === 'Graded' && (!isGraded || isHidden)) return; if (filterStatus === 'Hidden' && !isHidden) return;
        let actionHtml = '';
        if (!existingSub) {
            if (a.class === currentStudent.class && (!a.section || a.section === 'All' || a.section === currentStudent.section)) { actionHtml = `<div style="display:flex; align-items:center; gap:10px;"><label class="btn-secondary small" style="cursor:pointer; font-size:0.75rem; padding:5px 10px;"><i class="fa-solid fa-paperclip"></i> Select PDF<input type="file" id="file-${a.id}" accept=".pdf" style="display:none;" onchange="updateFileName(this, 'fname-${a.id}')"></label><span id="fname-${a.id}" style="font-size:0.7rem; color:#888; max-width:80px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">No file</span><button class="btn-primary small" style="padding:5px 10px; background:var(--ios-blue);" onclick="submitAssignment('${a.id}', '${a.title}')"><i class="fa-solid fa-upload"></i></button></div>`; }
            else { actionHtml = `<span style="color:#888; font-size:0.8rem; font-style:italic;">Missed Task</span>`; }
        } else if (existingSub.status === 'Submitted') { actionHtml = `<span class="badge" style="color:#FF9500; border:1px solid #FF9500;">Pending Review</span>`; }
        else if (existingSub.status === 'Graded') {
            if (isHidden) { actionHtml = `<span class="badge" style="color:#28a745; border:1px solid #28a745; background:rgba(40,167,69,0.1); margin-right:10px;">Marks: ${existingSub.marks}</span><button class="btn-secondary small" style="color:var(--ios-blue); border-color:var(--ios-blue); padding:4px 8px;" onclick="toggleHideAssignment('${a.id}', false)"><i class="fa-solid fa-eye"></i> Restore</button>`; }
            else { actionHtml = `<span class="badge" style="color:#28a745; border:1px solid #28a745; background:rgba(40,167,69,0.1); margin-right:10px;">Marks: ${existingSub.marks}</span><button class="btn-secondary small" style="color:#dc3545; border-color:rgba(220,53,69,0.3); padding:4px 8px;" onclick="toggleHideAssignment('${a.id}', true)"><i class="fa-solid fa-eye-slash"></i> Hide</button>`; }
        }
        html += `<tr><td style="color:var(--ios-blue); font-weight:700;">${a.sub}<br><span style="font-size:0.7rem; color:#888; font-weight:normal;">${a.class} ${a.section && a.section !== 'All' ? '(Sec '+a.section+')' : ''}</span></td><td>${a.title}</td><td>${a.date}</td><td>${actionHtml}</td></tr>`;
    });
    if(html === '') html = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">No records match your filter.</td></tr>';
    assignList.innerHTML = html;
}

window.updateFileName = function(input, labelId) { if(input.files && input.files[0]) { document.getElementById(labelId).innerText = input.files[0].name; document.getElementById(labelId).style.color = '#28a745'; } }
window.submitAssignment = function(assignId, assignTitle) {
    let fileInput = document.getElementById(`file-${assignId}`); if (!fileInput.files || fileInput.files.length === 0) return alert("Please select a PDF file first."); if (fileInput.files[0].type !== "application/pdf") return alert("Only PDF files are allowed.");
    let currentId = localStorage.getItem('current_student_id') || 'NKGC-101'; let db = fetchFreshData(); let currentStudent = db.students.find(s => s.id === currentId);
    let reader = new FileReader();
    reader.onload = function(e) {
        db.submissions.push({ assignId: assignId, assignTitle: assignTitle, studentId: currentStudent.id, studentName: currentStudent.name, class: currentStudent.class, section: currentStudent.section, fileData: e.target.result, status: 'Submitted', marks: '', teacherHidden: false, studentHidden: false });
        writeJSON('nk_submissions', db.submissions);
        let toast = document.getElementById('toast-msg'); if(toast) { toast.innerText = "Assignment Submitted!"; toast.style.bottom = '20px'; setTimeout(() => { toast.style.bottom = '-50px'; }, 3000); }
        renderStudentAssignments();
    };
    reader.readAsDataURL(fileInput.files[0]);
}

window.toggleHideAssignment = function(assignId, hideStatus) { let currentId = localStorage.getItem('current_student_id') || 'NKGC-101'; let allSubs = safeReadJSON('nk_submissions', []); let subIndex = allSubs.findIndex(s => s.assignId === assignId && s.studentId === currentId); if(subIndex !== -1) { allSubs[subIndex].studentHidden = hideStatus; writeJSON('nk_submissions', allSubs); renderStudentAssignments(); } }

// ==========================================
// 🔥 STUDENT CHAT SYSTEM WITH EDIT/DELETE 🔥
// ==========================================
window.renderStudentChat = function() {
    let box = document.getElementById('chat-history');
    if(!box) return;
    let currentId = localStorage.getItem('current_student_id') || 'NKGC-101';
    let allChats = safeReadJSON('nk_chats', {});
    let myChats = allChats[currentId] || [];

    if(myChats.length === 0) {
        box.innerHTML = '<p style="text-align:center; color:#aaa; font-size:0.85rem; margin-top:20px;">Start your conversation with the Administration here.</p>';
    } else {
        box.innerHTML = myChats.map((c, index) => {
            let isStudent = c.sender === 'student';
            let actionHtml = '';

            // Edit/Delete features
            if (isStudent) {
                actionHtml = `
                <div style="display:flex; gap:15px; justify-content:flex-end; margin-top:8px; border-top:1px solid rgba(0,0,0,0.1); padding-top:8px;">
                    <span onclick="editStudentChatMsg(${index})" style="cursor:pointer; font-size:0.75rem; color:var(--ios-blue); display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-pen"></i> Edit</span>
                    <span onclick="deleteStudentChatMsg(${index})" style="cursor:pointer; font-size:0.75rem; color:#dc3545; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-trash"></i> Delete</span>
                </div>`;
            }

            let editTag = c.edited ? ' <span style="font-style:italic;">(Edited)</span>' : '';

            return `
            <div class="msg ${isStudent ? 'student-msg' : 'teacher-msg'}">
                <span style="font-size:0.7rem; opacity:0.7; display:block; margin-bottom:3px;">
                    ${isStudent ? 'Me' : 'School Admin'} • ${c.time}${editTag}
                </span>
                <div style="word-wrap: break-word;">${c.text}</div>
                ${actionHtml}
            </div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    }
}

window.editStudentChatMsg = function(index) {
    let currentId = localStorage.getItem('current_student_id') || 'NKGC-101';
    let allChats = safeReadJSON('nk_chats', {});
    if(!allChats[currentId]) return;

    let oldText = allChats[currentId][index].text;
    let newText = prompt("Edit your message:", oldText);

    if (newText !== null && newText.trim() !== "" && newText.trim() !== oldText) {
        allChats[currentId][index].text = newText.trim();
        allChats[currentId][index].edited = true;
        writeJSON('nk_chats', allChats);
        renderStudentChat();
    }
}

window.deleteStudentChatMsg = function(index) {
    let currentId = localStorage.getItem('current_student_id') || 'NKGC-101';
    let allChats = safeReadJSON('nk_chats', {});
    if(!allChats[currentId]) return;

    if (confirm("Are you sure you want to delete this message?")) {
        allChats[currentId].splice(index, 1);
        writeJSON('nk_chats', allChats);
        renderStudentChat();
    }
}

function createParticles() { const c = document.getElementById('particles-container'); if(!c) return; c.innerHTML = ''; for(let i=0; i<15; i++) { let p = document.createElement('div'); p.className = 'glass-particle'; let size = Math.random() * 30 + 10; p.style.width = size + 'px'; p.style.height = size + 'px'; p.style.left = (Math.random() * 100) + 'vw'; p.style.animationDuration = (Math.random() * 12 + 8) + 's'; c.appendChild(p); } }

window.addEventListener('storage', () => { invalidateStudentCache(); renderStudentDashboard(); renderStudentChat(); updateStudentAlerts(); });

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-msg-btn'); const inputField = document.getElementById('chat-input');
    if(sendBtn && inputField) {
        sendBtn.onclick = function() {
            let val = inputField.value.trim(); if(val === '') return;
            let currentId = localStorage.getItem('current_student_id') || 'NKGC-101'; let allChats = safeReadJSON('nk_chats', {}); if(!allChats[currentId]) allChats[currentId] = [];
            allChats[currentId].push({ sender: 'student', text: val, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
            writeJSON('nk_chats', allChats); inputField.value = ''; renderStudentChat();
        }
        inputField.onkeydown = function(e) { if(e.key === 'Enter') sendBtn.onclick(); };
    }
    createParticles();
    let dateEl = document.getElementById('live-date'); if(dateEl) setInterval(() => { dateEl.innerText = new Date().toLocaleDateString('en-GB', {weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }, 1000);
    renderStudentDashboard(); renderStudentChat();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active')); this.classList.add('active');
            let tId = this.getAttribute('data-target');
            document.querySelectorAll('.tab-section').forEach(s => { s.classList.remove('active'); if(s.id === 'tab-' + tId) { s.classList.add('active'); s.style.animation='none'; void s.offsetWidth; s.style.animation=null; } });

            let db = fetchFreshData();
            if(tId === 'fees') { localStorage.setItem('nk_stu_fee_alert_viewed', 'true'); this.classList.remove('has-alert'); }
            else if(tId === 'messages') { let myChats = db.chats[localStorage.getItem('current_student_id') || 'NKGC-101'] || []; localStorage.setItem('nk_stu_read_chat_len', myChats.length); this.classList.remove('has-alert'); renderStudentChat(); }
            else if(tId === 'home') { localStorage.setItem('nk_stu_read_notice_len', db.notices.length); this.classList.remove('has-alert'); }
        });
    });
});
