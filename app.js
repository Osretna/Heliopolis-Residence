import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, updateDoc, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDM3sxud-Dq0EOmeY4_ZpLVkH0qcaYzB54",
    authDomain: "heliopolis-residence-9a03a.firebaseapp.com",
    databaseURL: "https://heliopolis-residence-9a03a-default-rtdb.firebaseio.com",
    projectId: "heliopolis-residence-9a03a",
    storageBucket: "heliopolis-residence-9a03a.firebasestorage.app",
    messagingSenderId: "49774729294",
    appId: "1:49774729294:web:56b5eace3128a7c5c2cb1f",
    measurementId: "G-RC6YY3RNSV"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance);

// --- فلاتر الحماية وتنسيق الأرقام ---
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "" || s === "undefined") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

// --- قاموس الترجمة الكامل ---
const translations = {
    ar: {
        app_title: "هليوبوليس رزيدنس",
        nav_dashboard: "الرئيسية",
        nav_hr: "شئون العاملين",
        nav_units: "الوحدات والملاك",
        nav_finance: "الماليات",
        nav_maintenance: "الصيانة",
        nav_security: "الأمن",
        nav_reports: "التقارير",
        search: "بحث سريع...",
        welcome: "لوحة التحكم الحقيقية",
        add: "إضافة",
        save: "حفظ",
        delete: "حذف"
    },
    en: {
        app_title: "Heliopolis Residence",
        nav_dashboard: "Dashboard",
        nav_hr: "HR Dept",
        nav_units: "Units & Owners",
        nav_finance: "Finance",
        nav_maintenance: "Maintenance",
        nav_security: "Security",
        nav_reports: "Reports",
        search: "Quick Search...",
        welcome: "Live Management Dashboard",
        add: "Add",
        save: "Save",
        delete: "Delete"
    }
};

