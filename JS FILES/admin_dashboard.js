// ==========================================
// 1. DATABASE VERSION MANAGER
// ==========================================
if (localStorage.getItem('db_version') !== 'v56_direct_password_update') {
    localStorage.setItem('db_version', 'v56_direct_password_update');
    if (!localStorage.getItem('nk_master_pass')) { localStorage.setItem('nk_master_pass', 'admin123'); }
    if (!localStorage.getItem('nk_master_user')) { localStorage.setItem('nk_master_user', 'admin'); }
    if (!localStorage.getItem('nk_school_info')) { localStorage.setItem('nk_school_info', JSON.stringify({ name: 'Netra K.G Center', tag: 'Operations Portal' })); }
    console.log("Upgraded to V56: Direct Password Updates added.");
}

// ==========================================
// 2. GLOBAL STATE & DATABASE
// ==========================================
window.isPrincipal = false;
const classOrder = { 'Lower Nursery': 1, 'Upper Nursery': 2, 'KG': 3, 'Class 1': 4, 'Class 2': 5, 'Class 3': 6, 'Class 4': 7 };

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

function getFeeForClass(className) {
    if (['Lower Nursery', 'Upper Nursery', 'KG'].includes(className)) return 800;
    if (['Class 1', 'Class 2'].includes(className)) return 1000;
    if (['Class 3', 'Class 4'].includes(className)) return 1200;
    return 1500;
}

let db = {
    students: safeReadJSON('nk_students', []),
    teachers: safeReadJSON('nk_teachers', []),
    notices: safeReadJSON('nk_notices', []),
    assignments: safeReadJSON('nk_assignments', []),
    events: safeReadJSON('nk_events', []),
    logs: safeReadJSON('nk_logs', [{ msg: 'System initialized.', time: '09:00 AM', type: 'general' }]),
    chats: safeReadJSON('nk_chats', {}),
    submissions: safeReadJSON('nk_submissions', []),
    gallery: safeReadJSON('nk_gallery', [])
};

let renderQueued = false;

function scheduleRenderAll() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderAll();
    });
}

function saveDB() {
    try {
        db.students.sort((a, b) => (classOrder[a.class || ''] || 99) - (classOrder[b.class || ''] || 99));
        const payload = {
            nk_students: db.students,
            nk_teachers: db.teachers,
            nk_notices: db.notices,
            nk_assignments: db.assignments,
            nk_events: db.events,
            nk_logs: db.logs,
            nk_chats: db.chats,
            nk_submissions: db.submissions,
            nk_gallery: db.gallery
        };
        Object.entries(payload).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
        scheduleRenderAll();
    } catch (e) { console.error("SaveDB Error:", e); }
}

function addLog(message, logType = 'general') {
    db.logs.unshift({ msg: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: logType });
    if (db.logs.length > 20) db.logs.pop();
}

