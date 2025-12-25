import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, updateDoc, getDocs, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// 1. إعدادات الفايربيز
const firebaseConfig = {
    apiKey: "AIzaSyDM3sxud-Dq0EOmeY4_ZpLVkH0qcaYzB54",
    authDomain: "heliopolis-residence-9a03a.firebaseapp.com",
    projectId: "heliopolis-residence-9a03a",
    storageBucket: "heliopolis-residence-9a03a.firebasestorage.app",
    messagingSenderId: "49774729294",
    appId: "1:49774729294:web:56b5eace3128a7c5c2cb1f"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance);
const auth = getAuth(appInstance);

// 2. أدوات مساعدة (Helpers)
const safeNum = (v) => (isNaN(parseFloat(v)) || v === undefined) ? 0 : parseFloat(v);
const safeStr = (s) => (s === undefined || s === null || s === "" || s === "undefined") ? "---" : s;
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

const trans = {
    ar: { langBtn: "ENGLISH", logout: "خروج", dashboard: "الرئيسية", hr: "الموظفين", adjust: "الحوافز", units: "الوحدات", finance: "المالية", maintenance: "الصيانة", security: "الأمن", reports: "التقارير" },
    en: { langBtn: "العربية", logout: "Logout", dashboard: "Dashboard", hr: "Staff", adjust: "Rewards", units: "Units", finance: "Finance", maintenance: "Maintenance", security: "Security", reports: "Reports" }
};

