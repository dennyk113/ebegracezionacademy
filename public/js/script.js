// ==================================================
// EBEGRACE ZION ACADEMY — CORE JAVASCRIPT
// Modeled after Nagie’s Angels Educational Centre
// Features: Login, Dashboard, Notices, PDF, Alerts
// ==================================================

// Load students from JSON (parents + teachers)
async function loadStudents() {
    try {
        const response = await fetch('data/students.json');
        return await response.json();
    } catch (error) {
        console.error('Failed to load students.json:', error);
        return [];
    }
}

// Load admissions from localStorage
function loadAdmissions() {
    const saved = localStorage.getItem('admissions');
    return saved ? JSON.parse(saved) : [];
}

// Save admissions to localStorage
function saveAdmissions(admissions) {
    localStorage.setItem('admissions', JSON.stringify(admissions));
}

// DOMContentLoaded — Initialize all page behaviors
document.addEventListener('DOMContentLoaded', () => {

    // =============================
    // ADMISSIONS FORM HANDLER
    // =============================
    const admissionsForm = document.getElementById('admissionsForm');
    if (admissionsForm) {
        admissionsForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const application = {
                childName: document.getElementById('childName')?.value || '',
                dob: document.getElementById('dob')?.value || '',
                program: document.getElementById('program')?.value || '',
                parentName: document.getElementById('parentName')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                email: document.getElementById('email')?.value || '',
                submittedAt: new Date().toISOString(),
                status: 'Pending'
            };

            // Save to localStorage
            const admissions = loadAdmissions();
            admissions.push(application);
            saveAdmissions(admissions);

            // Show success
            alert('✅ Application submitted successfully!\nWe will contact you shortly.');
            admissionsForm.reset();
        });
    }

    // =============================
    // LOGIN FORM HANDLER
    // =============================
    // LOGIN FORM HANDLER
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email')?.value || '';
            const password = document.getElementById('password')?.value || '';

            try {
                // Load students from JSON
                const response = await fetch('data/students.json');
                const students = await response.json();

                // Find matching user
                const user = students.find(s => s.email === email && s.password === password);

                if (user) {
                    // Save to session
                    sessionStorage.setItem('loggedInStudent', JSON.stringify(user));
                    console.log('✅ Login successful:', user);

                    // Redirect based on role
                    if (user.role === 'admin') {
                        window.location.href = 'admin-admissions.html','all-students.html','';  // ← ADMIN GOES HERE
                    } else if (user.role === 'teacher') {
                        window.location.href = 'dashboard.html';         // ← TEACHER GOES HERE
                    } else if (user.role === 'parent') {
                        window.location.href = 'parent-dashboard.html';  // ← PARENT GOES HERE
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    alert('❌ Login failed. Check email and password.');
                    console.log('❌ No matching user found for:', email);
                }
            } catch (error) {
                alert('❌ Error loading user data. Please try again.');
                console.error('Login error:', error);
            }
        });
    }

    // =============================
    // TEACHER DASHBOARD HANDLERS
    // (Only runs on dashboard.html)
    // =============================
    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) {
        // Set min date for expiry to today
        const expiryInput = document.getElementById('noticeExpiry');
        if (expiryInput) {
            expiryInput.min = new Date().toISOString().split('T')[0];
        }

        noticeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const imageInput = document.getElementById('noticeImage');
            if (imageInput && imageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    finalizeNoticeSubmission(e.target.result);
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                finalizeNoticeSubmission(null);
            }
        });
    }

    // Finalize notice submission (called after image is read or skipped)
    function finalizeNoticeSubmission(imageUrl) {
        const user = JSON.parse(sessionStorage.getItem('loggedInStudent'));
        if (!user) return;

        // Load existing notices
        let notices = JSON.parse(localStorage.getItem('schoolNotices') || '[]');

        // Create new notice
        const newNotice = {
            id: notices.length ? Math.max(...notices.map(n => n.id)) + 1 : 1,
            title: document.getElementById('noticeTitle')?.value || 'Untitled',
            message: document.getElementById('noticeMessage')?.value || '',
            postedBy: user.name,
            class: document.getElementById('noticeClass')?.value || 'All Classes',
            category: document.getElementById('noticeCategory')?.value || 'News',
            date: new Date().toISOString(),
            expiry: document.getElementById('noticeExpiry')?.value || null,
            image: imageUrl
        };

        // Save
        notices.push(newNotice);
        localStorage.setItem('schoolNotices', JSON.stringify(notices));

        // Trigger urgent alert simulation
        if (newNotice.category === 'Urgent') {
            setTimeout(() => {
                alert('🚨 URGENT NOTICE ALERT:\nIn production, this would send Email/SMS to all parents.');
            }, 500);
        }

        // Success
        alert('✅ Notice posted successfully!');
        if (noticeForm) noticeForm.reset();
        if (typeof displayNotices === 'function') displayNotices();
    }

    // Delete notice handler (delegates to displayNotices to refresh)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            let notices = JSON.parse(localStorage.getItem('schoolNotices') || '[]');
            notices = notices.filter(n => n.id !== id);
            localStorage.setItem('schoolNotices', JSON.stringify(notices));
            if (typeof displayNotices === 'function') displayNotices();
        }
    });

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('loggedInStudent');
            alert('You have been logged out.');
            window.location.href = 'index.html';
        });
    }

    // =============================
    // PDF DOWNLOAD HANDLERS
    // (Only runs on index.html)
    // =============================
    const printAllBtn = document.getElementById('printAllNotices');
    const printCategoryBtn = document.getElementById('printCurrentCategory');

    if (printAllBtn) {
        printAllBtn.addEventListener('click', () => generatePDF('All'));
    }

    if (printCategoryBtn) {
        printCategoryBtn.addEventListener('click', () => {
            const activeBtn = document.querySelector('.tab-btn.active');
            const category = activeBtn ? activeBtn.getAttribute('data-category') : 'All';
            generatePDF(category);
        });
    }

    // PDF Generation Function
    async function generatePDF(category) {
        const { jsPDF } = window.jspdf;

        // Load notices
        let notices = JSON.parse(localStorage.getItem('schoolNotices') || '[]');
        const now = new Date();

        // Filter
        const filtered = notices.filter(n => {
            if (n.expiry && new Date(n.expiry) < now) return false;
            return category === 'All' || n.category === category;
        });

        // Create PDF
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Ebegrace Zion Academy — ${category} Notices`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        let y = 50;

        filtered.forEach(notice => {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`${notice.title} [${notice.category}]`, 14, y);
            y += 8;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Posted: ${new Date(notice.date).toLocaleDateString()} | By: ${notice.postedBy}`, 14, y);
            y += 6;

            const lines = doc.splitTextToSize(notice.message, 180);
            doc.text(lines, 14, y);
            y += lines.length * 6 + 10;
        });

        // Save
        doc.save(`EbegraceZion_${category}_Notices_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // =============================
    // NOTICE DISPLAY FUNCTION
    // (Used by both index.html and dashboard.html)
    // =============================
    window.displayNotices = function (notices = null, category = 'All') {
        // If called from index.html without args
        if (notices === null) {
            notices = JSON.parse(localStorage.getItem('schoolNotices') || '[]');
        }

        const now = new Date();

        // For index.html — display in grid
        const noticesGrid = document.getElementById('noticesGrid');
        if (noticesGrid) {
            noticesGrid.innerHTML = '';

            const filtered = notices.filter(notice => {
                if (notice.expiry && new Date(notice.expiry) < now) return false;
                if (category !== 'All' && notice.category !== category) return false;
                return true;
            });

            if (filtered.length === 0) {
                noticesGrid.innerHTML = '<p>No notices in this category.</p>';
                return;
            }

            filtered.forEach(notice => {
                const card = document.createElement('div');
                card.className = 'notice-card';
                const date = new Date(notice.date).toLocaleDateString();
                let html = `
          <h4>${notice.title}</h4>
          <p>${notice.message}</p>
        `;
                if (notice.image) {
                    html += `<img src="${notice.image}" alt="Notice Image" style="width:100%; border-radius:8px; margin:15px 0;">`;
                }
                html += `
          <div class="notice-meta">
            <span>${notice.category}</span>
            <span>${date}</span>
          </div>
        `;
                card.innerHTML = html;
                noticesGrid.appendChild(card);
            });
        }

        // For dashboard.html — display in list with delete
        const noticesContainer = document.getElementById('noticesContainer');
        if (noticesContainer && !noticesGrid) {
            noticesContainer.innerHTML = '<p>Loading notices...</p>';

            if (notices.length === 0) {
                noticesContainer.innerHTML = '<p>No notices posted yet.</p>';
                return;
            }

            // Sort newest first
            notices.sort((a, b) => new Date(b.date) - new Date(a.date));
            noticesContainer.innerHTML = '';

            notices.forEach(notice => {
                const noticeDiv = document.createElement('div');
                noticeDiv.className = 'notice-item';
                let html = `
          <h4>${notice.title} <small>— ${notice.class} — ${notice.category}</small></h4>
          <p>${notice.message}</p>
        `;
                if (notice.image) {
                    html += `<img src="${notice.image}" alt="Notice Image" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; margin:10px 0;">`;
                }
                html += `
          <div class="notice-meta">
            <span>Posted by: ${notice.postedBy}</span>
            <span>on ${new Date(notice.date).toLocaleDateString()}</span>
            ${notice.expiry ? `<span>🕗 Expires: ${new Date(notice.expiry).toLocaleDateString()}</span>` : ''}
            <button class="btn-delete" data-id="${notice.id}">Delete</button>
          </div>
          <hr>
        `;
                noticeDiv.innerHTML = html;
                noticesContainer.appendChild(noticeDiv);
            });
        }
    }

    // =============================
    // INITIALIZE HOMEPAGE
    // (Only runs on index.html)
    // =============================
    if (document.getElementById('topNotices') || document.querySelector('.tab-btn')) {
        initializeHomepage();
    }

    async function initializeHomepage() {
        // Load notices
        let notices = JSON.parse(localStorage.getItem('schoolNotices') || '[]');
        if (notices.length === 0) {
            try {
                const response = await fetch('data/notices.json');
                notices = await response.json();
                localStorage.setItem('schoolNotices', JSON.stringify(notices));
            } catch (e) {
                console.error('Failed to load sample notices:', e);
                notices = [];
            }
        }

        // Display top scrolling bar
        const topNotices = notices.slice(0, 4);
        const topContainer = document.getElementById('topNotices');
        if (topContainer) {
            topContainer.innerHTML = '';

            const categoryEmojis = {
                Urgent: '⚠️', Events: '📅', News: '📰', Nationalism: '🇬🇭',
                Godliness: '🙏', Integrity: '💎', Excellence: '🏆',
                Service: '🤝', Attitude: '😊', Spelling: '📚', Intelligence: '🧠', Write: '✍️'
            };

            topNotices.forEach(notice => {
                const div = document.createElement('div');
                div.className = `notice-item ${notice.category.toLowerCase()}`;
                div.innerHTML = `<span>${categoryEmojis[notice.category] || ''} ${notice.category}:</span> ${notice.title}`;
                topContainer.appendChild(div);
            });
        }

        // Display grid
        if (typeof displayNotices === 'function') {
            displayNotices(notices, 'All');
        }

        // Tab filtering
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const category = btn.getAttribute('data-category');
                if (typeof displayNotices === 'function') {
                    displayNotices(notices, category);
                }
            });
        });
    }
});