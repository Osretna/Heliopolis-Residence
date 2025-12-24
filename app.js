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

// --- وظائف الحماية والتدقيق (حل مشكلة ReferenceError) ---
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "" || s === "undefined") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

const trans = {
    ar: { dashboard: "الرئيسية", hr: "الموظفين", adjust: "الحوافز والخصومات", units: "الوحدات والملاك", finance: "المالية", maintenance: "الصيانة", security: "الأمن", reports: "التقارير", langBtn: "ENGLISH", welcome: "لوحة التحكم الحقيقية" },
    en: { dashboard: "Dashboard", hr: "Staff", adjust: "Rewards", units: "Units", finance: "Finance", maintenance: "Maintenance", security: "Security", reports: "Reports", langBtn: "العربية", welcome: "Live Dashboard" }
};

window.app = {
    currentLang: 'ar',
    currentModule: 'dashboard',
    editingId: null,

    // --- تبديل اللغة ---
    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('lang-label').innerText = trans[this.currentLang].langBtn;
        this.updateSidebar();
        this.loadModule(this.currentModule);
    },

    updateSidebar() {
        document.querySelectorAll('.nav-links li span').forEach((span, i) => {
            const keys = ['dashboard', 'hr', 'adjust', 'units', 'finance', 'maintenance', 'security', 'reports'];
            span.innerText = trans[this.currentLang][keys[i]];
        });
    },

    toggleTheme() { document.body.classList.toggle('dark-mode'); },

    async loadModule(name, el) {
        this.currentModule = name; this.editingId = null;
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">Heliopolis Syncing...</div>';
        if(el) {
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            el.classList.add('active');
        }
        switch(name) {
            case 'dashboard': this.renderDashboard(); break;
            case 'hr': this.renderHR(); break;
            case 'adjustments': this.renderAdjustments(); break;
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
        onSnapshot(collection(db, "Employees"), (eSnap) => {
            onSnapshot(collection(db, "Finance"), (fSnap) => {
                onSnapshot(collection(db, "Maintenance"), (mSnap) => {
                    
                    let totalIncome = 0;
                    let lastTransactions = [];
                    fSnap.forEach(d => {
                        const data = d.data();
                        totalIncome += (data.type.includes('إيراد') ? safeNum(data.amount) : -safeNum(data.amount));
                        lastTransactions.push(data);
                    });

                    // عرض المحتوى بتنسيق احترافي
                    document.getElementById('module-display').innerHTML = `
                        <div class="fade-in">
                            <h2 class="welcome-title"><i class="fas fa-tachometer-alt"></i> مركز القيادة والسيطرة الرقمي</h2>
                            
                            <!-- كروت الإحصائيات -->
                            <div class="stats-grid-dashboard">
                                <div class="stat-card-pro blue">
                                    <div class="stat-icon"><i class="fas fa-building"></i></div>
                                    <div class="stat-info">
                                        <h4>إجمالي الوحدات</h4>
                                        <h3>${uSnap.size} <small>وحدة</small></h3>
                                    </div>
                                </div>

                                <div class="stat-card-pro green">
                                    <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                                    <div class="stat-info">
                                        <h4>الرصيد الصافي</h4>
                                        <h3>${formatCurrency(totalIncome)}</h3>
                                    </div>
                                </div>

                                <div class="stat-card-pro gold">
                                    <div class="stat-icon"><i class="fas fa-users-cog"></i></div>
                                    <div class="stat-info">
                                        <h4>قوة العمل</h4>
                                        <h3>${eSnap.size} <small>موظف</small></h3>
                                    </div>
                                </div>

                                <div class="stat-card-pro red">
                                    <div class="stat-icon"><i class="fas fa-tools"></i></div>
                                    <div class="stat-info">
                                        <h4>بلاغات الصيانة</h4>
                                        <h3>${mSnap.size} <small>طلب</small></h3>
                                    </div>
                                </div>
                            </div>

                            <!-- جداول الملخص السريع -->
                            <div class="dashboard-details-grid">
                                <div class="module-card">
                                    <h3 class="sub-title"><i class="fas fa-exchange-alt"></i> آخر التحركات المالية</h3>
                                    <div class="table-wrapper">
                                        <table class="styled-table">
                                            <thead>
                                                <tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th></tr>
                                            </thead>
                                            <tbody>
                                                ${lastTransactions.slice(-5).reverse().map(t => `
                                                    <tr>
                                                        <td>${t.date}</td>
                                                        <td>${t.type}</td>
                                                        <td class="${t.type.includes('إيراد') ? 'text-green' : 'text-red'}">${formatCurrency(t.amount)}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div class="module-card">
                                    <h3 class="sub-title"><i class="fas fa-bell"></i> تنبيهات النظام</h3>
                                    <div class="alerts-list">
                                        <div class="alert-item info">تم تحديث سجلات المهندسين محمد صلاح وطارق زينهم بنجاح.</div>
                                        <div class="alert-item warning">يوجد عدد ${mSnap.size} طلب صيانة لم يتم إغلاقه بعد.</div>
                                        <div class="alert-item success">النظام يعمل بكفاءة والربط السحابي مستقر.</div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                });
            });
        });
    });
},

    // 2. الموظفين + تعديل
    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(d => {
                const e = d.data();
                const net = (safeNum(e.salary) + safeNum(e.bonus)) - safeNum(e.penalty);
                rows += `<tr><td>${safeStr(e.name)}</td><td>${safeStr(e.job)}</td><td>${formatCurrency(net)}</td>
                <td><button class="btn-edit-mini" onclick='app.prepEdit("${d.id}", "hr", ${JSON.stringify(e)})'><i class="fas fa-edit"></i></button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>إدارة الموظفين والرواتب</h2>
                    <div class="form-grid"><input id="en" placeholder="الاسم"><input id="ej" placeholder="الوظيفة"><input id="es" type="number" placeholder="الراتب"><button class="btn-gold" id="btn-save" onclick="app.saveHR()">حفظ</button></div>
                    <div class="table-wrapper"><table class="styled-table"><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الصافي</th><th>تعديل</th></tr></thead><tbody>${rows}</tbody></table></div>
                </div>`;
        });
    },
    async saveHR() {
        const d = { name: document.getElementById('en').value, job: document.getElementById('ej').value, salary: safeNum(document.getElementById('es').value) };
        if(this.editingId) await updateDoc(doc(db, "Employees", this.editingId), d);
        else await addDoc(collection(db, "Employees"), {...d, bonus:0, penalty:0});
        this.loadModule('hr');
    },

    // 3. الحوافز والخصومات
    async renderAdjustments() {
        const emps = await getDocs(collection(db, "Employees"));
        let opts = '<option value="">اختر الموظف...</option>';
        emps.forEach(d => opts += `<option value="${d.id}">${d.data().name}</option>`);
        document.getElementById('module-display').innerHTML = `
            <div class="module-card">
                <h2>إدارة المكافآت والجزاءات</h2>
                <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                    <select id="adjEmp">${opts}</select>
                    <select id="adjType"><option value="bonus">حوافز (+)</option><option value="penalty">خصم (-)</option></select>
                    <input id="adjAmt" type="number" placeholder="المبلغ">
                    <button class="btn-gold" style="grid-column: span 3;" onclick="app.applyAdj()">تطبيق على سجل الموظف</button>
                </div>
            </div>`;
    },
    async applyAdj() {
        const id = document.getElementById('adjEmp').value;
        const type = document.getElementById('adjType').value;
        const amt = safeNum(document.getElementById('adjAmt').value);
        if(!id || amt <= 0) return alert("خطأ في البيانات");
        const ref = doc(db, "Employees", id);
        const snap = await getDocs(collection(db, "Employees"));
        let cur; snap.forEach(d => { if(d.id === id) cur = d.data(); });
        if(type === 'bonus') await updateDoc(ref, { bonus: (safeNum(cur.bonus) + amt) });
        else await updateDoc(ref, { penalty: (safeNum(cur.penalty) + amt) });
        alert("تم الحفظ"); this.loadModule('hr');
    },

    // 4. الوحدات والملاك (تم إصلاح safeStr)
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let rows = "";
            snap.forEach(d => {
                const u = d.data();
                rows += `<tr>
                    <td><span class="badge-gold">${safeStr(u.building)} / ${safeStr(u.unitNum)}</span></td>
                    <td>${safeStr(u.ownerName)}</td>
                    <td>${safeStr(u.occupantType)}</td>
                    <td>${safeStr(u.phone)}</td>
                    <td>${u.files ? `<button class="file-btn" onclick="app.viewFile('${u.files[0]}')">📁</button>` : '---'}</td>
                    <td>
                        <button class="btn-edit-mini" onclick='app.prepEdit("${d.id}", "units", ${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
                        <button class="btn-del-mini" onclick="app.delDoc('Units','${d.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>تسجيل وتعديل الوحدات</h2>
                    <div class="form-grid">
                        <input id="ub" placeholder="العمارة"><input id="un" placeholder="الشقة"><input id="uon" placeholder="الساكن">
                        <input id="uph" placeholder="الهاتف"><input id="uid" placeholder="القومي"><input id="ua" placeholder="المساحة">
                        <input id="uc" placeholder="السيارة"><select id="ut"><option>مالك</option><option>مستأجر</option></select>
                        <input type="file" id="uFiles" multiple>
                        <button class="btn-gold" id="btn-save" onclick="app.saveUnit()">حفظ</button>
                    </div>
                    <div class="table-wrapper"><table class="styled-table"><thead><tr><th>العمارة</th><th>الاسم</th><th>الصفة</th><th>الهاتف</th><th>مرفق</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>
                </div>`;
        });
    },
    async saveUnit() {
        const fileIn = document.getElementById('uFiles');
        let files = [];
        if(fileIn.files.length > 0) {
            for(let f of fileIn.files) {
                const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
                files.push(b64);
            }
        }
        const d = { building: document.getElementById('ub').value, unitNum: document.getElementById('un').value, ownerName: document.getElementById('uon').value, phone: document.getElementById('uph').value, nationalID: document.getElementById('uid').value, area: document.getElementById('ua').value, car: document.getElementById('uc').value, occupantType: document.getElementById('ut').value, files: files };
        if(this.editingId) await updateDoc(doc(db, "Units", this.editingId), d);
        else await addDoc(collection(db, "Units"), d);
        this.loadModule('units');
    },

    // 5. المالية + تعديل
    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            let rows = ""; snap.forEach(d => { const f = d.data(); rows += `<tr><td>${f.date}</td><td>${f.type}</td><td>${formatCurrency(f.amount)}</td><td><button onclick='app.prepEdit("${d.id}", "finance", ${JSON.stringify(f)})'><i class="fas fa-edit"></i></button></td></tr>`; });
            document.getElementById('module-display').innerHTML = `<h2>المالية</h2><div class="form-grid"><select id="ft"><option>إيراد</option><option>مصروف</option></select><input id="fa" type="number" placeholder="المبلغ"><input id="fn" placeholder="البيان"><button class="btn-gold" id="btn-save" onclick="app.saveFin()">تسجيل</button></div><table class="styled-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>تعديل</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },
    async saveFin() {
        const d = { type: document.getElementById('ft').value, amount: safeNum(document.getElementById('fa').value), note: document.getElementById('fn').value, date: new Date().toLocaleDateString() };
        if(this.editingId) await updateDoc(doc(db, "Finance", this.editingId), d);
        else await addDoc(collection(db, "Finance"), d);
        this.loadModule('finance');
    },

    // 6. الصيانة + تعديل
    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let list = ""; snap.forEach(d => { const m = d.data(); list += `<tr><td>${m.unit}</td><td>${m.issue}</td><td><button class="btn-edit-mini" onclick='app.prepEdit("${d.id}", "maint", ${JSON.stringify(m)})'>تعديل</button><button class="btn-del-mini" onclick="app.delDoc('Maintenance','${d.id}')">حذف</button></td></tr>`; });
            document.getElementById('module-display').innerHTML = `<h2>الصيانة</h2><div class="form-grid"><input id="mu" placeholder="الوحدة"><input id="mi" placeholder="العطل"><button class="btn-gold" id="btn-save" onclick="app.saveMaint()">حفظ</button></div><table class="styled-table"><thead><tr><th>الوحدة</th><th>العطل</th><th>إجراء</th></tr></thead><tbody>${list}</tbody></table>`;
        });
    },
    async saveMaint() {
        const d = { unit: document.getElementById('mu').value, issue: document.getElementById('mi').value };
        if(this.editingId) await updateDoc(doc(db, "Maintenance", this.editingId), d);
        else await addDoc(collection(db, "Maintenance"), d);
        this.loadModule('maintenance');
    },

    // 7. الأمن
    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = ""; snap.forEach(d => { const u = d.data(); rows += `<tr><td>${u.name}</td><td>${u.role}</td><td><button class="btn-del-mini" onclick="app.delDoc('Users','${d.id}')">حذف</button></td></tr>`; });
            document.getElementById('module-display').innerHTML = `<h2>الأمن</h2><div class="form-grid"><input id="unm" placeholder="الاسم"><input id="url" placeholder="الدور"><button class="btn-gold" onclick="app.addUser()">إضافة</button></div><table class="styled-table"><thead><tr><th>الاسم</th><th>الدور</th><th>حذف</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
    },
    async addUser() { await addDoc(collection(db, "Users"), { name: document.getElementById('unm').value, role: document.getElementById('url').value }); },

    // 8. التقارير
    renderReports() {
        document.getElementById('module-display').innerHTML = `<h2>التقارير</h2><div class="reports-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;"><button class="btn-gold" onclick="app.exportAll('Units')">Excel الملاك</button><button class="btn-gold" onclick="app.exportAll('Employees')">Excel الموظفين</button></div>`;
    },

    // --- وظائف عامة ---
    prepEdit(id, mod, data) {
        this.editingId = id;
        const btn = document.getElementById('btn-save');
        if(btn) { btn.innerText = "تحديث الآن"; btn.style.background = "#2196F3"; }
        if(mod === 'hr') { document.getElementById('en').value = data.name; document.getElementById('ej').value = data.job; document.getElementById('es').value = data.salary; }
        if(mod === 'units') { document.getElementById('ub').value = data.building; document.getElementById('un').value = data.unitNum; document.getElementById('uon').value = data.ownerName; document.getElementById('uph').value = data.phone; document.getElementById('uid').value = data.nationalID; document.getElementById('ua').value = data.area; document.getElementById('uc').value = data.car; document.getElementById('ut').value = data.occupantType; }
        if(mod === 'finance') { document.getElementById('fa').value = data.amount; document.getElementById('fn').value = data.note; }
        if(mod === 'maint') { document.getElementById('mu').value = data.unit; document.getElementById('mi').value = data.issue; }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    viewFile(b64) {
        const win = window.open();
        win.document.write(`<iframe src="${b64}" frameborder="0" style="width:100%; height:100%;" allowfullscreen></iframe>`);
    },
    async delDoc(c, id) { if(confirm("حذف؟")) await deleteDoc(doc(db, c, id)); },
    async exportAll(c) {
        const s = await getDocs(collection(db, c)); let d = []; s.forEach(x => d.push(x.data()));
        const ws = XLSX.utils.json_to_sheet(d); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, c); XLSX.writeFile(wb, `Heliopolis_${c}.xlsx`);
    }
};

// محرك البحث السريع
document.addEventListener('input', (e) => {
    if (e.target.closest('#quick-search')) {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(el => {
            el.style.display = el.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    }
});

window.onload = () => app.loadModule('dashboard');