window.app = {
    currentLang: 'ar',
    currentModule: 'dashboard',

    // تفعيل زر اللغة
    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('lang-label').innerText = this.currentLang === 'ar' ? 'EN' : 'AR';
        this.updateStaticTexts();
        this.loadModule(this.currentModule); // إعادة تحميل الموديول باللغة الجديدة
    },

    updateStaticTexts() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerText = translations[this.currentLang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = translations[this.currentLang][key];
        });
    },

    async loadModule(name, el) {
        this.currentModule = name;
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">Syncing Live Data...</div>';
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        if(el) el.classList.add('active');

        switch(name) {
            case 'dashboard': this.renderDashboard(); break;
            case 'hr': this.renderHR(); break;
            case 'units': this.renderUnits(); break;
            case 'finance': this.renderFinance(); break;
            case 'maintenance': this.renderMaintenance(); break;
            case 'security': this.renderSecurity(); break;
            case 'reports': this.renderReports(); break;
        }
    },

    renderDashboard() {
        onSnapshot(collection(db, "Units"), (uSnap) => {
            onSnapshot(collection(db, "Employees"), (eSnap) => {
                onSnapshot(collection(db, "Finance"), (fSnap) => {
                    let totalCash = 0;
                    fSnap.forEach(d => {
                        const f = d.data();
                        totalCash += (f.type === 'إيراد' || f.type === 'Revenue' ? safeNum(f.amount) : -safeNum(f.amount));
                    });
                    document.getElementById('module-display').innerHTML = `
                        <div class="fade-in">
                            <h2 class="welcome-text">${translations[this.currentLang].welcome}</h2>
                            <div class="stats-container">
                                <div class="stat-card blue"><div><h4>Units</h4><h3>${uSnap.size}</h3></div></div>
                                <div class="stat-card green"><div><h4>Balance</h4><h3>${formatCurrency(totalCash)}</h3></div></div>
                                <div class="stat-card gold"><div><h4>Staff</h4><h3>${eSnap.size}</h3></div></div>
                            </div>
                        </div>`;
                });
            });
        });
    },

    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const e = doc.data();
                rows += `<tr><td>${safeStr(e.name)}</td><td>${safeStr(e.job)}</td><td>${formatCurrency(e.salary)}</td><td><button class="btn-del" onclick="app.deleteDoc('Employees','${doc.id}','hr')">X</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>${translations[this.currentLang].nav_hr}</h2>
                    <div class="form-grid">
                        <input id="empName" placeholder="Name">
                        <input id="empJob" placeholder="Job">
                        <input id="empSalary" type="number" placeholder="Salary">
                        <button class="btn-gold" onclick="app.addEmp()">${translations[this.currentLang].add}</button>
                    </div>
                    <table class="styled-table"><thead><tr><th>Name</th><th>Job</th><th>Salary</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },

    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const u = doc.data();
                list += `<div class="unit-card"><h4>Unit: ${safeStr(u.unitNumber)}</h4><p>Owner: ${safeStr(u.ownerName)}</p><span>${safeStr(u.status)}</span><button class="btn-mini-del" onclick="app.deleteDoc('Units','${doc.id}','units')">×</button></div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>${translations[this.currentLang].nav_units}</h2>
                <div class="form-grid">
                    <input id="uNumber" placeholder="Unit #">
                    <input id="uOwner" placeholder="Owner Name">
                    <select id="uStatus"><option>مأهولة</option><option>خالية</option></select>
                    <button class="btn-gold" onclick="app.addUnit()">${translations[this.currentLang].save}</button>
                </div>
                <div class="units-grid">${list}</div>`;
        });
    },

    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const u = doc.data();
                rows += `<tr><td>${safeStr(u.name)}</td><td>${safeStr(u.role)}</td><td><button class="btn-del" onclick="app.deleteDoc('Users','${doc.id}','security')">X</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>${translations[this.currentLang].nav_security}</h2>
                    <div class="form-grid">
                        <input id="userName" placeholder="Username">
                        <select id="userRole"><option>Admin</option><option>Security</option></select>
                        <button class="btn-gold" onclick="app.addUser()">${translations[this.currentLang].add}</button>
                    </div>
                    <table class="styled-table"><thead><tr><th>Name</th><th>Role</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },

    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let tasks = "";
            snap.forEach(doc => {
                const t = doc.data();
                tasks += `<div class="task-item"><span>Unit ${safeStr(t.unitNumber)}: ${safeStr(t.issue)}</span><button onclick="app.deleteDoc('Maintenance','${doc.id}','maintenance')">Done</button></div>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>${translations[this.currentLang].nav_maintenance}</h2><div class="form-grid"><input id="mUnit" placeholder="Unit #"><input id="mIssue" placeholder="Issue"><button class="btn-gold" onclick="app.addMaint()">Open Request</button></div><div class="tasks-list">${tasks}</div>`;
        });
    },

    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const f = doc.data();
                rows += `<tr><td>${safeStr(f.date)}</td><td>${safeStr(f.type)}</td><td>${formatCurrency(f.amount)}</td><td>${safeStr(f.note)}</td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>${translations[this.currentLang].nav_finance}</h2><div class="form-grid"><select id="fType"><option>إيراد</option><option>مصروف</option></select><input id="fAmount" type="number" placeholder="Amount"><input id="fNote" placeholder="Note"><button class="btn-gold" onclick="app.addFin()">Record</button></div><table class="styled-table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },

    renderReports() {
        document.getElementById('module-display').innerHTML = `<h2>${translations[this.currentLang].nav_reports}</h2><div class="reports-grid"><div class="report-box" onclick="app.exportAll('Finance')">Excel Report</div></div>`;
    },

    // --- العمليات ---
    async addEmp() { await addDoc(collection(db, "Employees"), { name: document.getElementById('empName').value, job: document.getElementById('empJob').value, salary: safeNum(document.getElementById('empSalary').value) }); },
    async addUnit() { await addDoc(collection(db, "Units"), { unitNumber: document.getElementById('uNumber').value, ownerName: document.getElementById('uOwner').value, status: document.getElementById('uStatus').value }); },
    async addFin() { await addDoc(collection(db, "Finance"), { type: document.getElementById('fType').value, amount: safeNum(document.getElementById('fAmount').value), note: document.getElementById('fNote').value, date: new Date().toLocaleDateString() }); },
    async addMaint() { await addDoc(collection(db, "Maintenance"), { unitNumber: document.getElementById('mUnit').value, issue: document.getElementById('mIssue').value }); },
    async addUser() { await addDoc(collection(db, "Users"), { name: document.getElementById('userName').value, role: document.getElementById('userRole').value }); },
    async deleteDoc(coll, id) { if(confirm("Confirm Delete?")) await deleteDoc(doc(db, coll, id)); },
    async exportAll(collName) {
        const snap = await getDocs(collection(db, collName));
        let data = []; snap.forEach(d => data.push(d.data()));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, collName);
        XLSX.writeFile(wb, `Heliopolis_${collName}.xlsx`);
    },
    toggleTheme() { document.body.classList.toggle('dark-mode'); }
};

window.onload = () => {
    app.loadModule('dashboard');
    app.updateStaticTexts();
};