// 3. المحرك الرئيسي للنظام
window.app = {
    currentLang: 'ar',
    userRole: localStorage.getItem('userRole') || null,
    currentModule: 'dashboard',
    editingId: null,

    // --- نظام التحقق والحماية ---
    validateFields(fields) {
        for (let id of fields) {
            const el = document.getElementById(id);
            if (!el || el.value.trim() === "") {
                alert(`خطأ: يرجى ملء كافة الحقول المطلوبة.`);
                if(el) el.focus();
                return false;
            }
        }
        return true;
    },

    // 3. موديول الحوافز والخصومات المطور
    async renderAdjustments() {
        // جلب الموظفين للقائمة المنسدلة
        const empsSnap = await getDocs(collection(db, "Employees"));
        let empsOpts = '<option value="">-- اختر الموظف --</option>';
        empsSnap.forEach(d => {
            empsOpts += `<option value="${d.id}">${d.data().name}</option>`;
        });

        // جلب سجل الحركات السابقة لعرضها في جدول
        onSnapshot(query(collection(db, "Adjustments"), orderBy("date", "desc")), (snap) => {
            let rows = "";
            snap.forEach(d => {
                const adj = d.data();
                const typeClass = adj.type === 'bonus' ? 'text-green' : 'text-red';
                const typeText = adj.type === 'bonus' ? 'مكافأة (+)' : 'خصم (-)';
                
                rows += `<tr>
                    <td>${adj.date}</td>
                    <td>${adj.empName}</td>
                    <td class="${typeClass}"><b>${typeText}</b></td>
                    <td>${formatCurrency(adj.amount)}</td>
                    <td>${adj.reason || '---'}</td>
                    <td><button class="btn-del-mini" onclick="app.delDoc('Adjustments','${d.id}')"><i class="fas fa-trash"></i></button></td>
                </tr>`;
            });

            document.getElementById('module-display').innerHTML = `
                <div class="module-card fade-in">
                    <h2><i class="fas fa-hand-holding-usd"></i> إدارة الحوافز والمكافآت والخصومات</h2>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label>الموظف المستهدف</label>
                            <select id="adj-emp">${empsOpts}</select>
                        </div>
                        <div class="form-group">
                            <label>نوع الحركة</label>
                            <select id="adj-type">
                                <option value="bonus">مكافأة / حافز (+)</option>
                                <option value="penalty">جزاء / خصم (-)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>المبلغ</label>
                            <input id="adj-amount" type="number" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>السبب / الملاحظات</label>
                            <input id="adj-reason" placeholder="مثال: مكافأة تميز، تأخير...">
                        </div>
                        <button class="btn-gold" style="height:45px; align-self:flex-end;" onclick="app.saveAdj()">تسجيل الحركة</button>
                    </div>

                    <div class="table-wrapper" style="margin-top:30px;">
                        <h3>سجل الحركات المالية للموظفين</h3>
                        <table class="styled-table">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>الموظف</th>
                                    <th>النوع</th>
                                    <th>المبلغ</th>
                                    <th>السبب</th>
                                    <th>إجراء</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
        });
    },

    async saveAdj() {
        if (this.checkReadOnly()) return;

        // 1. التحقق من الحقول الفارغة
        if (!this.validateFields(['adj-emp', 'adj-amount', 'adj-reason'])) return;

        const empId = document.getElementById('adj-emp').value;
        const type = document.getElementById('adj-type').value;
        const amount = safeNum(document.getElementById('adj-amount').value);
        const reason = document.getElementById('adj-reason').value;
        const empName = document.getElementById('adj-emp').options[document.getElementById('adj-emp').selectedIndex].text;

        const adjData = {
            empId,
            empName,
            type,
            amount,
            reason,
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString()
        };

        try {
            // 2. حفظ الحركة في سجل "Adjustments" للتقارير
            await addDoc(collection(db, "Adjustments"), adjData);

            // 3. تحديث إجمالي الحوافز/الخصومات في ملف الموظف نفسه (اختياري لكنه مفيد للرواتب)
            const empRef = doc(db, "Employees", empId);
            const empSnap = await getDocs(query(collection(db, "Employees")));
            let currentData;
            empSnap.forEach(d => { if(d.id === empId) currentData = d.data(); });

            if (type === 'bonus') {
                await updateDoc(empRef, { bonus: (safeNum(currentData.bonus) + amount) });
            } else {
                await updateDoc(empRef, { penalty: (safeNum(currentData.penalty) + amount) });
            }

            alert("تم تسجيل الحركة وتحديث سجل الموظف بنجاح.");
            this.renderAdjustments(); // إعادة تحميل الواجهة
        } catch (e) {
            alert("خطأ أثناء الحفظ: " + e.message);
        }
    },

    async isDuplicate(col, field, val) {
        const q = query(collection(db, col), where(field, "==", val));
        const snap = await getDocs(q);
        if (this.editingId) {
            let dup = false;
            snap.forEach(d => { if(d.id !== this.editingId) dup = true; });
            return dup;
        }
        return !snap.empty;
    },

    // --- إدارة الملفات واللغة ---
    async getBase64(file) {
        return new Promise((r, j) => {
            const rd = new FileReader();
            rd.readAsDataURL(file);
            rd.onload = () => r(rd.result);
            rd.onerror = e => j(e);
        });
    },

    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('lang-label').innerText = trans[this.currentLang].langBtn;
        document.getElementById('logout-label').innerText = trans[this.currentLang].logout;
        const keys = ['dashboard', 'hr', 'adjust', 'units', 'finance', 'maintenance', 'security', 'reports'];
        document.querySelectorAll('.nav-links li span').forEach((s, i) => s.innerText = trans[this.currentLang][keys[i]]);
        this.loadModule(this.currentModule);
    },

    // --- نظام الدخول والخروج ---
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const pass = document.getElementById('loginPass').value;
        if (!email || !pass) return alert("أدخل البيانات");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            const q = query(collection(db, "Users"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                this.userRole = snap.docs[0].data().role;
                localStorage.setItem('userRole', this.userRole);
                document.getElementById('login-overlay').style.display = 'none';
                this.applyPermissions();
                this.loadModule('dashboard');
            } else {
                alert("لا توجد صلاحيات مسجلة.");
                await signOut(auth);
            }
        } catch (e) { alert("خطأ في الدخول: " + e.message); }
    },

    async handleLogout() {
        if (confirm("خروج؟")) {
            await signOut(auth);
            localStorage.clear();
            location.reload();
        }
    },

    applyPermissions() {
        const nav = document.querySelectorAll('.nav-links li');
        nav.forEach(li => {
            const m = li.getAttribute('onclick').match(/'([^']+)'/)[1];
            li.style.display = 'none';
            if (this.userRole === 'admin' || this.userRole === 'manager') li.style.display = 'flex';
            else if (this.userRole === 'finance' && ['dashboard', 'finance', 'reports', 'adjustments'].includes(m)) li.style.display = 'flex';
            else if (this.userRole === 'maintenance' && ['dashboard', 'maintenance'].includes(m)) li.style.display = 'flex';
            else if (this.userRole === 'security' && ['dashboard', 'security', 'units'].includes(m)) li.style.display = 'flex';
        });
    },

    checkReadOnly() {
        if (this.userRole === 'manager') { alert("عرض فقط (قراءة)"); return true; }
        return false;
    },

    // --- الموديولات والواجهات ---
    async loadModule(name, el) {
        this.currentModule = name; this.editingId = null;
        const canvas = document.getElementById('module-display');
        canvas.innerHTML = '<div class="loader">جاري المزامنة...</div>';
        if(el) { document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active')); el.classList.add('active'); }
        
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
        onSnapshot(collection(db, "Units"), (uS) => {
            onSnapshot(collection(db, "Employees"), (eS) => {
                onSnapshot(collection(db, "Finance"), (fS) => {
                    let bal = 0; fS.forEach(d => bal += (d.data().type === 'إيراد' ? safeNum(d.data().amount) : -safeNum(d.data().amount)));
                    document.getElementById('module-display').innerHTML = `
                        <div class="stats-grid-dashboard fade-in">
                            <div class="stat-card-pro blue"><div class="stat-icon">🏢</div><div class="stat-info"><h4>إجمالي الوحدات</h4><h3>${uS.size}</h3></div></div>
                            <div class="stat-card-pro green"><div class="stat-icon">💰</div><div class="stat-info"><h4>خزينة الكومباوند</h4><h3>${formatCurrency(bal)}</h3></div></div>
                            <div class="stat-card-pro gold"><div class="stat-icon">👨‍💼</div><div class="stat-info"><h4>قوة العمل</h4><h3>${eS.size}</h3></div></div>
                            <div class="stat-card-pro red"><div class="stat-icon">🛡️</div><div class="stat-info"><h4>الحالة الأمنية</h4><h3>مؤمنة</h3></div></div>
                        </div>`;
                });
            });
        });
    },

    // 2. الموظفين والحضور
    // 2. موديول الموظفين المطور (حساب الرواتب)
    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = "";
            snap.forEach(d => {
                const e = d.data();
                // الحساب التلقائي للصافي
                const totalBonus = safeNum(e.bonus);
                const totalPenalty = safeNum(e.penalty);
                const netSalary = (safeNum(e.salary) + totalBonus) - totalPenalty;

                rows += `<tr>
                    <td><b>${e.name}</b><br><small>${e.job}</small></td>
                    <td>${formatCurrency(e.salary)}</td>
                    <td class="text-green">+ ${formatCurrency(totalBonus)}</td>
                    <td class="text-red">- ${formatCurrency(totalPenalty)}</td>
                    <td style="background: #f1f4f9; font-weight: bold; color: var(--primary);">
                        ${formatCurrency(netSalary)}
                    </td>
                    <td>
                        <!-- زر صرف الراتب: يخصم من الخزينة ويصفر الحوافز -->
                        <button class="btn-gold-mini" onclick="app.processPayroll('${d.id}', '${e.name}', ${netSalary})">
                            <i class="fas fa-money-check-alt"></i> صرف
                        </button>
                        <button class="btn-edit-mini" onclick='app.prepEdit("${d.id}","hr",${JSON.stringify(e)})'><i class="fas fa-edit"></i></button>
                        <button class="btn-del-mini" onclick="app.delDoc('Employees','${d.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            });

            document.getElementById('module-display').innerHTML = `
                <div class="module-card fade-in">
                    <h2><i class="fas fa-users"></i> إدارة الموظفين ومسير الرواتب</h2>
                    <div class="form-grid">
                        <input id="en" placeholder="اسم الموظف">
                        <input id="ej" placeholder="الوظيفة">
                        <input id="es" type="number" placeholder="الراتب الأساسي">
                        <button class="btn-gold" onclick="app.saveHR()">إضافة موظف جديد</button>
                    </div>
                    <div class="table-wrapper">
                        <table class="styled-table">
                            <thead>
                                <tr>
                                    <th>الموظف</th>
                                    <th>الأساسي</th>
                                    <th>حوافز</th>
                                    <th>خصومات</th>
                                    <th>الصافي المستحق</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
        });
    },

    async saveHR() {
        if(this.checkReadOnly() || !this.validateFields(['en','ej','es'])) return;
        const data = { name: document.getElementById('en').value, job: document.getElementById('ej').value, salary: safeNum(document.getElementById('es').value) };
        if(await this.isDuplicate("Employees", "name", data.name)) return alert("الموظف مسجل مسبقاً");
        if(this.editingId) await updateDoc(doc(db, "Employees", this.editingId), data);
        else await addDoc(collection(db, "Employees"), {...data, bonus:0, penalty:0});
        this.loadModule('hr');
    },

    async processPayroll(empId, empName, netAmount) {
        if (this.checkReadOnly()) return;
        
        const confirmMsg = `هل أنت متأكد من صرف الراتب الصافي بقيمة (${formatCurrency(netAmount)}) للموظف: ${empName}؟ \n سيتم تسجيل هذا المبلغ كمصروف في الخزينة.`;
        
        if (confirm(confirmMsg)) {
            try {
                // 1. تسجيل العملية في المالية كمصروف
                await addDoc(collection(db, "Finance"), {
                    type: 'مصروف',
                    amount: netAmount,
                    note: `صرف راتب شهر للموظف: ${empName}`,
                    date: new Date().toLocaleDateString(),
                    timestamp: new Date().toISOString()
                });

                // 2. إعادة تصفير الحوافز والخصومات للموظف ليبدأ دورة شهرية جديدة
                const empRef = doc(db, "Employees", empId);
                await updateDoc(empRef, {
                    bonus: 0,
                    penalty: 0
                });

                alert(`تم صرف راتب ${empName} بنجاح وتسجيله في الحسابات المالية.`);
            } catch (e) {
                alert("حدث خطأ أثناء الصرف: " + e.message);
            }
        }
    },
    async saveAtt(id) {
        if(this.checkReadOnly()) return;
        await updateDoc(doc(db, "Employees", id), { cin: document.getElementById(`cin-${id}`).value, cout: document.getElementById(`cout-${id}`).value });
        alert("تم الحفظ");
    },

    // 3. الوحدات والملاك (مع رفع الملفات ومنع التكرار)
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let rows = "";
            snap.forEach(d => {
                const u = d.data();
                rows += `<tr><td>ع ${u.building} / ش ${u.unit}</td><td>${u.owner}</td><td>${u.occupantType}</td><td>${u.nationalID}</td>
                <td>${u.doc ? `<button class="btn-edit-mini" onclick="app.viewDoc('${u.doc}')">📄</button>` : '---'}</td>
                <td>
                    <button class="btn-edit-mini" onclick='app.prepEdit("${d.id}","units",${JSON.stringify(u)})'><i class="fas fa-edit"></i></button>
                    <button class="btn-del-mini" onclick="app.delDoc('Units','${d.id}')"><i class="fas fa-trash"></i></button>
                </td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <div style="display:flex; justify-content:space-between"><h2>تكويد الوحدات</h2><button class="action-btn" onclick="document.getElementById('exIn').click()">استيراد Excel</button></div>
                    <input type="file" id="exIn" style="display:none" onchange="app.importFromExcel(this,'Units')">
                    <div class="form-grid">
                        <input id="ub" placeholder="رقم العمارة"><input id="un" placeholder="رقم الشقة"><input id="ua" placeholder="المساحة">
                        <select id="ut" onchange="app.toggleOwnerField()"><option value="مالك">مالك أصلي</option><option value="إيجار">إيجار</option></select>
                        <input id="uo" placeholder="اسم الساكن">
                        <div id="original-owner-container" style="display:none"><input id="uoo" placeholder="اسم المالك الأصلي"></div>
                        <input id="unid" placeholder="الرقم القومي"><input id="uc" placeholder="رقم السيارة">
                        <input type="file" id="uFile" accept="image/*">
                        <button class="btn-gold" onclick="app.saveUnit()">حفظ الوحدة</button>
                    </div>
                    <table class="styled-table"><thead><tr><th>الوحدة</th><th>الساكن</th><th>النوع</th><th>القومي</th><th>مرفق</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table>
                </div>`;
        });
    },

    toggleOwnerField() {
        const isRent = document.getElementById('ut').value === 'إيجار';
        document.getElementById('original-owner-container').style.display = isRent ? 'block' : 'none';
    },

    async saveUnit() {
        if(this.checkReadOnly() || !this.validateFields(['ub','un','uo','unid'])) return;
        const nid = document.getElementById('unid').value;
        if(await this.isDuplicate("Units", "nationalID", nid)) return alert("الرقم القومي مكرر!");

        let fileB64 = ""; const fIn = document.getElementById('uFile');
        if(fIn.files[0]) fileB64 = await this.getBase64(fIn.files[0]);

        const data = {
            building: document.getElementById('ub').value, unit: document.getElementById('un').value,
            area: document.getElementById('ua').value, owner: document.getElementById('uo').value,
            occupantType: document.getElementById('ut').value, nationalID: nid,
            originalOwner: document.getElementById('ut').value === 'إيجار' ? document.getElementById('uoo').value : "نفسه",
            doc: fileB64
        };

        if(this.editingId) await updateDoc(doc(db, "Units", this.editingId), data);
        else await addDoc(collection(db, "Units"), data);
        this.loadModule('units');
    },

    // 4. المالية والميزانية
    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            let budget = 1000000; let exp = 0;
            snap.forEach(d => { if(d.data().type==='مصروف') exp += safeNum(d.data().amount); });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card"><h2>المالية والميزانية</h2>
                <div class="stats-grid-dashboard">
                    <div class="stat-card-pro blue"><h4>الميزانية</h4><h3>${formatCurrency(budget)}</h3></div>
                    <div class="stat-card-pro red"><h4>المصروفات</h4><h3>${formatCurrency(exp)}</h3></div>
                    <div class="stat-card-pro green"><h4>المتبقي</h4><h3>${formatCurrency(budget - exp)}</h3></div>
                </div>
                <div class="form-grid"><select id="ft"><option>إيراد</option><option>مصروف</option></select>
                <input id="fa" type="number" placeholder="المبلغ"><input id="fn" placeholder="البيان">
                <button class="btn-gold" onclick="app.saveFin()">تسجيل</button></div></div>`;
        });
    },

    async saveFin() {
        if(this.checkReadOnly() || !this.validateFields(['fa','fn'])) return;
        await addDoc(collection(db, "Finance"), { type: document.getElementById('ft').value, amount: safeNum(document.getElementById('fa').value), note: document.getElementById('fn').value, date: new Date().toLocaleDateString() });
        this.loadModule('finance');
    },

    // 5. الصيانة (ربط تلقائي)
    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let rows = ""; snap.forEach(d => { const m = d.data(); rows += `<tr><td>${m.date}</td><td>${m.unit}</td><td>${m.issue}</td><td>${formatCurrency(m.cost)}</td></tr>`; });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card"><h2>بلاغات الصيانة</h2>
                <div class="form-grid"><input type="date" id="md"><input id="mu" placeholder="الوحدة" onblur="app.lookupOwner()"><input id="mo" placeholder="اسم المالك (تلقائي)" readonly>
                <input id="mi" placeholder="العطل"><input id="mc" type="number" placeholder="التكلفة">
                <button class="btn-gold" onclick="app.saveMaint()">حفظ</button></div>
                <table class="styled-table"><thead><tr><th>التاريخ</th><th>الوحدة</th><th>العطل</th><th>التكلفة</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        });
    },

    async lookupOwner() {
        const unitVal = document.getElementById('mu').value;
        const q = query(collection(db, "Units"), where("unit", "==", unitVal));
        const snap = await getDocs(q);
        document.getElementById('mo').value = !snap.empty ? snap.docs[0].data().owner : "غير مسجل";
    },

    async saveMaint() {
        if(this.checkReadOnly() || !this.validateFields(['md','mu','mi'])) return;
        await addDoc(collection(db, "Maintenance"), { date: document.getElementById('md').value, unit: document.getElementById('mu').value, issue: document.getElementById('mi').value, cost: safeNum(document.getElementById('mc').value) });
        this.loadModule('maintenance');
    },

    // 6. الأمن والمستخدمين
    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = ""; snap.forEach(d => { const u = d.data(); rows += `<tr><td>${u.name}</td><td>${u.role}</td><td><button class="btn-edit-mini" onclick='app.prepEdit("${d.id}","security",${JSON.stringify(u)})'>📝</button></td></tr>`; });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card"><h2>الأمن والصلاحيات</h2>
                <div class="form-grid"><input id="unm" placeholder="الاسم"><input id="uem" placeholder="الإيميل">
                <select id="url"><option value="admin">أدمن</option><option value="manager">مدير</option><option value="finance">محاسب</option><option value="security">أمن</option></select>
                <button class="btn-gold" onclick="app.saveUser()">حفظ</button></div>
                <table class="styled-table"><thead><tr><th>الاسم</th><th>الدور</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        });
    },

    async saveUser() {
        if(this.checkReadOnly() || !this.validateFields(['unm','uem'])) return;
        const email = document.getElementById('uem').value.toLowerCase();
        if(await this.isDuplicate("Users", "email", email)) return alert("الإيميل مكرر");
        const data = { name: document.getElementById('unm').value, email: email, role: document.getElementById('url').value };
        if(this.editingId) await updateDoc(doc(db, "Users", this.editingId), data);
        else await addDoc(collection(db, "Users"), data);
        this.loadModule('security');
    },

    // 7. التقارير والاكسيل
    renderReports() {
        document.getElementById('module-display').innerHTML = `
            <div class="module-card"><h2>مركز التقارير</h2>
            <div class="form-grid">
                <button class="btn-gold" onclick="app.exportToExcel('Units','الملاك')">تصدير الملاك Excel</button>
                <button class="btn-gold" onclick="app.exportToExcel('Employees','الموظفين')">تصدير الموظفين Excel</button>
                <button class="btn-gold" onclick="app.exportToExcel('Finance','المالية')">تصدير المالية Excel</button>
            </div></div>`;
    },

    async exportToExcel(col, file) {
        const snap = await getDocs(collection(db, col)); let data = [];
        snap.forEach(d => { 
            let row = d.data(); delete row.doc; // حذف المرفقات من الاكسيل
            data.push(row); 
        });
        const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `Heliopolis_${file}.xlsx`);
    },

    async importFromExcel(input, col) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            for(let row of data) await addDoc(collection(db, col), row);
            alert("تم الاستيراد بنجاح"); this.loadModule(this.currentModule);
        };
        reader.readAsArrayBuffer(input.files[0]);
    },

    // --- وظائف عامة ---
    prepEdit(id, mod, data) {
        if(this.checkReadOnly()) return;
        this.editingId = id; const btn = document.querySelector('.btn-gold'); if(btn) btn.innerText = "تحديث الآن";
        if(mod==='hr') { document.getElementById('en').value=data.name; document.getElementById('ej').value=data.job; document.getElementById('es').value=data.salary; }
        if(mod==='units') { 
            document.getElementById('ub').value=data.building; document.getElementById('un').value=data.unit; 
            document.getElementById('uo').value=data.owner; document.getElementById('unid').value=data.nationalID;
            document.getElementById('ut').value=data.occupantType; this.toggleOwnerField();
        }
        if(mod==='security') { document.getElementById('unm').value=data.name; document.getElementById('uem').value=data.email; document.getElementById('url').value=data.role; }
        window.scrollTo({top:0, behavior:'smooth'});
    },

    async delDoc(c, id) { if(this.checkReadOnly()) return; if(confirm("حذف؟")) await deleteDoc(doc(db, c, id)); },
    viewDoc(src) { const w = window.open(); w.document.write(`<img src="${src}" style="width:100%">`); },
    toggleTheme() { document.body.classList.toggle('dark-mode'); }
};

// تشغيل النظام
window.handleInitialLogin = () => app.handleLogin();
onAuthStateChanged(auth, (user) => {
    if (user && localStorage.getItem('userRole')) {
        document.getElementById('login-overlay').style.display = 'none';
        app.applyPermissions();
        app.loadModule('dashboard');
    } else { document.getElementById('login-overlay').style.display = 'flex'; }
});

// البحث السريع
document.getElementById('quick-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.styled-table tbody tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
});