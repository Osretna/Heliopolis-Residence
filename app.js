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

// أدوات الحماية وتنسيق البيانات
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "" || s === "undefined") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

window.app = {
    currentLang: 'ar',
    currentModule: 'dashboard',
    editingDocId: null,

    async loadModule(name, el) {
        this.currentModule = name;
        this.editingDocId = null;
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">Heliopolis Live Syncing...</div>';
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

    prepareEdit(id) {
        this.editingDocId = id;
        const btn = document.querySelector('.btn-gold');
        if(btn) {
            btn.innerText = "تحديث البيانات الآن";
            btn.style.background = "#2196F3";
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    renderDashboard() {
        onSnapshot(collection(db, "Units"), (uSnap) => {
            onSnapshot(collection(db, "Finance"), (fSnap) => {
                let total = 0;
                fSnap.forEach(d => total += (d.data().type.includes('إيراد') ? safeNum(d.data().amount) : -safeNum(d.data().amount)));
                document.getElementById('module-display').innerHTML = `
                    <div class="fade-in">
                        <h2 class="welcome-text">إدارة هليوبوليس رزيدنس | M. Salah & T. Zeinhom</h2>
                        <div class="stats-container">
                            <div class="stat-card blue"><div><h4>الوحدات</h4><h3>${uSnap.size}</h3></div></div>
                            <div class="stat-card green"><div><h4>الخزينة</h4><h3>${formatCurrency(total)}</h3></div></div>
                            <div class="stat-card gold"><div><h4>الحالة</h4><h3>Live</h3></div></div>
                        </div>
                    </div>`;
            });
        });
    },

    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const e = doc.data();
                const net = (safeNum(e.salary) + safeNum(e.bonus)) - safeNum(e.penalty);
                rows += `<tr>
                    <td>${e.name}</td><td>${formatCurrency(e.salary)}</td><td>${formatCurrency(net)}</td>
                    <td><button class="btn-edit-mini" onclick='app.editHR("${doc.id}", ${JSON.stringify(e)})'>تعديل</button>
                    <button class="btn-del-mini" onclick="app.delDoc('Employees','${doc.id}')">حذف</button></td>
                </tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>الموارد البشرية</h2>
                    <div class="form-grid-complex">
                        <input id="en" placeholder="الاسم"><input id="ej" placeholder="الوظيفة">
                        <input id="es" type="number" placeholder="الراتب"><input id="eb" type="number" placeholder="إضافي">
                        <input id="ep" type="number" placeholder="خصم"><button class="btn-gold" onclick="app.saveHR()">حفظ</button>
                    </div>
                    <table class="styled-table"><thead><tr><th>الاسم</th><th>الأساسي</th><th>الصافي</th><th>الإجراءات</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },
    editHR(id, d) {
        document.getElementById('en').value = d.name; document.getElementById('ej').value = d.job;
        document.getElementById('es').value = d.salary; document.getElementById('eb').value = d.bonus;
        document.getElementById('ep').value = d.penalty; this.prepareEdit(id);
    },
    async saveHR() {
        const d = { name: document.getElementById('en').value, job: document.getElementById('ej').value, salary: safeNum(document.getElementById('es').value), bonus: safeNum(document.getElementById('eb').value), penalty: safeNum(document.getElementById('ep').value) };
        if(this.editingDocId) await updateDoc(doc(db, "Employees", this.editingDocId), d);
        else await addDoc(collection(db, "Employees"), d);
        this.loadModule('hr');
    },

    // --- تعديل عرض كافة بيانات المالك (طلبك الأول) ---
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const u = doc.data();
                list += `
                    <div class="unit-card-large">
                        <div class="unit-header">عمارة: ${safeStr(u.building)} | شقة: ${safeStr(u.unitNum)}</div>
                        <div class="unit-body">
                            <div class="data-row"><b>المالك:</b> <span>${safeStr(u.ownerName)}</span></div>
                            <div class="data-row"><b>الهاتف:</b> <span>${safeStr(u.phone)}</span></div>
                            <div class="data-row"><b>المساحة:</b> <span>${safeStr(u.area)} م²</span></div>
                            <div class="data-row"><b>الرقم القومي:</b> <span>${safeStr(u.nationalID)}</span></div>
                            <div class="data-row"><b>السيارات:</b> <span>${safeStr(u.cars)}</span></div>
                            <div class="data-row"><b>نوع الإقامة:</b> <span>${safeStr(u.ownerType)}</span></div>
                            <div class="data-row"><b>التقييم:</b> <span>${'⭐'.repeat(safeNum(u.rating))}</span></div>
                            <div class="unit-actions">
                                <button class="btn-edit-mini" onclick='app.editUnit("${doc.id}", ${JSON.stringify(u)})'>تعديل</button>
                                <button class="btn-del-mini" onclick="app.delDoc('Units','${doc.id}')">حذف</button>
                            </div>
                        </div>
                    </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>إدارة الملاك والوحدات</h2>
                <div class="form-grid-complex">
                    <input id="ub" placeholder="رقم العمارة"><input id="un" placeholder="رقم الشقة">
                    <input id="uon" placeholder="اسم المالك"><input id="uph" placeholder="الهاتف">
                    <input id="uid" placeholder="الرقم القومي"><input id="uc" placeholder="السيارات">
                    <input id="ua" placeholder="المساحة"><select id="ut"><option>مالك</option><option>إيجار</option></select>
                    <select id="ur"><option value="5">5 نجوم</option><option value="4">4 نجوم</option></select>
                    <button class="btn-gold" onclick="app.saveUnit()">حفظ البيانات</button>
                </div>
                <div class="units-grid-modern">${list}</div>`;
        });
    },
    editUnit(id, d) {
        document.getElementById('ub').value = d.building; document.getElementById('un').value = d.unitNum;
        document.getElementById('uon').value = d.ownerName; document.getElementById('uph').value = d.phone;
        document.getElementById('uid').value = d.nationalID; document.getElementById('uc').value = d.cars;
        document.getElementById('ua').value = d.area; document.getElementById('ut').value = d.ownerType;
        document.getElementById('ur').value = d.rating; this.prepareEdit(id);
    },
    async saveUnit() {
        const d = { building: document.getElementById('ub').value, unitNum: document.getElementById('un').value, ownerName: document.getElementById('uon').value, phone: document.getElementById('uph').value, nationalID: document.getElementById('uid').value, cars: document.getElementById('uc').value, area: document.getElementById('ua').value, ownerType: document.getElementById('ut').value, rating: safeNum(document.getElementById('ur').value) };
        if(this.editingDocId) await updateDoc(doc(db, "Units", this.editingDocId), d);
        else await addDoc(collection(db, "Units"), d);
        this.loadModule('units');
    },

    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const f = doc.data();
                rows += `<tr><td>${f.date}</td><td>${f.type}</td><td>${formatCurrency(f.amount)}</td>
                <td><button class="btn-edit-mini" onclick='app.editFin("${doc.id}", ${JSON.stringify(f)})'>تعديل</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>الماليات</h2>
                <div class="form-grid"><select id="ft"><option>إيراد</option><option>مصروف</option></select>
                <input id="fa" type="number" placeholder="المبلغ"><input id="fn" placeholder="البيان">
                <button class="btn-gold" onclick="app.saveFin()">تسجيل</button></div>
                <table class="styled-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },
    editFin(id, d) {
        document.getElementById('ft').value = d.type; document.getElementById('fa').value = d.amount;
        document.getElementById('fn').value = d.note; this.prepareEdit(id);
    },
    async saveFin() {
        const d = { type: document.getElementById('ft').value, amount: safeNum(document.getElementById('fa').value), note: document.getElementById('fn').value, date: new Date().toLocaleDateString('ar-EG') };
        if(this.editingDocId) await updateDoc(doc(db, "Finance", this.editingDocId), d);
        else await addDoc(collection(db, "Finance"), d);
        this.loadModule('finance');
    },

    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const t = doc.data();
                list += `<div class="task-item"><span>وحدة ${t.unitNum}: ${t.issue}</span>
                <button class="btn-edit-mini" onclick='app.editMaint("${doc.id}", ${JSON.stringify(t)})'>تعديل</button></div>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>الصيانة</h2><div class="form-grid"><input id="mu" placeholder="الوحدة"><input id="mi" placeholder="العطل"><button class="btn-gold" onclick="app.saveMaint()">فتح بلاغ</button></div><div class="tasks-list">${list}</div>`;
        });
    },
    editMaint(id, d) { document.getElementById('mu').value = d.unitNum; document.getElementById('mi').value = d.issue; this.prepareEdit(id); },
    async saveMaint() {
        const d = { unitNum: document.getElementById('mu').value, issue: document.getElementById('mi').value, date: new Date().toLocaleDateString() };
        if(this.editingDocId) await updateDoc(doc(db, "Maintenance", this.editingDocId), d);
        else await addDoc(collection(db, "Maintenance"), d);
        this.loadModule('maintenance');
    },

    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const u = doc.data();
                rows += `<tr><td>${u.name}</td><td>${u.role}</td><td><button class="btn-del-mini" onclick="app.delDoc('Users','${doc.id}')">حذف</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>الأمن والصلاحيات</h2><div class="form-grid"><input id="sn" placeholder="الاسم"><input id="sr" placeholder="الدور"><button class="btn-gold" onclick="app.addUser()">إضافة</button></div><table class="styled-table"><thead><tr><th>الاسم</th><th>الصلاحية</th><th>حذف</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },
    async addUser() { await addDoc(collection(db, "Users"), { name: document.getElementById('sn').value, role: document.getElementById('sr').value }); this.loadModule('security'); },

    // --- تعديل مركز التقارير لتصدير كافة البيانات (طلبك الثاني) ---
    renderReports() {
        document.getElementById('module-display').innerHTML = `
            <h2 class="welcome-text">مركز تصدير التقارير الشامل</h2>
            <div class="reports-grid">
                <div class="report-box" onclick="app.exportAll('Units')"><i class="fas fa-file-excel"></i><h4>تصدير كشف الملاك والوحدات</h4></div>
                <div class="report-box" onclick="app.exportAll('Employees')"><i class="fas fa-users"></i><h4>تصدير كشف الموظفين والرواتب</h4></div>
                <div class="report-box" onclick="app.exportAll('Finance')"><i class="fas fa-money-bill-wave"></i><h4>تصدير سجل الخزينة والمالية</h4></div>
                <div class="report-box" onclick="app.exportAll('Maintenance')"><i class="fas fa-tools"></i><h4>تصدير سجل بلاغات الصيانة</h4></div>
                <div class="report-box" onclick="app.exportAll('Users')"><i class="fas fa-shield-alt"></i><h4>تصدير كشف مستخدمي النظام</h4></div>
            </div>`;
    },

    async delDoc(c, id) { if(confirm("هل أنت متأكد من الحذف؟")) await deleteDoc(doc(db, c, id)); },
    async exportAll(c) {
        const s = await getDocs(collection(db, c));
        let d = []; s.forEach(x => d.push(x.data()));
        if(d.length === 0) return alert("لا توجد بيانات لتصديرها في هذا القسم");
        const ws = XLSX.utils.json_to_sheet(d);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, c);
        XLSX.writeFile(wb, `Heliopolis_${c}_Report.xlsx`);
    },
    toggleLanguage() { this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar'; this.loadModule('dashboard'); },
    toggleTheme() { document.body.classList.toggle('dark-mode'); }
};
// --- محرك البحث السريع الذكي ---
document.querySelector('.header-search input').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const displayArea = document.getElementById('module-display');
    
    // البحث داخل الجداول (الموظفين، المالية، الأمن)
    const rows = displayArea.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });

    // البحث داخل الكروت (الوحدات، الصيانة، التقارير)
    const cards = displayArea.querySelectorAll('.unit-card-large, .task-item, .stat-card, .report-box');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

window.onload = () => app.loadModule('dashboard');