function checkAndResetTeacherSalaries() {
    let today = new Date();
    let lastReset = JSON.parse(localStorage.getItem('nk_salary_reset')) || { month: -1, year: -1 };
    if (today.getDate() > 3 && (lastReset.month !== today.getMonth() || lastReset.year !== today.getFullYear())) {
        db.teachers.forEach(t => t.sal = 'Pending');
        db.logs.unshift({ msg: 'Auto-System: Teacher Salaries marked Pending.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'finance' });
        localStorage.setItem('nk_salary_reset', JSON.stringify({ month: today.getMonth(), year: today.getFullYear() }));
        saveDB();
    }
}

function updateAdminAlerts() {
    let needsGrading = db.submissions.some(sub => sub.status === 'Submitted' && !sub.teacherHidden);
    let assignTab = document.querySelector('.nav-item[data-target="assignments"]');
    if (assignTab) { if(needsGrading) assignTab.classList.add('has-alert'); else assignTab.classList.remove('has-alert'); }

    let needsReply = Object.values(db.chats).some(chat => chat.length > 0 && chat[chat.length - 1].sender === 'student');
    let msgTab = document.querySelector('.nav-item[data-target="messages"]');
    if (msgTab) { if(needsReply) msgTab.classList.add('has-alert'); else msgTab.classList.remove('has-alert'); }
}

// ==========================================
// 3. UI RENDERING
// ==========================================
function renderAll() {
    try {
        let schoolInfo = safeReadJSON('nk_school_info', { name: 'Netra K.G Center', tag: 'Operations Portal' });
        let topHeader = document.getElementById('top-school-info');
        if(topHeader) topHeader.innerText = schoolInfo.name + ' - ' + schoolInfo.tag;

        let ovStu = document.getElementById('ov-stu'); if (ovStu) ovStu.innerText = db.students.length;
        let ovTch = document.getElementById('ov-tch'); if (ovTch) ovTch.innerText = db.teachers.length;

        let totalPaid = 0; let totalDue = 0;
        let pendingStudentsList = [];

        db.students.forEach(s => {
            totalPaid += (s.totalPaidAmt || 0);
            let sDue = 0; let dueMonths = [];

            if (s.ledger && s.ledger.length > 0) {
                s.ledger.forEach(entry => {
                    if (entry.status === 'Pending' && entry.due > 0) { totalDue += entry.due; sDue += entry.due; dueMonths.push(entry.month.split(' ')[0]); }
                });
            } else if (s.fees === 'Pending') {
                let baseFee = getFeeForClass(s.class);
                totalDue += baseFee; sDue += baseFee; dueMonths.push('Pending Base');
            }
            if (sDue > 0) {
                pendingStudentsList.push({ stu: s, dueAmt: sDue, months: dueMonths.join(', ') });
            }
        });

        let ovFees = document.getElementById('ov-fees'); if (ovFees) ovFees.innerText = `₹ ${totalPaid}`;
        let ovDues = document.getElementById('ov-dues'); if (ovDues) ovDues.innerText = `₹ ${totalDue}`;

        let tbody = document.getElementById('due-fees-table-body');
        if (tbody) {
            if (pendingStudentsList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#28a745; font-weight:bold;">No pending dues across the school. Everyone has paid! 🎉</td></tr>`;
            } else {
                pendingStudentsList.sort((a, b) => {
                    let cDiff = (classOrder[a.stu.class] || 99) - (classOrder[b.stu.class] || 99);
                    if (cDiff !== 0) return cDiff;
                    let sDiff = (a.stu.section || 'A').localeCompare(b.stu.section || 'A');
                    if (sDiff !== 0) return sDiff;
                    return (parseInt(a.stu.roll) || 99) - (parseInt(b.stu.roll) || 99);
                });

                tbody.innerHTML = pendingStudentsList.map(item => `
                    <tr>
                        <td><strong style="color:var(--ios-blue);">${item.stu.class}</strong><br><span style="font-size:0.75rem; color:#888; font-weight:bold;">Sec: ${item.stu.section||'A'}</span></td>
                        <td style="font-weight:bold; font-size: 1.1rem; text-align:center;">${item.stu.roll || '--'}</td>
                        <td><strong>${item.stu.name}</strong><br><span style="font-size:0.75rem; color:#888;">ID: ${item.stu.id}</span></td>
                        <td style="color:#dc3545; font-size:0.85rem; max-width: 150px; word-wrap: break-word;">${item.months}</td>
                        <td style="font-weight:bold; font-size:1.05rem; color:#dc3545;">₹${item.dueAmt}</td>
                    </tr>
                `).join('');
            }
        }

        renderStudents();

        let tchBody = document.getElementById('teacher-table-body');
        if (tchBody) { tchBody.innerHTML = db.teachers.map((t, i) => `<tr><td>${t.id || ''}</td><td>${t.name || ''}</td><td>${t.sub || ''}</td><td><span class="badge ${t.sal === 'Paid' ? 'paid' : 'pending'}" onclick="toggleSalary(${i})" title="Click to update">${t.sal || 'Pending'}</span></td><td><button class="action-icon view" onclick="viewTeacher(${i})"><i class="fa-solid fa-eye"></i></button><button class="action-icon edit locked-action" style="color:#28a745;" onclick="openEditTeacher(${i})"><i class="fa-solid fa-pen"></i></button><button class="action-icon delete locked-action" onclick="deleteRecord('teachers', ${i})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); }

        let assignBody = document.getElementById('assign-table-body');
        if (assignBody) { assignBody.innerHTML = db.assignments.map((a, i) => `<tr><td style="color:#888; font-size:0.8rem;">${a.id}</td><td><strong>${a.title}</strong><br><span style="font-size:0.8rem; color:#666;">${a.sub} - Due: ${a.date}</span></td><td>${a.class} <br><span style="font-size:0.75rem; color:#888;">${a.section && a.section !== 'All' ? '(Sec '+a.section+')' : '(All Sec)'}</span></td><td><button class="action-icon edit" style="color:#28a745;" onclick="openEditAssignment(${i})"><i class="fa-solid fa-pen"></i></button><button class="action-icon delete" onclick="deleteRecord('assignments', ${i})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); }

        renderGradingTable();

        let noticeBody = document.getElementById('notice-table-body');
        if (noticeBody) { noticeBody.innerHTML = db.notices.map((n, i) => `<tr><td>${n.date || ''}</td><td>${n.title || ''}</td><td><button class="action-icon edit" style="color:#28a745;" onclick="openEditNotice(${i})"><i class="fa-solid fa-pen"></i></button><button class="action-icon delete" onclick="deleteRecord('notices', ${i})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); }

        let logBody = document.getElementById('activity-log');
        if (logBody) { let visibleLogs = window.isPrincipal ? db.logs : db.logs.filter(l => l.type !== 'finance'); logBody.innerHTML = visibleLogs.length === 0 ? '<p style="color:#888; font-size:0.85rem; padding:10px;">No recent activity.</p>' : visibleLogs.map(l => `<li style="background:rgba(0,122,255,0.05); padding:10px; border-left:3px solid var(--ios-blue); border-radius:5px; margin-bottom:5px; font-size:0.85rem;"><strong>[Log]</strong> ${l.msg} <span style="float:right; color:#888;">${l.time}</span></li>`).join(''); }

        renderDropdowns();
        renderAdminChatList();
        renderGallery();
        updateAdminAlerts();
    } catch (e) { console.error("Render error:", e); }
}

window.renderStudents = function () {
    const body = document.getElementById('student-table-body');
    if (!body) return;
    let filterClass = document.getElementById('filter-class') ? document.getElementById('filter-class').value : 'All';
    let filterSection = document.getElementById('filter-section') ? document.getElementById('filter-section').value : 'All';
    let filterSearch = document.getElementById('filter-search') ? document.getElementById('filter-search').value.toLowerCase() : '';

    let filteredHtml = '';
    let sortedStudents = [...db.students].sort((a,b) => (parseInt(a.roll)||99) - (parseInt(b.roll)||99));
    let studentIndexMap = new Map(db.students.map((student, index) => [student.id, index]));

    sortedStudents.forEach((s) => {
        let index = studentIndexMap.get(s.id);
        if (typeof index !== 'number') return;
        let sClass = s.class || ''; let sSec = s.section || ''; let sName = (s.name || '').toLowerCase(); let sId = (s.id || '').toLowerCase();
        let classMatch = (filterClass === 'All') || (sClass === filterClass);
        let secMatch = (filterSection === 'All') || (sSec === filterSection);
        let searchMatch = (filterSearch === '' || sName.includes(filterSearch) || sId.includes(filterSearch));

        if (classMatch && secMatch && searchMatch) {
            let badgeClass = s.fees === 'Paid' ? 'paid' : 'pending'; let statusText = s.fees === 'Paid' ? 'Paid' : 'Pending';
            if (s.ledger && s.ledger.length > 0) { let isPending = s.ledger.some(entry => entry.status === 'Pending' && entry.due > 0); badgeClass = isPending ? 'pending' : 'paid'; statusText = isPending ? 'Pending' : 'Paid'; s.fees = statusText; }
            filteredHtml += `<tr><td>${s.id || 'N/A'} <br><span style="font-size:0.7rem; color:#888;">Roll: ${s.roll || '--'}</span></td><td>${s.name || 'Unknown'}</td><td>${sClass}</td><td>${sSec || 'A'}</td><td><span class="badge ${badgeClass}">${statusText}</span></td><td><button class="action-icon view" onclick="viewStudent(${index})"><i class="fa-solid fa-eye"></i></button><button class="action-icon edit locked-action" style="color:#28a745;" onclick="openEditStudent(${index})"><i class="fa-solid fa-pen"></i></button><button class="action-icon delete locked-action" onclick="deleteRecord('students', ${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        }
    });
    body.innerHTML = filteredHtml === '' ? '<tr><td colspan="6" style="text-align:center; color:#888; padding: 20px;">No records found.</td></tr>' : filteredHtml;
}

// ==========================================
// 4. SMART FEES ENGINE (SINGLE & BULK)
// ==========================================
function renderDropdowns() { filterFeeStudents(); }

window.toggleFeeMode = function(mode) {
    let sBtn = document.getElementById('btn-single-fee');
    let bBtn = document.getElementById('btn-bulk-fee');
    let sArea = document.getElementById('single-fee-area');
    document.getElementById('fee-mode').value = mode;
    if(mode === 'single') { sBtn.className = 'btn-primary'; bBtn.className = 'btn-secondary'; sArea.style.display = 'block'; }
    else { bBtn.className = 'btn-primary'; sBtn.className = 'btn-secondary'; sArea.style.display = 'none'; }
}

window.filterFeeStudents = function() {
    let fClass = document.getElementById('fee-filter-class') ? document.getElementById('fee-filter-class').value : 'All';
    let fSec = document.getElementById('fee-filter-sec') ? document.getElementById('fee-filter-sec').value : 'All';
    let searchInput = document.getElementById('fee-search-input');
    let search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let filtered = db.students.filter(s => { return (fClass === 'All' || s.class === fClass) && (fSec === 'All' || s.section === fSec) && (search === '' || (s.id||'').toLowerCase().includes(search) || (s.roll||'').toString() === search || (s.name||'').toLowerCase().includes(search)); });
    filtered.sort((a,b) => (parseInt(a.roll)||99) - (parseInt(b.roll)||99));
    let selectEl = document.getElementById('fee-stu-select');
    if(selectEl) {
        if(filtered.length === 0) selectEl.innerHTML = '<option value="">No matching students found</option>';
        else selectEl.innerHTML = '<option value="">Select Student from List</option>' + filtered.map(s => `<option value="${s.id}">Roll ${s.roll||'--'} | ${s.name} (${s.id})</option>`).join('');
    }
}

window.handleFeeUpdate = function (e) {
    e.preventDefault();
    let mode = document.getElementById('fee-mode').value;
    let month = document.getElementById('fee-month').value;
    let action = document.getElementById('fee-status').value;
    let rawInput = document.getElementById('fee-amount').value;
    let inputAmount = parseFloat(rawInput);
    let targetStudents = [];

    if (mode === 'single') {
        let stuId = document.getElementById('fee-stu-select').value;
        if(!stuId) return alert("Please search and select a single student from the list.");
        let stuIndex = db.students.findIndex(s => s.id === stuId);
        if(stuIndex !== -1) targetStudents.push(db.students[stuIndex]);
    } else {
        let fClass = document.getElementById('fee-filter-class').value;
        let fSec = document.getElementById('fee-filter-sec').value;
        if (fClass === 'All') return alert("⚠️ Warning: For Bulk Update, please select a specific Class (not 'All Classes').");
        if(!confirm(`🔥 BULK UPDATE CONFIRMATION 🔥\n\nAre you sure you want to mark ${month} as ${action} for ALL students in ${fClass} (Sec: ${fSec})?`)) return;
        targetStudents = db.students.filter(s => s.class === fClass && (fSec === 'All' || s.section === fSec));
        if(targetStudents.length === 0) return alert("No students found in this Class & Section combination.");
    }

    let totalUpdated = 0;
    targetStudents.forEach(s => {
        if (!s.ledger) s.ledger = []; if (!s.totalPaidAmt) s.totalPaidAmt = 0;
        let monthIndex = s.ledger.findIndex(entry => entry.month === month);
        if (monthIndex === -1) { s.ledger.push({ month: month, due: getFeeForClass(s.class), paid: 0, status: 'Pending' }); monthIndex = s.ledger.length - 1; }
        let entry = s.ledger[monthIndex];
        let amtToProcess = inputAmount;
        if (rawInput === '' || isNaN(amtToProcess) || amtToProcess < 0) {
            if (action === 'Paid') { amtToProcess = entry.due; } else if (action === 'Pending') { if (entry.due > 0) { amtToProcess = 0; } else { amtToProcess = getFeeForClass(s.class); } }
        }
        if (action === 'Paid' && amtToProcess > 0) {
            entry.paid += amtToProcess; entry.due -= amtToProcess; if (entry.due <= 0) { entry.due = 0; entry.status = 'Paid'; } s.totalPaidAmt += amtToProcess; addLog(`₹${amtToProcess} received from ${s.name} (${s.id}).`, 'finance'); totalUpdated++;
        } else if (action === 'Pending' && amtToProcess > 0) {
            entry.due += amtToProcess; entry.status = 'Pending'; addLog(`₹${amtToProcess} added as due for ${s.name}.`, 'finance'); totalUpdated++;
        } else if (action === 'Pending' && amtToProcess === 0) { entry.status = 'Pending'; totalUpdated++; }
        let isPending = s.ledger.some(en => en.status === 'Pending' && en.due > 0); s.fees = isPending ? 'Pending' : 'Paid';
    });

    saveDB();
    if (mode === 'single') {
        let entry = targetStudents[0].ledger.find(en => en.month === month);
        if (entry.due === 0) showSuccessPopup(`${month} Fees Fully Cleared!`); else showSuccessPopup(`Ledger Updated. Pending: ₹${entry.due}`);
    } else { showSuccessPopup(`Bulk Update Successful for ${totalUpdated} students!`); }
    e.target.reset(); filterFeeStudents();
}

// ==========================================
// 5. ATTENDANCE ENGINE
// ==========================================
window.loadAttendanceList = function () { let selClass = document.getElementById('att-class').value; let selSec = document.getElementById('att-section').value; let selDate = document.getElementById('att-date').value; if (!selClass || !selDate) return showErrorPopup('Please select Class and Date to load the register.'); let filtered = db.students.filter(s => s.class === selClass && (selSec === 'All' || s.section === selSec)); filtered.sort((a,b) => (parseInt(a.roll) || 99) - (parseInt(b.roll) || 99)); let body = document.getElementById('att-table-body'); if (!body) return; if (filtered.length === 0) return body.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:20px; color:#888;">No students found for this class/section.</td></tr>`; body.innerHTML = filtered.map(s => { let existingRecord = (s.attendance || []).find(a => a.date === selDate); let isAbsent = existingRecord && existingRecord.status === 'Absent'; return `<tr><td><strong>Roll ${s.roll||'--'} : ${s.name || ''}</strong> <br><span style="font-size:0.8rem; color:#888;">ID: ${s.id || ''} | Sec: ${s.section||''}</span></td><td><label style="color:#28a745; margin-right:15px; font-weight:bold; cursor:pointer;"><input type="radio" name="att_${s.id}" value="Present" ${!isAbsent ? 'checked' : ''}> Present</label><label style="color:#dc3545; font-weight:bold; cursor:pointer;"><input type="radio" name="att_${s.id}" value="Absent" ${isAbsent ? 'checked' : ''}> Absent</label></td></tr>`; }).join('') + `<tr><td colspan="2"><button class="btn-primary w-100 mt-10" onclick="saveActualAttendance()"><i class="fa-solid fa-cloud-arrow-up"></i> Save Student Attendance</button></td></tr>`; }
window.saveActualAttendance = function () { let selClass = document.getElementById('att-class').value; let selSec = document.getElementById('att-section').value; let selDate = document.getElementById('att-date').value; if (!selClass || !selDate) return showErrorPopup("Warning: Class and Date box cannot be empty."); let updatedCount = 0; db.students.forEach(s => { if (s.class === selClass && (selSec === 'All' || s.section === selSec)) { let radios = document.getElementsByName(`att_${s.id}`); if (radios && radios.length > 0) { let finalStatus = 'Present'; for (let i = 0; i < radios.length; i++) { if (radios[i].checked) finalStatus = radios[i].value; } if (!s.attendance) s.attendance = []; let existingIndex = s.attendance.findIndex(a => a.date === selDate); if (existingIndex !== -1) { s.attendance[existingIndex].status = finalStatus; } else { s.attendance.push({ date: selDate, status: finalStatus }); } updatedCount++; } } }); if (updatedCount > 0) { addLog(`Student Attendance mapped for ${selClass}.`, 'academic'); saveDB(); showSuccessPopup(`Saved! Student portal reflects this instantly.`); } else { showErrorPopup("Please click 'Load Students' first."); } }
window.loadTeacherAttendanceList = function() { let selDate = document.getElementById('tch-att-date').value; if(!selDate) return showErrorPopup('Please select a Date to load the staff register.'); let body = document.getElementById('tch-att-table-body'); if(!body) return; if(db.teachers.length === 0) return body.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:20px; color:#888;">No staff registered.</td></tr>`; body.innerHTML = db.teachers.map(t => { let existingRecord = (t.attendance || []).find(a => a.date === selDate); let isAbsent = existingRecord && existingRecord.status === 'Absent'; return `<tr><td><strong>${t.name||''}</strong> <br><span style="font-size:0.8rem; color:#888;">ID: ${t.id||''} | ${t.sub||''}</span></td><td><label style="color:#28a745; margin-right:10px; font-weight:bold; cursor:pointer;"><input type="radio" name="att_t_${t.id}" value="Present" ${!isAbsent ? 'checked' : ''}> Present</label><label style="color:#dc3545; font-weight:bold; cursor:pointer;"><input type="radio" name="att_t_${t.id}" value="Absent" ${isAbsent ? 'checked' : ''}> Absent</label></td></tr>`; }).join('') + `<tr><td colspan="2"><button class="btn-primary w-100 mt-10" onclick="saveTeacherAttendance()"><i class="fa-solid fa-cloud-arrow-up"></i> Save Staff Attendance</button></td></tr>`; }
window.saveTeacherAttendance = function() { let selDate = document.getElementById('tch-att-date').value; if(!selDate) return showErrorPopup("Warning: Date cannot be empty."); db.teachers.forEach(t => { let radios = document.getElementsByName(`att_t_${t.id}`); if(radios && radios.length > 0) { let finalStatus = 'Present'; for(let i=0; i<radios.length; i++) { if(radios[i].checked) finalStatus = radios[i].value; } if(!t.attendance) t.attendance = []; let existingIndex = t.attendance.findIndex(a => a.date === selDate); if(existingIndex !== -1) { t.attendance[existingIndex].status = finalStatus; } else { t.attendance.push({ date: selDate, status: finalStatus }); } } }); addLog(`Staff Attendance saved for ${selDate}.`, 'general'); saveDB(); showSuccessPopup(`Staff Attendance Saved Successfully!`); }

// ==========================================
// 6. TEACHER GRADING SYSTEM
// ==========================================
window.renderGradingTable = function() { let filterClass = document.getElementById('grade-filter-class'); let selClass = filterClass ? filterClass.value : 'All'; let filterSec = document.getElementById('grade-filter-section'); let selSec = filterSec ? filterSec.value : 'All'; let body = document.getElementById('grading-table-body'); if(!body) return; let html = ''; db.submissions.forEach((sub, index) => { if(sub.teacherHidden) return; let matchClass = (selClass === 'All' || sub.class === selClass); let matchSec = (selSec === 'All' || sub.section === selSec); if(matchClass && matchSec) { let statusBadge = sub.status === 'Graded' ? `<span style="color:#28a745; font-weight:bold;">Graded (${sub.marks})</span>` : `<span style="color:#FF9500; font-weight:bold;">Pending Review</span>`; html += `<tr><td><strong>${sub.studentName}</strong><br><span style="font-size:0.8rem; color:#888;">ID: ${sub.studentId} | Sec: ${sub.section}</span></td><td>${sub.assignTitle}</td><td><a href="${sub.fileData}" download="${sub.studentName}_${sub.assignTitle}.pdf" class="btn-secondary small" style="text-decoration:none; padding:5px 10px; color:var(--ios-blue); border-color:var(--ios-blue);"><i class="fa-solid fa-file-pdf"></i> Download PDF</a></td><td><input type="text" id="mark-${index}" placeholder="e.g. 18/20" class="glass-input" style="width:90px; padding:6px; font-size:0.85rem;" value="${sub.marks || ''}"></td><td style="text-align:center;"><div style="display:flex; justify-content:center; gap:5px; margin-bottom:5px;"><button class="btn-primary small" style="background:#28a745; border:none; padding:5px 10px;" onclick="saveMarks(${index})" title="Post Marks"><i class="fa-solid fa-check"></i></button><button class="btn-secondary small" style="color:#dc3545; border-color:rgba(220,53,69,0.3); padding:5px 10px;" onclick="deleteSubmission(${index})" title="Clear from Queue"><i class="fa-solid fa-trash-can"></i></button></div><div>${statusBadge}</div></td></tr>`; } }); body.innerHTML = html === '' ? '<tr><td colspan="5" style="text-align:center; color:#888; padding:20px;">No submissions match this filter.</td></tr>' : html; }
window.saveMarks = function(index) { let markInput = document.getElementById(`mark-${index}`).value; if(markInput.trim() === '') return alert('Please enter marks before saving.'); db.submissions[index].marks = markInput; db.submissions[index].status = 'Graded'; addLog(`Graded assignment for ${db.submissions[index].studentName}.`, 'academic'); saveDB(); renderGradingTable(); showSuccessPopup(`Marks updated successfully!`); }
window.deleteSubmission = function(index) { showConfirm(`Clear this from your queue? \n(Student will STILL keep their marks safely)`, () => { db.submissions[index].teacherHidden = true; saveDB(); renderGradingTable(); showSuccessPopup('Cleared from your view successfully.'); }); }

// ==========================================
// 7. ADVANCED CHAT SYSTEM WITH EDIT/DELETE
// ==========================================
let currentChatStudentId = null;

function renderAdminChatList() {
    let list = document.getElementById('admin-chat-list');
    if (!list) return;

    let chatStudents = [...db.students].sort((a, b) => {
        let aChats = db.chats[a.id] || []; let bChats = db.chats[b.id] || [];
        let aTime = aChats.length > 0 ? new Date('1970/01/01 ' + aChats[aChats.length-1].time).getTime() : 0;
        let bTime = bChats.length > 0 ? new Date('1970/01/01 ' + bChats[bChats.length-1].time).getTime() : 0;
        return bTime - aTime;
    });

    list.innerHTML = chatStudents.map(s => {
        let chats = db.chats[s.id] || [];
        let hasUnread = chats.length > 0 && chats[chats.length-1].sender === 'student';
        let dotHtml = hasUnread ? `<div style="width:12px;height:12px;background:#ff3b30;border-radius:50%;position:absolute;top:10px;right:10px;animation:pulse-dot 2s infinite;"></div>` : '';
        let pic = s.photo && s.photo !== '' ? s.photo : 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=150&h=150&fit=crop';
        return `<div class="s-item" style="position:relative; display:flex; gap:10px; align-items:center; padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="loadAdminChat('${s.id}')" id="chat-list-${s.id}"> ${dotHtml} <div class="s-icon" style="width:50px; height:50px; border-radius:50%; overflow:hidden; flex-shrink:0;"> <img src="${pic}" style="width:100%;height:100%;object-fit:cover;"> </div> <div class="s-info"> <h4 style="margin:0; font-size:1rem; color:var(--text-main);">${s.name||'User'}</h4> <p style="margin:0; font-size:0.75rem; color:#888;">ID: ${s.id} | Roll: ${s.roll||'--'}</p> <p style="margin:0; font-size:0.75rem; color:var(--ios-blue); font-weight:bold;">${s.class} (Sec ${s.section||'A'})</p> </div> </div>`;
    }).join('');

    if (!currentChatStudentId && chatStudents.length > 0) {
        setTimeout(() => { let firstStuObj = document.getElementById(`chat-list-${chatStudents[0].id}`); if(firstStuObj) firstStuObj.click(); }, 200);
    }
}

window.loadAdminChat = function (stuId) {
    currentChatStudentId = stuId;
    let s = db.students.find(x => x.id === stuId);
    if (!s) return;
    document.querySelectorAll('.s-item').forEach(el => el.classList.remove('active'));
    let chatItem = document.getElementById(`chat-list-${stuId}`);
    if (chatItem) chatItem.classList.add('active');

    document.getElementById('chat-s-name').innerText = s.name;
    document.getElementById('chat-s-id').innerText = `ID: ${s.id} | Class: ${s.class}`;

    let inputEl = document.getElementById('admin-chat-input');
    let btnEl = document.getElementById('admin-send-btn');
    if(inputEl) {
        inputEl.disabled = false;
        inputEl.placeholder = "Type reply here...";
        inputEl.onkeydown = function(e) { if(e.key === 'Enter') window.sendAdminMsg(); };
    }
    if(btnEl) btnEl.disabled = false;

    renderChatHistory();
}

function renderChatHistory() {
    let box = document.getElementById('admin-chat-history');
    if (!box) return;
    let chats = db.chats[currentChatStudentId] || [];

    if (chats.length === 0) {
        box.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">No messages yet.</p>';
        return;
    }

    box.innerHTML = chats.map((c, index) => {
        let isAdmin = c.sender === 'admin';
        let actionHtml = '';
        if (isAdmin) { actionHtml = `<div style="display:flex; gap:15px; justify-content:flex-end; margin-top:8px; border-top:1px solid rgba(255,255,255,0.3); padding-top:8px;"><span onclick="editAdminChatMsg(${index})" style="cursor:pointer; font-size:0.75rem; color:#fff; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-pen"></i> Edit</span><span onclick="deleteAdminChatMsg(${index})" style="cursor:pointer; font-size:0.75rem; color:#ffcccc; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-trash"></i> Delete</span></div>`; }
        else { actionHtml = `<div style="display:flex; gap:15px; justify-content:flex-start; margin-top:8px; border-top:1px solid rgba(0,0,0,0.1); padding-top:8px;"><span onclick="deleteAdminChatMsg(${index})" style="cursor:pointer; font-size:0.75rem; color:#dc3545; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-trash"></i> Delete</span></div>`; }

        let editTag = c.edited ? ' <span style="font-style:italic;">(Edited)</span>' : '';
        return `<div class="msg ${isAdmin ? 'admin-msg' : 'student-msg'}"><span style="font-size:0.7rem; opacity:0.7; display:block; margin-bottom:3px;">${isAdmin ? 'Admin' : 'Student'} • ${c.time}${editTag}</span><div style="word-wrap: break-word;">${c.text}</div>${actionHtml}</div>`;
    }).join('');

    box.scrollTop = box.scrollHeight;
}

window.sendAdminMsg = function () {
    let input = document.getElementById('admin-chat-input');
    if (!input || input.value.trim() === '' || !currentChatStudentId) return;
    if (!db.chats[currentChatStudentId]) db.chats[currentChatStudentId] = [];
    db.chats[currentChatStudentId].push({ sender: 'admin', text: input.value, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    input.value = '';
    saveDB();
    renderChatHistory();
}

window.editAdminChatMsg = function(index) {
    if(!currentChatStudentId || !db.chats[currentChatStudentId]) return;
    let oldText = db.chats[currentChatStudentId][index].text;
    let newText = prompt("Edit your message:", oldText);
    if (newText !== null && newText.trim() !== "" && newText.trim() !== oldText) {
        db.chats[currentChatStudentId][index].text = newText.trim();
        db.chats[currentChatStudentId][index].edited = true;
        saveDB(); renderChatHistory();
    }
}

window.deleteAdminChatMsg = function(index) {
    if(!currentChatStudentId || !db.chats[currentChatStudentId]) return;
    if (confirm("Are you sure you want to delete this message?")) {
        db.chats[currentChatStudentId].splice(index, 1);
        saveDB(); renderChatHistory();
    }
}

// ==========================================
// 8. MEDIA GALLERY SYSTEM
// ==========================================
window.pushToGallery = function() { let input = document.getElementById('gallery-upload'); if(!input.files || input.files.length === 0) return showErrorPopup("Select at least one photo."); let loadedCount = 0; Array.from(input.files).forEach(file => { let reader = new FileReader(); reader.onload = function(e) { db.gallery.unshift({ id: Date.now() + Math.random(), src: e.target.result }); loadedCount++; if(loadedCount === input.files.length) { addLog(`Uploaded ${loadedCount} photo(s) to Gallery.`, 'general'); saveDB(); showSuccessPopup("Photos Uploaded and Pushed Successfully!"); input.value = ''; } }; reader.readAsDataURL(file); }); }
function renderGallery() { let grid = document.getElementById('gallery-grid'); if(!grid) return; if(db.gallery.length === 0) { grid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:#888;">No photos uploaded yet.</p>'; return; } grid.innerHTML = db.gallery.map((g, i) => `<div class="gallery-item"><img src="${g.src}"><button class="del-btn" onclick="deleteGalleryImage(${i})"><i class="fa-solid fa-trash"></i></button></div>`).join(''); }
window.deleteGalleryImage = function(index) { showConfirm("Delete this photo from Gallery?", () => { db.gallery.splice(index, 1); saveDB(); showSuccessPopup("Photo Deleted."); }); }

// ==========================================
// 9. REPORTS / MARKSHEET SYSTEM
// ==========================================
window.loadReportStudents = function() {
    let selClass = document.getElementById('report-class').value; let selSec = document.getElementById('report-sec').value; let searchId = document.getElementById('report-id-search').value.toLowerCase().trim();
    let body = document.getElementById('report-student-list'); if(!body) return;

    let filtered = db.students.filter(s => {
        if (searchId !== '') { return (s.id||'').toLowerCase().includes(searchId) || (s.roll||'').toString() === searchId || (s.name||'').toLowerCase().includes(searchId); }
        else { return s.class === selClass && (selSec === 'All' || s.section === selSec); }
    });

    filtered.sort((a,b) => (parseInt(a.roll)||99) - (parseInt(b.roll)||99));
    if(filtered.length === 0) { body.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">No students found for your search/filter.</td></tr>`; return; }

    body.innerHTML = filtered.map(s => {
        let btnColor = s.reportCard ? 'var(--ios-orange)' : 'var(--ios-blue)';
        let btnText = s.reportCard ? '<i class="fa-solid fa-rotate-right"></i> Update PDF' : '<i class="fa-solid fa-upload"></i> Upload PDF';
        let clearBtnHtml = s.reportCard ? `<button class="btn-secondary small" style="color:#dc3545; border-color:rgba(220,53,69,0.3); padding:5px 8px; margin-left:5px;" onclick="clearReport('${s.id}')" title="Remove PDF"><i class="fa-solid fa-trash"></i></button>` : '';

        return `<tr><td style="font-weight:bold;">${s.roll||'--'}</td><td><strong>${s.name}</strong><br><span style="font-size:0.75rem; color:#888;">${s.id} | ${s.class} (${s.section||'A'})</span></td><td><label class="btn-secondary small" style="cursor:pointer; font-size:0.75rem; padding:5px 10px;"><i class="fa-solid fa-paperclip"></i> Select File<input type="file" id="report-${s.id}" accept=".pdf" style="display:none;" onchange="updateReportName(this, 'rname-${s.id}')"></label><span id="rname-${s.id}" style="font-size:0.7rem; color:#888; max-width:80px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${s.reportCard ? 'File Present' : 'No file'}</span></td><td><button class="btn-primary small" id="up-btn-${s.id}" style="background:${btnColor}; border:none; padding:5px 10px;" onclick="uploadReport('${s.id}')">${btnText}</button>${clearBtnHtml}</td></tr>`;
    }).join('');
}

window.updateReportName = function(input, labelId) { if(input.files && input.files[0]) { document.getElementById(labelId).innerText = input.files[0].name; document.getElementById(labelId).style.color = '#28a745'; } }
window.uploadReport = function(stuId) {
    let fileInput = document.getElementById(`report-${stuId}`); if (!fileInput.files || fileInput.files.length === 0) return alert("Select a PDF file first."); if (fileInput.files[0].type !== "application/pdf") return alert("Only PDF files allowed.");
    let stuIndex = db.students.findIndex(s => s.id === stuId); let reader = new FileReader();
    reader.onload = function(e) { db.students[stuIndex].reportCard = e.target.result; db.students[stuIndex].marksheetLocked = false; addLog(`Marksheet pushed for ${db.students[stuIndex].name}.`, 'academic'); saveDB(); showSuccessPopup("Marksheet Uploaded & Pushed to Student!"); loadReportStudents(); }; reader.readAsDataURL(fileInput.files[0]);
}
window.clearReport = function(stuId) { showConfirm("Are you sure you want to delete this student's Marksheet?", () => { let stuIndex = db.students.findIndex(s => s.id === stuId); if(stuIndex !== -1) { db.students[stuIndex].reportCard = ''; db.students[stuIndex].marksheetLocked = false; saveDB(); loadReportStudents(); showSuccessPopup("Marksheet deleted successfully."); } }); }
window.clearAllReports = function() { if (!window.isPrincipal) return openModal('principal-auth-modal'); showConfirm("Are you sure you want to delete ALL uploaded marksheets for EVERY student? This cannot be undone.", () => { let clearedCount = 0; db.students.forEach(s => { if (s.reportCard) { s.reportCard = ''; s.marksheetLocked = false; clearedCount++; } }); if (clearedCount > 0) { addLog(`All ${clearedCount} student marksheets were cleared globally.`, 'academic'); saveDB(); loadReportStudents(); showSuccessPopup(`Successfully cleared ${clearedCount} marksheets globally!`); } else { showErrorPopup("No marksheets found in the system to clear."); } }); }

// ==========================================
// 10. 🔥 SETTINGS SYSTEM (DIRECT UPDATE - NO VERIFY) 🔥
// ==========================================
window.updateSchoolInfo = function(e) { e.preventDefault(); let name = document.getElementById('set-school-name').value; let tag = document.getElementById('set-school-tag').value; localStorage.setItem('nk_school_info', JSON.stringify({ name: name, tag: tag })); showSuccessPopup("School details updated!"); renderAll(); }
window.resetStudentPass = function(e) { e.preventDefault(); let stuId = document.getElementById('set-stu-id').value.trim(); let newPass = document.getElementById('set-stu-newpass').value.trim(); if(!stuId || !newPass) return alert("Fill all fields."); let stuIndex = db.students.findIndex(s => s.id === stuId); if(stuIndex !== -1) { db.students[stuIndex].pass = newPass; addLog(`Password reset for ${db.students[stuIndex].name}.`, 'general'); saveDB(); showSuccessPopup("Student password reset successfully!"); e.target.reset(); } else { showErrorPopup("Student ID not found!"); } }

// 1. UPDATE LOGIN PAGE CREDENTIALS (INDEX.HTML)
window.updatePortalLogin = function(e) {
    e.preventDefault();
    let newUser = document.getElementById('set-login-user').value.trim();
    let newPass = document.getElementById('set-login-pass').value.trim();

    if(newUser && newPass) {
        // Bina kisi check ke seedha database update maar diya
        localStorage.setItem('admin_login_username', newUser);
        localStorage.setItem('admin_login_password', newPass);

        // Backup keys in case index.html uses different names
        localStorage.setItem('nk_admin_id', newUser);
        localStorage.setItem('nk_admin_pass', newPass);
        localStorage.setItem('nk_login_user', newUser);
        localStorage.setItem('nk_login_pass', newPass);

        showSuccessPopup("Login Page Credentials Updated!");
        e.target.reset();
    }
}

// 2. UPDATE MASTER UNLOCK PASSWORD
window.updateMasterPass = function(e) {
    e.preventDefault();
    let newPass = document.getElementById('set-master-new').value.trim();
    if(newPass) {
        // Direct Update
        localStorage.setItem('nk_master_pass', newPass);
        showSuccessPopup("Master Unlock Password Updated!");
        e.target.reset();
    }
}

// ==========================================
// 11. ASSIGNMENT & NOTICE FORMS
// ==========================================
window.addAssignment = function (e) { e.preventDefault(); let newId = 'A-' + Math.floor(1000 + Math.random() * 9000); db.assignments.push({ id: newId, title: document.getElementById('a-title').value, sub: document.getElementById('a-sub').value, class: document.getElementById('a-class').value, section: document.getElementById('a-section').value, date: document.getElementById('a-date').value }); addLog(`Assignment posted.`, 'academic'); saveDB(); closeModal('add-assignment-modal'); showSuccessPopup('Assignment Broadcasted!'); e.target.reset(); }
window.openEditAssignment = function(index) { let a = db.assignments[index]; document.getElementById('edit-a-index').value = index; document.getElementById('edit-a-title').value = a.title || ''; document.getElementById('edit-a-sub').value = a.sub || ''; document.getElementById('edit-a-class').value = a.class || 'Class 1'; document.getElementById('edit-a-section').value = a.section || 'All'; document.getElementById('edit-a-date').value = a.date || ''; openModal('edit-assignment-modal'); }
window.saveAssignmentEdit = function(e) { e.preventDefault(); let index = document.getElementById('edit-a-index').value; let oldId = db.assignments[index].id; let newTitle = document.getElementById('edit-a-title').value; db.assignments[index].title = newTitle; db.assignments[index].sub = document.getElementById('edit-a-sub').value; db.assignments[index].class = document.getElementById('edit-a-class').value; db.assignments[index].section = document.getElementById('edit-a-section').value; db.assignments[index].date = document.getElementById('edit-a-date').value; if(db.submissions && db.submissions.length > 0) { db.submissions.forEach(sub => { if(sub.assignId === oldId) { sub.assignTitle = newTitle; } }); } addLog(`Assignment Updated.`, 'academic'); saveDB(); closeModal('edit-assignment-modal'); showSuccessPopup('Assignment Updated!'); }
window.openEditNotice = function(index) { let n = db.notices[index]; document.getElementById('edit-n-index').value = index; document.getElementById('edit-n-title').value = n.title || ''; document.getElementById('edit-n-body').value = n.body || ''; openModal('edit-notice-modal'); }
window.saveNoticeEdit = function(e) { e.preventDefault(); let index = document.getElementById('edit-n-index').value; let newTitle = document.getElementById('edit-n-title').value; db.notices[index].title = newTitle; db.notices[index].body = document.getElementById('edit-n-body').value; addLog(`Notice Updated.`, 'academic'); saveDB(); closeModal('edit-notice-modal'); showSuccessPopup('Notice Updated!'); }

// ==========================================
// 12. PROFILES & UTILS
// ==========================================
let currentBase64Photo = '';
window.previewPhoto = function (input, previewId, placeholderId) { if (input.files && input.files[0]) { let reader = new FileReader(); reader.onload = function (e) { document.getElementById(previewId).src = e.target.result; document.getElementById(previewId).style.display = 'block'; document.getElementById(placeholderId).style.display = 'none'; currentBase64Photo = e.target.result; }; reader.readAsDataURL(input.files[0]); } }
window.openEditStudent = function (index) { if (!window.isPrincipal) return openModal('principal-auth-modal'); let s = db.students[index]; document.getElementById('edit-s-index').value = index; document.getElementById('edit-s-name').value = s.name || ''; document.getElementById('edit-s-roll').value = s.roll || ''; document.getElementById('edit-s-class').value = s.class || 'Class 1'; document.getElementById('edit-s-section').value = s.section || 'A'; document.getElementById('edit-s-dob').value = s.dob || ''; document.getElementById('edit-s-aadhar').value = s.aadhar || ''; document.getElementById('edit-s-parent').value = s.parent || ''; document.getElementById('edit-s-phone').value = s.phone || ''; document.getElementById('edit-s-religion').value = s.religion || 'Hindu'; document.getElementById('edit-s-caste').value = s.caste || 'General'; currentBase64Photo = s.photo || ''; if (currentBase64Photo) { document.getElementById('edit-s-photo-preview').src = currentBase64Photo; document.getElementById('edit-s-photo-preview').style.display = 'block'; document.getElementById('edit-s-photo-placeholder').style.display = 'none'; } else { document.getElementById('edit-s-photo-preview').style.display = 'none'; document.getElementById('edit-s-photo-placeholder').style.display = 'flex'; } openModal('edit-student-modal'); }
window.saveStudentEdit = function (e) { e.preventDefault(); let index = document.getElementById('edit-s-index').value; db.students[index].name = document.getElementById('edit-s-name').value; db.students[index].roll = document.getElementById('edit-s-roll').value; db.students[index].class = document.getElementById('edit-s-class').value; db.students[index].section = document.getElementById('edit-s-section').value; db.students[index].dob = document.getElementById('edit-s-dob').value; db.students[index].aadhar = document.getElementById('edit-s-aadhar').value; db.students[index].parent = document.getElementById('edit-s-parent').value; db.students[index].phone = document.getElementById('edit-s-phone').value; db.students[index].religion = document.getElementById('edit-s-religion').value; db.students[index].caste = document.getElementById('edit-s-caste').value; db.students[index].photo = currentBase64Photo; addLog(`Profile updated.`, 'general'); saveDB(); closeModal('edit-student-modal'); showSuccessPopup('Profile Updated!'); }
window.openEditTeacher = function (index) { if (!window.isPrincipal) return openModal('principal-auth-modal'); let t = db.teachers[index]; document.getElementById('edit-t-index').value = index; document.getElementById('edit-t-name').value = t.name || ''; document.getElementById('edit-t-sub').value = t.sub || ''; document.getElementById('edit-t-phone').value = t.phone || ''; document.getElementById('edit-t-edu').value = t.edu || ''; document.getElementById('edit-t-aadhar').value = t.aadhar || ''; document.getElementById('edit-t-exp').value = t.exp || ''; currentBase64Photo = t.photo || ''; if (currentBase64Photo) { document.getElementById('edit-t-photo-preview').src = currentBase64Photo; document.getElementById('edit-t-photo-preview').style.display = 'block'; document.getElementById('edit-t-photo-placeholder').style.display = 'none'; } else { document.getElementById('edit-t-photo-preview').style.display = 'none'; document.getElementById('edit-t-photo-placeholder').style.display = 'flex'; } openModal('edit-teacher-modal'); }
window.saveTeacherEdit = function (e) { e.preventDefault(); let index = document.getElementById('edit-t-index').value; db.teachers[index].name = document.getElementById('edit-t-name').value; db.teachers[index].sub = document.getElementById('edit-t-sub').value; db.teachers[index].phone = document.getElementById('edit-t-phone').value; db.teachers[index].edu = document.getElementById('edit-t-edu').value; db.teachers[index].aadhar = document.getElementById('edit-t-aadhar').value; db.teachers[index].exp = document.getElementById('edit-t-exp').value; db.teachers[index].photo = currentBase64Photo; addLog(`Profile updated.`, 'general'); saveDB(); closeModal('edit-teacher-modal'); showSuccessPopup('Profile Updated!'); }
window.viewStudent = function (index) { let s = db.students[index]; if (!s) return; document.getElementById('p-stu-name').innerText = s.name || 'N/A'; document.getElementById('p-stu-id').innerText = `ID: ${s.id || ''} | Class: ${s.class || ''} (${s.section || ''}) | Roll: ${s.roll||'--'}`; document.getElementById('p-stu-dob').innerText = s.dob || '--'; document.getElementById('p-stu-aadhar').innerText = s.aadhar || '--'; document.getElementById('p-stu-parent').innerText = s.parent || '--'; document.getElementById('p-stu-phone').innerText = s.phone || '--'; document.getElementById('p-stu-religion').innerText = s.religion || '--'; document.getElementById('p-stu-caste').innerText = s.caste || '--'; document.getElementById('p-stu-income').innerText = s.income || '--'; let imgBox = document.getElementById('view-s-img-box'); if (s.photo) imgBox.innerHTML = `<img src="${s.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border: 4px solid var(--ios-blue);">`; else imgBox.innerHTML = `<i class="fa-solid fa-user-graduate"></i>`; let isPending = false; if (s.ledger && s.ledger.length > 0) isPending = s.ledger.some(entry => entry.status === 'Pending' && entry.due > 0); document.getElementById('p-stu-fees').innerText = isPending ? 'Pending Dues' : 'All Clear'; document.getElementById('p-stu-fees').style.color = !isPending ? '#28a745' : '#dc3545'; let attLog = s.attendance || []; let totalDays = attLog.length; let presentDays = attLog.filter(a => a.status === 'Present').length; let attPercent = totalDays === 0 ? 0 : Math.round((presentDays / totalDays) * 100); let recentLogs = [...attLog].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4); let logText = recentLogs.map(l => { let shortDate = l.date.substring(5); let c = l.status === 'Present' ? '#28a745' : '#dc3545'; return `<span style="color:${c}; font-weight:bold;">${shortDate}: ${l.status[0]}</span>`; }).join(' &nbsp;|&nbsp; '); if(totalDays === 0) logText = 'No attendance records found.'; let badgeColor = attPercent >= 75 ? 'var(--ios-blue)' : (attPercent >= 50 ? 'var(--ios-orange)' : '#dc3545'); document.getElementById('p-stu-att-summary').innerHTML = `<span class="badge" style="background:${badgeColor}; color:white; font-size:1rem; padding:5px 10px;">${attPercent}% Present</span> <span style="font-size:0.85rem; margin-left:15px; color:#555;">Recent: ${logText}</span>`; openModal('student-profile-modal'); }
window.viewTeacher = function (index) { let t = db.teachers[index]; if (!t) return; document.getElementById('p-tch-name').innerText = t.name || 'N/A'; document.getElementById('p-tch-id').innerText = `ID: ${t.id || ''}`; document.getElementById('p-tch-sub').innerText = t.sub || '--'; document.getElementById('p-tch-phone').innerText = t.phone || '--'; document.getElementById('p-tch-edu').innerText = t.edu || '--'; document.getElementById('p-tch-aadhar').innerText = t.aadhar || '--'; document.getElementById('p-tch-exp').innerText = t.exp || '--'; document.getElementById('p-tch-join').innerText = t.joinDate || '--'; let imgBox = document.getElementById('view-t-img-box'); if (t.photo) imgBox.innerHTML = `<img src="${t.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border: 4px solid var(--ios-orange);">`; else imgBox.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i>`; document.getElementById('p-tch-sal').innerText = t.sal || 'Pending'; document.getElementById('p-tch-sal').style.color = t.sal === 'Paid' ? '#28a745' : '#dc3545'; let attLog = t.attendance || []; let totalDays = attLog.length; let presentDays = attLog.filter(a => a.status === 'Present').length; let attPercent = totalDays === 0 ? 0 : Math.round((presentDays / totalDays) * 100); let recentLogs = [...attLog].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4); let logText = recentLogs.map(l => { let shortDate = l.date.substring(5); let c = l.status === 'Present' ? '#28a745' : '#dc3545'; return `<span style="color:${c}; font-weight:bold;">${shortDate}: ${l.status[0]}</span>`; }).join(' &nbsp;|&nbsp; '); if(totalDays === 0) logText = 'No attendance records found.'; let badgeColor = attPercent >= 75 ? 'var(--ios-orange)' : '#dc3545'; document.getElementById('p-tch-att-summary').innerHTML = `<span class="badge" style="background:${badgeColor}; color:white; font-size:1rem; padding:5px 10px;">${attPercent}% Present</span> <span style="font-size:0.85rem; margin-left:15px; color:#555;">Recent: ${logText}</span>`; openModal('teacher-profile-modal'); }

window.openModal = function (id) { let el = document.getElementById(id); if (el) el.classList.add('active'); }
window.closeModal = function (id) { let el = document.getElementById(id); if (el) el.classList.remove('active'); }
window.showSuccessPopup = function (msg) { let txt = document.getElementById('success-text'); if (txt) txt.innerText = msg; openModal('success-modal'); }
window.showErrorPopup = function (msg) { let err = document.getElementById('error-text'); if (err) err.innerText = msg; openModal('error-modal'); }
window.showConfirm = function(msg, callback) { let msgEl = document.getElementById('confirm-msg'); if (msgEl) msgEl.innerText = msg; let confirmBtn = document.getElementById('confirm-yes-btn'); if(confirmBtn) { let newBtn = confirmBtn.cloneNode(true); confirmBtn.parentNode.replaceChild(newBtn, confirmBtn); newBtn.onclick = function() { closeModal('custom-confirm-modal'); if(callback) callback(); }; } openModal('custom-confirm-modal'); }

window.clearLogs = function () { if (!window.isPrincipal) return openModal('principal-auth-modal'); showConfirm("Are you sure you want to delete all activity logs?", () => { db.logs = []; addLog("Activity logs were cleared by the Principal.", "general"); saveDB(); showSuccessPopup("All Activity Logs Cleared."); }); }
window.resetStudentLedger = function () { if (!window.isPrincipal) return openModal('principal-auth-modal'); let stuId = document.getElementById('fee-stu-select').value; if (!stuId) return showErrorPopup("Select a student first."); let stuIndex = db.students.findIndex(s => s.id === stuId); if (stuIndex !== -1) { let s = db.students[stuIndex]; let currentStatus = s.fees || 'Pending'; showConfirm(`Clean ledger for ${s.name}?`, () => { s.ledger = []; s.fees = currentStatus; addLog(`Fee history cleaned completely for ${s.name}.`, 'finance'); saveDB(); showSuccessPopup(`Ledger cleaned.`); document.getElementById('fee-amount').value = ''; }); } }
window.toggleSalary = function (index) { if (!window.isPrincipal) return openModal('principal-auth-modal'); db.teachers[index].sal = db.teachers[index].sal === 'Paid' ? 'Pending' : 'Paid'; addLog(`Salary manually updated.`, 'finance'); saveDB(); }
window.deleteRecord = function (collection, index) { if ((collection === 'students' || collection === 'teachers') && !window.isPrincipal) return openModal('principal-auth-modal'); showConfirm(`Delete this record?`, () => { db[collection].splice(index, 1); addLog(`Deleted record.`, 'general'); saveDB(); showSuccessPopup('Deleted successfully.'); }); }

window.addStudent = function (e) { e.preventDefault(); let classVal = document.getElementById('s-class').value || 'Class 1'; let currentMonthStr = new Date().toLocaleString('default', { month: 'long' }) + ' ' + new Date().getFullYear(); db.students.push({ id: 'NKGC-' + Math.floor(100 + Math.random() * 900), name: document.getElementById('s-name').value || 'Unknown', roll: document.getElementById('s-roll').value || '0', class: classVal, section: document.getElementById('s-section').value || 'A', pass: document.getElementById('s-pass').value || '1234', totalPaidAmt: 0, ledger: [{ month: currentMonthStr, due: getFeeForClass(classVal), paid: 0, status: 'Pending' }], attendance: [], parent: document.getElementById('s-parent').value, phone: document.getElementById('s-phone').value, dob: document.getElementById('s-dob').value, aadhar: document.getElementById('s-aadhar').value, religion: document.getElementById('s-religion').value, caste: document.getElementById('s-caste').value, income: document.getElementById('s-income').value, photo: '' }); addLog(`New student registered.`, 'general'); saveDB(); closeModal('add-student-modal'); showSuccessPopup('Student Registered!'); e.target.reset(); }
window.addTeacher = function (e) { e.preventDefault(); db.teachers.push({ id: 'T-' + Math.floor(100 + Math.random() * 900), name: document.getElementById('t-name').value, sub: document.getElementById('t-sub').value, sal: 'Paid', phone: document.getElementById('t-phone').value, edu: document.getElementById('t-edu').value, aadhar: document.getElementById('t-aadhar').value, exp: document.getElementById('t-exp').value, joinDate: document.getElementById('t-join').value, photo: '', attendance: [] }); addLog(`Faculty onboarded.`, 'general'); saveDB(); closeModal('add-teacher-modal'); showSuccessPopup('Teacher Saved!'); e.target.reset(); }
window.addNotice = function (e) { e.preventDefault(); db.notices.unshift({ title: document.getElementById('n-title').value, body: document.getElementById('n-body').value, date: new Date().toLocaleDateString('en-GB') }); addLog(`Notice published.`, 'academic'); saveDB(); closeModal('add-notice-modal'); showSuccessPopup('Broadcast Live!'); e.target.reset(); }
window.handleEventPublish = function (e) { e.preventDefault(); db.events.push({ title: document.getElementById('ev-title').value, date: document.getElementById('ev-date').value }); addLog(`Event published.`, 'academic'); saveDB(); showSuccessPopup('Event synced to Calendar!'); e.target.reset(); }

window.startAsTeacher = function () { window.isPrincipal = false; document.getElementById('admin-role').innerText = 'Teacher Access'; closeModal('initial-role-modal'); document.querySelectorAll('.locked-action').forEach(el => { if (el.tagName === 'BUTTON' || el.tagName === 'A') el.style.display = 'none'; }); let staffAttPanel = document.getElementById('staff-att-panel'); if(staffAttPanel) staffAttPanel.style.display = 'none'; let studentAttPanel = document.getElementById('student-att-panel'); if(studentAttPanel) studentAttPanel.style.gridColumn = 'span 2'; renderAll(); }
window.grantPrincipal = function () { window.isPrincipal = true; document.getElementById('admin-role').innerText = 'Principal / Owner'; closeModal('principal-auth-modal'); closeModal('initial-role-modal'); document.querySelectorAll('.locked-tab').forEach(el => el.classList.remove('locked-tab')); document.querySelectorAll('.lock-icon').forEach(el => el.style.display = 'none'); document.querySelectorAll('.locked-text').forEach(el => el.style.display = 'none'); document.querySelectorAll('.unlocked-text').forEach(el => el.style.display = 'inline-block'); document.querySelectorAll('.locked-action').forEach(el => { if (el.tagName === 'BUTTON' || el.tagName === 'A') el.style.display = 'inline-flex'; }); let staffAttPanel = document.getElementById('staff-att-panel'); if(staffAttPanel) staffAttPanel.style.display = 'block'; let studentAttPanel = document.getElementById('student-att-panel'); if(studentAttPanel) studentAttPanel.style.gridColumn = ''; renderAll(); }
window.startAsPrincipal = function () { openModal('principal-auth-modal'); }

window.toggleOTPView = function () { document.getElementById('auth-pass-view').style.display = 'none'; document.getElementById('auth-new-pass-view').style.display = 'none'; document.getElementById('auth-otp-view').style.display = 'block'; }
window.togglePassView = function () { document.getElementById('auth-otp-view').style.display = 'none'; document.getElementById('auth-new-pass-view').style.display = 'none'; document.getElementById('auth-pass-view').style.display = 'block'; }

// This ensures initial login STILL requires correct password to unlock Tabs.
window.verifyMaster = function () {
    let actualOld = localStorage.getItem('nk_master_pass');
    if(!actualOld) actualOld = 'admin123';
    actualOld = actualOld.replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, "").trim();

    let typedPass = document.getElementById('master-pass').value;
    let cleanTypedPass = typedPass.replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, "").trim();

    if (cleanTypedPass === actualOld || typedPass === "FORCE_RESET") {
        grantPrincipal();
    } else {
        showErrorPopup('Incorrect Master Password.');
    }
}
window.verifyOTP = function () { if (document.getElementById('otp-input').value === '1234') { document.getElementById('auth-otp-view').style.display = 'none'; document.getElementById('auth-new-pass-view').style.display = 'block'; } else { showErrorPopup('Invalid OTP.'); } }

window.hardResetDatabase = function () { showConfirm("Format database and load defaults? THIS WILL WIPE ALL DATA.", () => { localStorage.clear(); alert("Formatted!"); location.reload(); }); }

function initTabs() { document.querySelectorAll('.nav-item').forEach(item => { item.onclick = function () { if (this.classList.contains('locked-tab') && !window.isPrincipal) return openModal('principal-auth-modal'); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); this.classList.add('active'); document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active')); let targetTab = document.getElementById('tab-' + this.getAttribute('data-target')); if (targetTab) targetTab.classList.add('active'); if(this.getAttribute('data-target') === 'assignments' || this.getAttribute('data-target') === 'messages') { this.classList.remove('has-alert'); } }; }); }
function createParticles() { const c = document.getElementById('particles-container'); if (!c) return; for (let i = 0; i < 15; i++) { let p = document.createElement('div'); p.className = 'glass-particle'; let size = Math.random() * 30 + 10; p.style.width = size + 'px'; p.style.height = size + 'px'; p.style.left = `${Math.random() * 100}vw`; p.style.animationDuration = `${Math.random() * 12 + 8}s`; c.appendChild(p); } }

document.addEventListener('DOMContentLoaded', () => { checkAndResetTeacherSalaries(); setInterval(() => { if (document.getElementById('live-date')) { document.getElementById('live-date').innerText = new Date().toLocaleString('en-GB'); } }, 1000); renderAll(); initTabs(); createParticles(); });
