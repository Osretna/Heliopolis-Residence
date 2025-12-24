import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, updateDoc, getDocs, orderBy, where } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

// --- فلاتر الحماية وتنسيق الأرقام والتواريخ ---
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "" || s === "undefined") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

window.app = {
    currentLang: 'ar',
    currentModule: 'dashboard',

    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('lang-label').innerText = this.currentLang === 'ar' ? 'EN' : 'AR';
        this.loadModule(this.currentModule);
    },

    async loadModule(name, el) {
        this.currentModule = name;
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">Heliopolis System Syncing...</div>';
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

    // 1. الرئيسية (إحصائيات شاملة)
    renderDashboard() {
        onSnapshot(collection(db, "Units"), (uSnap) => {
            onSnapshot(collection(db, "Finance"), (fSnap) => {
                let totalCash = 0;
                fSnap.forEach(d => {
                    const f = d.data();
                    totalCash += (f.type === 'إيراد' ? safeNum(f.amount) : -safeNum(f.amount));
                });
                document.getElementById('module-display').innerHTML = `
                    <div class="fade-in">
                        <h2 class="welcome-text">لوحة التحكم الإدارية | م/ محمد صلاح & م/ طارق زينهم</h2>
                        <div class="stats-container">
                            <div class="stat-card blue"><div><h4>إجمالي الوحدات</h4><h3>${uSnap.size}</h3></div></div>
                            <div class="stat-card green"><div><h4>الرصيد الفعلي</h4><h3>${formatCurrency(totalCash)}</h3></div></div>
                            <div class="stat-card gold"><div><h4>طلبات نشطة</h4><h3>12</h3></div></div>
                        </div>
                    </div>`;
            });
        });
    },

    // 2. الموارد البشرية (حضور وانصراف + إضافي وخصم)
    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const e = doc.data();
                rows += `<tr>
                    <td>${safeStr(e.name)}</td>
                    <td>${safeStr(e.job)}</td>
                    <td>${formatCurrency(e.salary)}</td>
                    <td>+${safeNum(e.bonus)} / -${safeNum(e.penalty)}</td>
                    <td>${e.checkIn || '--:--'} | ${e.checkOut || '--:--'}</td>
                    <td><button class="btn-mini" onclick="app.setAttendance('${doc.id}')">بصمة</button></td>
                </tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>شئون العاملين (الرواتب والحضور)</h2>
                    <div class="form-grid">
                        <input id="en" placeholder="الاسم">
                        <input id="ej" placeholder="الوظيفة">
                        <input id="es" type="number" placeholder="الراتب">
                        <input id="eb" type="number" placeholder="إضافي">
                        <input id="ep" type="number" placeholder="خصم">
                        <button class="btn-gold" onclick="app.addEmp()">إضافة موظف</button>
                    </div>
                    <table class="styled-table"><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الأساسي</th><th>إضافي/خصم</th><th>حضور/انصراف</th><th>بصمة</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },

    // 3. الوحدات والملاك (عمارة > شقة + بيانات تفصيلية + سيارات)
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const u = doc.data();
                list += `
                    <div class="unit-card-large">
                        <div class="unit-header">عمارة: ${safeStr(u.building)} | وحدة: ${safeStr(u.unitNum)}</div>
                        <div class="unit-body">
                            <p><b>المالك:</b> ${safeStr(u.ownerName)} (${u.ownerType})</p>
                            <p><b>المساحة:</b> ${safeNum(u.area)} م²</p>
                            <p><b>تليفون:</b> ${safeStr(u.phone)}</p>
                            <p><b>السيارات:</b> ${safeStr(u.carPlates)}</p>
                            <p><b>تقييم المالك:</b> ${'⭐'.repeat(safeNum(u.rating))}</p>
                            <div class="id-placeholder">صورة البطاقة المرفقة</div>
                        </div>
                    </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>إدارة المباني والوحدات</h2>
                <div class="form-grid-complex">
                    <input id="uBuild" placeholder="رقم العمارة">
                    <input id="uNum" placeholder="رقم الشقة">
                    <input id="uArea" type="number" placeholder="المساحة م²">
                    <input id="uOwner" placeholder="اسم المالك">
                    <input id="uPhone" placeholder="رقم التليفون">
                    <input id="uID" placeholder="الرقم القومي">
                    <input id="uCar" placeholder="أرقام السيارات">
                    <select id="uType"><option>صاحب عقار</option><option>إيجار</option></select>
                    <select id="uRate"><option value="5">5 نجوم</option><option value="4">4 نجوم</option></select>
                    <button class="btn-gold" onclick="app.saveFullUnit()">حفظ الوحدة</button>
                </div>
                <div class="units-grid-modern">${list}</div>`;
        });
    },

    // 4. الماليات (اشتراكات + ميزانية مشروعات)
    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            onSnapshot(collection(db, "Projects"), (pSnap) => {
                let pList = "";
                pSnap.forEach(pd => {
                    const p = pd.data();
                    pList += `<tr><td>${p.name}</td><td>${formatCurrency(p.budget)}</td><td>${formatCurrency(p.spent)}</td><td>${formatCurrency(p.budget - p.spent)}</td></tr>`;
                });
                
                document.getElementById('module-display').innerHTML = `
                    <h2>المالية والميزانيات</h2>
                    <div class="grid-2">
                        <div class="module-card">
                            <h3>تسجيل (اشتراك / صيانة فردية)</h3>
                            <div class="form-grid">
                                <select id="fType"><option>إيراد (اشتراك)</option><option>إيراد (صيانة فردية)</option><option>مصروف</option></select>
                                <input id="fAmt" type="number" placeholder="المبلغ">
                                <input id="fNote" placeholder="بيان">
                                <button class="btn-gold" onclick="app.saveFin()">تسجيل</button>
                            </div>
                        </div>
                        <div class="module-card">
                            <h3>ميزانية المشروعات</h3>
                            <div class="form-grid">
                                <input id="pName" placeholder="اسم المشروع">
                                <input id="pBudget" type="number" placeholder="الميزانية">
                                <button class="btn-gold" onclick="app.addProject()">إضافة مشروع</button>
                            </div>
                            <table><thead><tr><th>المشروع</th><th>الميزانية</th><th>المنصرف</th><th>المتبقي</th></tr></thead><tbody>${pList}</tbody></table>
                        </div>
                    </div>`;
            });
        });
    },

    // 5. الصيانة (تواريخ دقيقة + تقييم عمال)
    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let list = "";
            snap.forEach(doc => {
                const t = doc.data();
                list += `<div class="task-item">
                    <span><b>وحدة ${t.unitNum}</b> - ${t.issue} <br> <small>تاريخ البلاغ: ${t.date}</small></span>
                    <div><span>تقييم العامل: ${'⭐'.repeat(t.workerRate || 0)}</span>
                    <button onclick="app.deleteDoc('Maintenance','${doc.id}')">إتمام</button></div>
                </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>إدارة البلاغات والصيانة</h2>
                <div class="form-grid">
                    <input id="mUnit" placeholder="رقم الوحدة">
                    <input id="mIssue" placeholder="وصف العطل">
                    <input id="mDate" type="date">
                    <select id="mRate"><option value="5">ممتاز</option><option value="3">متوسط</option></select>
                    <button class="btn-gold" onclick="app.addMaint()">فتح بلاغ</button>
                </div>
                <div class="tasks-list">${list}</div>`;
        });
    },

    // 6. الأمن والصلاحيات
    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = "";
            snap.forEach(doc => {
                const u = doc.data();
                rows += `<tr><td>${u.name}</td><td>${u.role}</td><td><button onclick="app.deleteDoc('Users','${doc.id}')">حذف</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `<h2>المستخدمين والصلاحيات</h2>
                <div class="form-grid"><input id="un" placeholder="الاسم"><select id="ur"><option>مدير</option><option>محاسب</option><option>أمن</option></select><button class="btn-gold" onclick="app.addUser()">إضافة</button></div>
                <table><thead><tr><th>المستخدم</th><th>الصلاحية</th><th>حذف</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },

    // 7. التقارير
    renderReports() {
        document.getElementById('module-display').innerHTML = `
            <h2>مركز التقارير الاستراتيجية</h2>
            <div class="reports-grid">
                <div class="report-box" onclick="app.exportAll('Units')">تقرير الملاك والسيارات (Excel)</div>
                <div class="report-box" onclick="app.exportAll('Finance')">التقرير المالي السنوي (Excel)</div>
                <div class="report-box" onclick="app.exportAll('Employees')">كشف حضور ورواتب العمال (Excel)</div>
            </div>`;
    },

    // --- العمليات البرمجية (Logic) ---
    async addEmp() {
        await addDoc(collection(db, "Employees"), {
            name: document.getElementById('en').value, job: document.getElementById('ej').value,
            salary: safeNum(document.getElementById('es').value),
            bonus: safeNum(document.getElementById('eb').value),
            penalty: safeNum(document.getElementById('ep').value)
        });
    },
    async setAttendance(id) {
        const time = new Date().toLocaleTimeString('ar-EG');
        await updateDoc(doc(db, "Employees", id), { checkIn: time });
        alert("تم تسجيل الحضور: " + time);
    },
    async saveFullUnit() {
        await addDoc(collection(db, "Units"), {
            building: document.getElementById('uBuild').value,
            unitNum: document.getElementById('uNum').value,
            area: safeNum(document.getElementById('uArea').value),
            ownerName: document.getElementById('uOwner').value,
            phone: document.getElementById('uPhone').value,
            ownerType: document.getElementById('uType').value,
            carPlates: document.getElementById('uCar').value,
            rating: safeNum(document.getElementById('uRate').value)
        });
    },
    async addProject() {
        await addDoc(collection(db, "Projects"), {
            name: document.getElementById('pName').value,
            budget: safeNum(document.getElementById('pBudget').value),
            spent: 0
        });
    },
    async saveFin() {
        await addDoc(collection(db, "Finance"), {
            type: document.getElementById('fType').value,
            amount: safeNum(document.getElementById('fAmt').value),
            note: document.getElementById('fNote').value,
            date: new Date().toLocaleDateString('ar-EG')
        });
    },
    async addMaint() {
        await addDoc(collection(db, "Maintenance"), {
            unitNum: document.getElementById('mUnit').value,
            issue: document.getElementById('mIssue').value,
            date: document.getElementById('mDate').value,
            workerRate: safeNum(document.getElementById('mRate').value)
        });
    },
    async addUser() {
        await addDoc(collection(db, "Users"), { name: document.getElementById('un').value, role: document.getElementById('ur').value });
    },
    async deleteDoc(coll, id) {
        if(confirm("حذف السجل؟")) await deleteDoc(doc(db, coll, id));
    },
    async exportAll(c) {
        const s = await getDocs(collection(db, c));
        let d = []; s.forEach(x => d.push(x.data()));
        const ws = XLSX.utils.json_to_sheet(d);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, c);
        XLSX.writeFile(wb, `Heliopolis_${c}.xlsx`);
    }
};

window.onload = () => {
    app.loadModule('dashboard');
};
