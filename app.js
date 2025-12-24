import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

const safeNum = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(safeNum(n));

const trans = {
    ar: { app_title: "هليوبوليس رزيدنس", dashboard: "الرئيسية", hr: "الموظفين", adjust: "الحوافز والخصومات", units: "الوحدات", finance: "المالية", maintenance: "الصيانة", security: "الأمن", reports: "التقارير", langBtn: "ENGLISH" },
    en: { app_title: "Heliopolis", dashboard: "Dashboard", hr: "Staff", adjust: "Rewards/Penalties", units: "Units", finance: "Finance", maintenance: "Maintenance", security: "Security", reports: "Reports", langBtn: "العربية" }
};

window.app = {
    currentLang: 'ar', currentModule: 'dashboard', editingId: null,

    toggleLanguage() {
        this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('lang-label').innerText = trans[this.currentLang].langBtn;
        this.updateSidebar();
        this.loadModule(this.currentModule);
    },

    updateSidebar() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerText = trans[this.currentLang][key];
        });
    },

    toggleTheme() { document.body.classList.toggle('dark-mode'); },

    async loadModule(name, el) {
        this.currentModule = name; this.editingId = null;
        const display = document.getElementById('module-display');
        display.innerHTML = '<div class="loader">Syncing...</div>';

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
            onSnapshot(collection(db, "Finance"), (fSnap) => {
                let cash = 0; fSnap.forEach(d => cash += (d.data().type.includes('إيراد') ? safeNum(d.data().amount) : -safeNum(d.data().amount)));
                document.getElementById('module-display').innerHTML = `
                    <div class="fade-in">
                        <h2>إحصائيات هليوبوليس رزيدنس الحقيقية</h2>
                        <div class="stats-container" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin-top:20px;">
                            <div class="stat-card" style="background:white; padding:20px; border-radius:15px; border-bottom:5px solid var(--gold);"><h4>الوحدات</h4><h3>${uSnap.size}</h3></div>
                            <div class="stat-card" style="background:white; padding:20px; border-radius:15px; border-bottom:5px solid var(--gold);"><h4>الخزينة</h4><h3>${formatCurrency(cash)}</h3></div>
                            <div class="stat-card" style="background:white; padding:20px; border-radius:15px; border-bottom:5px solid var(--gold);"><h4>إدارة</h4><h3>M.T Duo</h3></div>
                        </div>
                    </div>`;
            });
        });
    },

    // 2. الموظفين + تعديل
    renderHR() {
        onSnapshot(collection(db, "Employees"), (snap) => {
            let rows = ""; snap.forEach(d => {
                const e = d.data(); const net = (safeNum(e.salary) + safeNum(e.bonus)) - safeNum(e.penalty);
                rows += `<tr><td>${e.name}</td><td>${e.job}</td><td>${formatCurrency(net)}</td>
                <td><button class="btn-edit-mini" onclick='app.prepEdit("${d.id}", "hr", ${JSON.stringify(e)})'>تعديل</button></td></tr>`;
            });
            document.getElementById('module-display').innerHTML = `<div class="module-card"><h2>الموظفين</h2><div class="form-grid"><input id="en" placeholder="الاسم"><input id="ej" placeholder="الوظيفة"><input id="es" type="number" placeholder="الراتب"><button class="btn-gold" id="btn-save" onclick="app.saveHR()">حفظ</button></div><table class="styled-table"><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الصافي</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        });
    },
    async saveHR() {
        const d = { name: document.getElementById('en').value, job: document.getElementById('ej').value, salary: safeNum(document.getElementById('es').value) };
        if(this.editingId) await updateDoc(doc(db, "Employees", this.editingId), d);
        else await addDoc(collection(db, "Employees"), {...d, bonus:0, penalty:0});
        this.loadModule('hr');
    },

    // 3. الحوافز والخصومات (الموديول المطلوب)
    async renderAdjustments() {
        const emps = await getDocs(collection(db, "Employees"));
        let opts = '<option value="">اختر الموظف...</option>';
        emps.forEach(d => opts += `<option value="${d.id}">${d.data().name}</option>`);

        document.getElementById('module-display').innerHTML = `
            <div class="module-card">
                <h2>إدارة الحوافز والجزاءات</h2>
                <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                    <select id="adjEmp">${opts}</select>
                    <select id="adjType"><option value="bonus">حوافز (+)</option><option value="penalty">خصم (-)</option></select>
                    <input id="adjAmt" type="number" placeholder="المبلغ">
                    <button class="btn-gold" onclick="app.applyAdj()">تطبيق على الراتب</button>
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
        alert("تم التطبيق"); this.loadModule('hr');
    },

    // 4. الوحدات + تعديل + مرفقات
    renderUnits() {
        onSnapshot(collection(db, "Units"), (snap) => {
            let list = ""; snap.forEach(d => {
                const u = d.data();
                list += `<div class="unit-card-large">
                    <div class="unit-header">عمارة ${u.building} - شقة ${u.unitNum} [${u.type}]</div>
                    <div class="unit-body">
                        <p><b>المالك:</b> ${u.owner} | <b>تليفون:</b> ${u.phone}</p>
                        <p><b>البطاقة:</b> ${u.nid} | <b>المساحة:</b> ${u.area} م² | <b>السيارة:</b> ${u.car}</p>
                        <div class="mt-2">${u.files ? u.files.map((f, i) => `<button onclick="app.viewFile('${f}')" class="file-btn">مرفق ${i+1}</button>`).join('') : ''}</div>
                        <button class="btn-edit-mini mt-2" onclick='app.prepEdit("${d.id}", "units", ${JSON.stringify(u)})'>تعديل</button>
                        <button class="btn-del-mini" onclick="app.delDoc('Units','${d.id}')">حذف</button>
                    </div>
                </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <h2>إدارة الوحدات والملاك</h2>
                <div class="form-grid">
                    <input id="ub" placeholder="العمارة"><input id="un" placeholder="الشقة"><input id="uo" placeholder="الساكن">
                    <input id="up" placeholder="الهاتف"><input id="ui" placeholder="القومي"><input id="ua" placeholder="المساحة">
                    <input id="uc" placeholder="السيارة"><select id="ut"><option>مالك</option><option>مستأجر</option></select>
                    <input type="file" id="uFiles" multiple accept="image/*">
                    <button class="btn-gold" id="btn-save" onclick="app.saveUnit()">حفظ</button>
                </div><div class="units-grid">${list}</div>`;
        });
    },
    async saveUnit() {
        const fileIn = document.getElementById('uFiles');
        let files = [];
        if(fileIn.files.length > 0) {
            for(let f of fileIn.files) {
                const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(f); });
                files.push(b64);
            }
        }
        const d = { building: document.getElementById('ub').value, unitNum: document.getElementById('un').value, owner: document.getElementById('uo').value, phone: document.getElementById('up').value, nid: document.getElementById('ui').value, area: document.getElementById('ua').value, car: document.getElementById('uc').value, type: document.getElementById('ut').value, files: files };
        if(this.editingId) await updateDoc(doc(db, "Units", this.editingId), d);
        else await addDoc(collection(db, "Units"), d);
        this.loadModule('units');
    },

    // 5. المالية
    renderFinance() {
        onSnapshot(collection(db, "Finance"), (snap) => {
            let rows = ""; snap.forEach(d => { const f = d.data(); rows += `<tr><td>${f.date}</td><td>${f.type}</td><td>${formatCurrency(f.amount)}</td></tr>`; });
            document.getElementById('module-display').innerHTML = `<h2>المالية</h2><div class="form-grid"><select id="ft"><option>إيراد</option><option>مصروف</option></select><input id="fa" type="number" placeholder="المبلغ"><input id="fn" placeholder="البيان"><button class="btn-gold" onclick="app.addFin()">تسجيل</button></div><table class="styled-table"><tbody>${rows}</tbody></table>`;
        });
    },
    async addFin() { await addDoc(collection(db, "Finance"), { type: document.getElementById('ft').value, amount: safeNum(document.getElementById('fa').value), note: document.getElementById('fn').value, date: new Date().toLocaleDateString() }); },

    // 6. الصيانة
    // --- موديول الصيانة (تعديل وحذف) ---
    renderMaintenance() {
        onSnapshot(collection(db, "Maintenance"), (snap) => {
            let list = "";
            snap.forEach(d => {
                const m = d.data();
                list += `
                <div class="task-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <span><b>وحدة ${m.unit}:</b> ${m.issue}</span>
                    <div class="h-actions">
                        <button class="btn-edit-mini" onclick='app.prepEdit("${d.id}", "maintenance", ${JSON.stringify(m)})'>تعديل</button>
                        <button class="btn-del-mini" onclick="app.delDoc('Maintenance','${d.id}')">حذف</button>
                        <button class="btn-gold" style="padding: 5px 15px;" onclick="app.delDoc('Maintenance','${d.id}')">تم ✅</button>
                    </div>
                </div>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>طلبات الصيانة المفتوحة</h2>
                    <div class="form-grid">
                        <input id="mu" placeholder="رقم الوحدة">
                        <input id="mi" placeholder="وصف العطل">
                        <button class="btn-gold" id="btn-save-maint" onclick="app.saveMaintenance()">إرسال / تحديث</button>
                    </div>
                    <div class="tasks-list">${list}</div>
                </div>`;
        });
    },

    async saveMaintenance() {
        const d = { unit: document.getElementById('mu').value, issue: document.getElementById('mi').value };
        if(this.editingId) {
            await updateDoc(doc(db, "Maintenance", this.editingId), d);
            alert("تم تعديل طلب الصيانة");
        } else {
            await addDoc(collection(db, "Maintenance"), d);
        }
        this.loadModule('maintenance');
    },
    async addMaint() { await addDoc(collection(db, "Maintenance"), { unit: document.getElementById('mu').value, issue: document.getElementById('mi').value }); },

    // 7. الأمن
    // --- موديول الأمن (تعديل وحذف) ---
    renderSecurity() {
        onSnapshot(collection(db, "Users"), (snap) => {
            let rows = "";
            snap.forEach(d => {
                const u = d.data();
                rows += `<tr>
                    <td>${u.name}</td>
                    <td>${u.role}</td>
                    <td>
                        <button class="btn-edit-mini" onclick='app.prepEdit("${d.id}", "security", ${JSON.stringify(u)})'>تعديل</button>
                        <button class="btn-del-mini" onclick="app.delDoc('Users','${d.id}')">حذف</button>
                    </td>
                </tr>`;
            });
            document.getElementById('module-display').innerHTML = `
                <div class="module-card">
                    <h2>إدارة مستخدمي الأمن والصلاحيات</h2>
                    <div class="form-grid">
                        <input id="unm" placeholder="الاسم الكامل">
                        <select id="url">
                            <option>مدير</option>
                            <option>مشرف أمن</option>
                            <option>فرد أمن</option>
                            <option>محاسب</option>
                        </select>
                        <button class="btn-gold" id="btn-save" onclick="app.saveSecurityUser()">حفظ / تحديث</button>
                    </div>
                    <table class="styled-table">
                        <thead><tr><th>الاسم</th><th>الدور</th><th>الإجراءات</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        });
    },
    async saveSecurityUser() {
        const d = { name: document.getElementById('unm').value, role: document.getElementById('url').value };
        if(this.editingId) {
            await updateDoc(doc(db, "Users", this.editingId), d);
            alert("تم تحديث بيانات المستخدم");
        } else {
            await addDoc(collection(db, "Users"), d);
        }
        this.loadModule('security');
    },
    async addUser() { await addDoc(collection(db, "Users"), { name: document.getElementById('unm').value, role: document.getElementById('url').value }); },

    // 8. التقارير
    renderReports() {
        document.getElementById('module-display').innerHTML = `<h2>التقارير</h2><div class="reports-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;"><button class="btn-gold" onclick="app.exportAll('Units')">Excel الملاك</button><button class="btn-gold" onclick="app.exportAll('Employees')">Excel الموظفين</button></div>`;
    },

    // أدوات عامة (تعديل، حذف، بحث، عرض ملفات)
    prepEdit(id, mod, data) {
        this.editingId = id;
        const btn = document.getElementById('btn-save');
        if(btn) { btn.innerText = "تحديث الآن"; btn.style.background = "#2196F3"; }
        if(mod === 'hr') { document.getElementById('en').value = data.name; document.getElementById('ej').value = data.job; document.getElementById('es').value = data.salary; }
        if(mod === 'units') { document.getElementById('ub').value = data.building; document.getElementById('un').value = data.unitNum; document.getElementById('uo').value = data.owner; document.getElementById('up').value = data.phone; document.getElementById('ui').value = data.nid; document.getElementById('ua').value = data.area; document.getElementById('uc').value = data.car; document.getElementById('ut').value = data.type; }
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
document.getElementById('quick-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('tbody tr, .unit-card-large, .task-item').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
});

window.onload = () => app.loadModule('dashboard');