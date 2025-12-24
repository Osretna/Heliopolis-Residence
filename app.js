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

// أدوات الحماية والتنسيق
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "" || s === "undefined") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

window.app = {
    currentLang: 'ar',
    currentModule: 'dashboard',

    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('lang-label').innerText = this.currentLang === 'ar' ? 'ENGLISH' : 'العربية';
        this.loadModule(this.currentModule);
    },

    async loadModule(name, el) {
        this.currentModule = name;
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">Heliopolis Live Sync...</div>';
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

    // 1. الرئيسية
    renderDashboard() {
        onSnapshot(collection(db, "Units"), (uSnap) => {
            onSnapshot(collection(db, "Finance"), (fSnap) => {
                let totalCash = 0;
                fSnap.forEach(d => {
                    const f = d.data();
                    totalCash += (f.type.includes('إيراد') ? safeNum(f.amount) : -safeNum(f.amount));
                });
                document.getElementById('module-display').innerHTML = `
                    <div class="fade-in">
                        <h2 class="welcome-text">إدارة هليوبوليس رزيدنس | M. Salah & T. Zeinhom</h2>
                        <div class="stats-container">
                            <div class="stat-card blue"><div><h4>الوحدات</h4><h3>${uSnap.size}</h3></div></div>
                            <div class="stat-card green"><div><h4>الرصيد الصافي</h4><h3>${formatCurrency(totalCash)}</h3></div></div>
                            <div class="stat-card gold"><div><h4>الحالة</h4><h3>Live</h3></div></div>
                        </div>
                    </div>`;
            });
        });
    },

    // 2. شئون العاملين (حساب الصافي والحضور)
    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const e = doc.data();
                const net = (safeNum(e.salary) + safeNum(e.bonus)) - safeNum(e.penalty);
                rows += `<tr>
                    <td>${safeStr(e.name)}</td>
                    <td>${formatCurrency(e.salary)}</td>
                    <td class="text-green">+${formatCurrency(e.bonus)}</td>
                    <td class="text-red">-${formatCurrency(e.penalty)}</td>
                    <td><b>${formatCurrency(net)}</b></td>
                    <td>${e.checkIn || '--'}</td>
                    <td><button class="btn-mini" onclick="app.setCheck('${doc.id}')">حضور</button></td>
                </tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>شئون العاملين والرواتب</h2>
                    <div class="form-grid-complex">
                        <input id="en" placeholder="الاسم">
                        <input id="ej" placeholder="الوظيفة">
                        <input id="es" type="number" placeholder="الأساسي">
                        <input id="eb" type="number" placeholder="الإضافي">
                        <input id="ep" type="number" placeholder="الخصومات">
                        <button class="btn-gold" onclick="app.addEmp()">إضافة</button>
                    </div>
                    <div class="table-responsive">
                        <table class="styled-table"><thead><tr><th>الاسم</th><th>الأساسي</th><th>إضافي</th><th>خصم</th><th>الصافي</th><th>الوقت</th><th>البصمة</th></tr></thead><tbody>${rows}</tbody></table>
                    </div>
                </div>`;
        });
    },

    // 3. الوحدات والملاك (بيانات تفصيلية)
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const u = doc.data();
                list += `
                    <div class="unit-card-large">
                        <div class="unit-header">عمارة ${u.building} - شقة ${u.unitNum}</div>
                        <div class="unit-body">
                            <p><b>المالك:</b> ${u.ownerName} (${u.ownerType})</p>
                            <p><b>المساحة:</b> ${u.area} م² | <b>السيارات:</b> ${u.cars}</p>
                            <p><b>الرقم القومي:</b> ${u.nationalID}</p>
                            <p><b>التليفون:</b> ${u.phone}</p>
                            <button class="btn-del-mini" onclick="app.delDoc('Units','${doc.id}')">حذف</button>
                        </div>
                    </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>إدارة الملاك والوحدات</h2>
                <div class="form-grid-complex">
                    <input id="ub" placeholder="العمارة"><input id="un" placeholder="الشقة"><input id="uon" placeholder="المالك">
                    <input id="uph" placeholder="التليفون"><input id="uid" placeholder="الرقم القومي"><input id="uc" placeholder="السيارات">
                    <select id="ut"><option>مالك</option><option>إيجار</option></select>
                    <button class="btn-gold" onclick="app.saveUnit()">حفظ</button>
                </div>
                <div class="units-grid-modern">${list}</div>`;
        });
    },

    // 4. الماليات والمشاريع
    renderFinance() {
        onSnapshot(collection(db, "Finance"), (fSnap) => {
            onSnapshot(collection(db, "Projects"), (pSnap) => {
                let pRows = "";
                pSnap.forEach(pd => {
                    const p = pd.data();
                    pRows += `<tr><td>${p.name}</td><td>${formatCurrency(p.budget)}</td><td>${formatCurrency(p.spent)}</td><td>${formatCurrency(p.budget - p.spent)}</td></tr>`;
                });
                document.getElementById('module-display').innerHTML = `
                    <h2>الخزينة والميزانيات</h2>
                    <div class="grid-2">
                        <div class="module-card">
                            <h3>تسجيل حركة مالية</h3>
                            <div class="form-grid"><select id="ft"><option>إيراد (اشتراك صيانة)</option><option>إيراد (صيانة فردية)</option><option>مصروف</option></select>
                            <input id="fa" type="number" placeholder="المبلغ"><input id="fn" placeholder="البيان"><button class="btn-gold" onclick="app.saveFin()">تسجيل</button></div>
                        </div>
                        <div class="module-card">
                            <h3>ميزانية المشاريع</h3>
                            <div class="form-grid"><input id="pn" placeholder="المشروع"><input id="pb" type="number" placeholder="الميزانية"><button class="btn-gold" onclick="app.saveProject()">إضافة</button></div>
                            <table class="styled-table"><thead><tr><th>المشروع</th><th>الميزانية</th><th>المنصرف</th><th>المتبقي</th></tr></thead><tbody>${pRows}</tbody></table>
                        </div>
                    </div>`;
            });
        });
    },

    // 5. الصيانة
    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const t = doc.data();
                list += `<div class="task-item">
                    <span><b>وحدة ${t.unit}</b>: ${t.issue} <br><small>التاريخ: ${t.date} | الأولوية: ${t.priority}</small></span>
                    <button onclick="app.delDoc('Maintenance','${doc.id}')">تم</button>
                </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>بلاغات الصيانة</h2>
                <div class="form-grid">
                    <input id="mu" placeholder="الوحدة"><input id="mi" placeholder="العطل"><input id="md" type="date">
                    <select id="mp"><option>عادي</option><option>عاجل</option></select>
                    <button class="btn-gold" onclick="app.saveMaint()">إرسال</button>
                </div><div class="tasks-list">${list}</div>`;
        });
    },

    // 6. الأمن والصلاحيات (حل المشكلة هنا)
    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const u = doc.data();
                rows += `<tr><td>${u.name}</td><td>${u.role}</td><td><button class="btn-del-mini" onclick="app.delDoc('Users','${doc.id}')">حذف</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>إدارة المستخدمين</h2>
                    <div class="form-grid"><input id="un" placeholder="الاسم"><select id="ur"><option>مدير</option><option>محاسب</option><option>أمن</option></select><button class="btn-gold" onclick="app.addUser()">إضافة</button></div>
                    <table class="styled-table"><thead><tr><th>المستخدم</th><th>الصلاحية</th><th>حذف</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },

    // 7. التقارير (حل المشكلة هنا)
    renderReports() {
        document.getElementById('module-display').innerHTML = `
            <h2>مركز التقارير</h2>
            <div class="reports-grid">
                <div class="report-box" onclick="app.exportAll('Units')">تقرير الملاك (Excel)</div>
                <div class="report-box" onclick="app.exportAll('Finance')">سجل الخزينة (Excel)</div>
                <div class="report-box" onclick="app.exportAll('Employees')">كشف الرواتب (Excel)</div>
            </div>`;
    },

    // --- العمليات ---
    async addEmp() { await addDoc(collection(db, "Employees"), { name: document.getElementById('en').value, job: document.getElementById('ej').value, salary: safeNum(document.getElementById('es').value), bonus: safeNum(document.getElementById('eb').value), penalty: safeNum(document.getElementById('ep').value) }); },
    async setCheck(id) { await updateDoc(doc(db, "Employees", id), { checkIn: new Date().toLocaleTimeString('ar-EG') }); },
    async saveUnit() { await addDoc(collection(db, "Units"), { building: document.getElementById('ub').value, unitNum: document.getElementById('un').value, ownerName: document.getElementById('uon').value, phone: document.getElementById('uph').value, nationalID: document.getElementById('uid').value, cars: document.getElementById('uc').value, ownerType: document.getElementById('ut').value, status: 'مأهولة' }); },
    async saveFin() { await addDoc(collection(db, "Finance"), { type: document.getElementById('ft').value, amount: safeNum(document.getElementById('fa').value), note: document.getElementById('fn').value, date: new Date().toLocaleDateString('ar-EG') }); },
    async saveProject() { await addDoc(collection(db, "Projects"), { name: document.getElementById('pn').value, budget: safeNum(document.getElementById('pb').value), spent: 0 }); },
    async saveMaint() { await addDoc(collection(db, "Maintenance"), { unit: document.getElementById('mu').value, issue: document.getElementById('mi').value, date: document.getElementById('md').value, priority: document.getElementById('mp').value }); },
    async addUser() { await addDoc(collection(db, "Users"), { name: document.getElementById('un').value, role: document.getElementById('ur').value }); },
    async delDoc(c, id) { if(confirm("حذف؟")) await deleteDoc(doc(db, c, id)); },
    async exportAll(c) {
        const s = await getDocs(collection(db, c));
        let d = []; s.forEach(x => d.push(x.data()));
        const ws = XLSX.utils.json_to_sheet(d);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, c);
        XLSX.writeFile(wb, `Heliopolis_${c}.xlsx`);
    },
    toggleTheme() { document.body.classList.toggle('dark-mode'); }
};

window.onload = () => app.loadModule('dashboard');