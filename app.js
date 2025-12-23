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

// --- أدوات الحماية من الـ undefined وتنسيق الأرقام ---
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

window.app = {
    currentLang: 'ar',

    async loadModule(name, el) {
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">جاري مزامنة البيانات...</div>';
        
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        if(el) el.classList.add('active');

        switch(name) {
            case 'dashboard': this.renderDashboard(); break;
            case 'hr': this.renderHR(); break;
            case 'units': this.renderUnits(); break;
            case 'finance': this.renderFinance(); break;
            case 'maintenance': this.renderMaintenance(); break;
            case 'security': this.renderSecurity(); break; // الآن ستعمل بنجاح
            case 'reports': this.renderReports(); break;
        }
    },

    // 1. الرئيسية
    renderDashboard() {
        onSnapshot(collection(db, "Units"), (uSnap) => {
            onSnapshot(collection(db, "Employees"), (eSnap) => {
                onSnapshot(collection(db, "Finance"), (fSnap) => {
                    let totalCash = 0;
                    fSnap.forEach(d => {
                        const f = d.data();
                        totalCash += (f.type === 'إيراد' ? safeNum(f.amount) : -safeNum(f.amount));
                    });
                    document.getElementById('module-display').innerHTML = `
                        <div class="fade-in">
                            <h2 class="welcome-text">لوحة التحكم الفعلي <small>م/ محمد صلاح</small></h2>
                            <div class="stats-container">
                                <div class="stat-card blue">
                                    <i class="fas fa-building"></i>
                                    <div><h4>الوحدات</h4><h3>${uSnap.size}</h3></div>
                                </div>
                                <div class="stat-card green">
                                    <i class="fas fa-wallet"></i>
                                    <div><h4>الخزينة</h4><h3>${formatCurrency(totalCash)}</h3></div>
                                </div>
                                <div class="stat-card gold">
                                    <i class="fas fa-users"></i>
                                    <div><h4>الموظفين</h4><h3>${eSnap.size}</h3></div>
                                </div>
                            </div>
                        </div>`;
                });
            });
        });
    },

    // 2. الموارد البشرية
    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const e = doc.data();
                rows += `<tr><td>${safeStr(e.name)}</td><td>${safeStr(e.job)}</td><td>${formatCurrency(e.salary)}</td><td><button class="btn-del" onclick="app.deleteDoc('Employees','${doc.id}','hr')">حذف</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>إدارة الموظفين</h2>
                    <div class="form-grid">
                        <input id="empName" placeholder="الاسم">
                        <input id="empJob" placeholder="الوظيفة">
                        <input id="empSalary" type="number" placeholder="الراتب">
                        <button class="btn-gold" onclick="app.addEmp()">إضافة</button>
                    </div>
                    <table class="styled-table"><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الراتب</th><th>حذف</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },

    // 3. الوحدات
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const u = doc.data();
                list += `<div class="unit-card"><h4>وحدة: ${safeStr(u.unitNumber)}</h4><p>المالك: ${safeStr(u.ownerName)}</p><span>${safeStr(u.status)}</span><button class="btn-mini-del" onclick="app.deleteDoc('Units','${doc.id}','units')">×</button></div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>إدارة الوحدات</h2>
                <div class="form-grid">
                    <input id="uNumber" placeholder="رقم الوحدة">
                    <input id="uOwner" placeholder="المالك">
                    <select id="uStatus"><option>مأهولة</option><option>خالية</option></select>
                    <button class="btn-gold" onclick="app.addUnit()">حفظ</button>
                </div>
                <div class="units-grid">${list}</div>`;
        });
    },

    // 4. الأمن (تم حل المشكلة هنا)
    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const u = doc.data();
                rows += `<tr>
                    <td>${safeStr(u.name)}</td>
                    <td><span class="badge blue">${safeStr(u.role)}</span></td>
                    <td><button class="btn-del" onclick="app.deleteDoc('Users','${doc.id}','security')">حذف</button></td>
                </tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>الأمن وصلاحيات النظام</h2>
                    <div class="form-grid">
                        <input id="userName" placeholder="اسم المستخدم / الفرد">
                        <select id="userRole">
                            <option>مشرف أمن</option>
                            <option>فرد أمن</option>
                            <option>مدير نظام</option>
                        </select>
                        <button class="btn-gold" onclick="app.addUser()">إضافة مستخدم</button>
                    </div>
                    <table class="styled-table">
                        <thead><tr><th>الاسم</th><th>الدور</th><th>الإجراءات</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        });
    },

    // 5. الصيانة
    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let tasks = "";
            snap.forEach(doc => {
                const t = doc.data();
                tasks += `<div class="task-item"><span>وحدة ${safeStr(t.unitNumber)}: ${safeStr(t.issue)}</span><button onclick="app.deleteDoc('Maintenance','${doc.id}','maintenance')">تم</button></div>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>طلبات الصيانة</h2><div class="form-grid"><input id="mUnit" placeholder="رقم الوحدة"><input id="mIssue" placeholder="العطل"><button class="btn-gold" onclick="app.addMaint()">فتح طلب</button></div><div class="tasks-list">${tasks}</div>`;
        });
    },

    // 6. الماليات
    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const f = doc.data();
                rows += `<tr><td>${safeStr(f.date)}</td><td>${safeStr(f.type)}</td><td>${formatCurrency(f.amount)}</td><td>${safeStr(f.note)}</td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>المالية</h2><div class="form-grid"><select id="fType"><option>إيراد</option><option>مصروف</option></select><input id="fAmount" type="number" placeholder="المبلغ"><input id="fNote" placeholder="البيان"><button class="btn-gold" onclick="app.addFin()">تسجيل</button></div><table class="styled-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>البيان</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },

    // 7. التقارير
    renderReports() {
        document.getElementById('module-display').innerHTML = `<h2>التقارير</h2><div class="reports-grid"><div class="report-box" onclick="app.exportAll('Finance')">تقرير المالية (Excel)</div><div class="report-box" onclick="app.exportAll('Employees')">تقرير الموظفين (Excel)</div></div>`;
    },

    // --- العمليات (Logic) ---
    async addEmp() {
        await addDoc(collection(db, "Employees"), { name: document.getElementById('empName').value, job: document.getElementById('empJob').value, salary: safeNum(document.getElementById('empSalary').value) });
    },
    async addUnit() {
        await addDoc(collection(db, "Units"), { unitNumber: document.getElementById('uNumber').value, ownerName: document.getElementById('uOwner').value, status: document.getElementById('uStatus').value });
    },
    async addFin() {
        await addDoc(collection(db, "Finance"), { type: document.getElementById('fType').value, amount: safeNum(document.getElementById('fAmount').value), note: document.getElementById('fNote').value, date: new Date().toLocaleDateString('ar-EG') });
    },
    async addMaint() {
        await addDoc(collection(db, "Maintenance"), { unitNumber: document.getElementById('mUnit').value, issue: document.getElementById('mIssue').value, createdAt: new Date() });
    },
    async addUser() {
        const name = document.getElementById('userName').value;
        const role = document.getElementById('userRole').value;
        if(name) {
            await addDoc(collection(db, "Users"), { name, role, createdAt: new Date() });
        }
    },
    async deleteDoc(coll, id, mod) {
        if(confirm("هل أنت متأكد؟")) await deleteDoc(doc(db, coll, id));
    },
    async exportAll(collName) {
        const snap = await getDocs(collection(db, collName));
        let data = [];
        snap.forEach(d => data.push(d.data()));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, collName);
        XLSX.writeFile(wb, `${collName}_Heliopolis.xlsx`);
    }
};

window.onload = () => app.loadModule('dashboard');