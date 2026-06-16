// ───────────────────────────────
// جلوگیری از تایپ فارسی
// ───────────────────────────────
const PERSIAN_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

function showWarn(warning, input) {
  warning.classList.remove('hidden');
  input.classList.add('input-error');
  clearTimeout(input._warnTimer);
  input._warnTimer = setTimeout(() => {
    warning.classList.add('hidden');
    input.classList.remove('input-error');
  }, 5000);
}

function stripPersian(input, warning) {
  if (PERSIAN_RE.test(input.value)) {
    const pos = input.selectionStart;
    input.value = input.value.replace(new RegExp(PERSIAN_RE.source, 'g'), '');
    input.setSelectionRange(pos, pos);
    showWarn(warning, input);
  }
}

function blockPersian(inputId, warningId) {
  const input   = document.getElementById(inputId);
  const warning = document.getElementById(warningId);

  // هر بار که محتوا تغییر کرد (تایپ، پیست، IME)
  input.addEventListener('input', () => stripPersian(input, warning));

  // پایان ترکیب IME — صفحه‌کلید فارسی ویندوز
  input.addEventListener('compositionend', () => {
    setTimeout(() => stripPersian(input, warning), 0);
  });
}

// ───────────────────────────────
// کاربران سیستم
// ───────────────────────────────
const USERS = {
  admin:   { password: '1234', role: 'admin',   name: 'مدیر سیستم' },
  coach:   { password: '1234', role: 'coach',   name: 'مربی باشگاه' },
  athlete: { password: '1234', role: 'athlete', name: 'ورزشکار' },
};

const ROLE_LABELS = { admin: 'مدیر', coach: 'مربی', athlete: 'ورزشکار' };
const ROLE_CLASS  = { admin: 'rc-admin', coach: 'rc-coach', athlete: 'rc-athlete' };

const TYPE_LABELS = { athlete: 'ورزشکار', coach: 'مربی', vip: 'VIP' };
const TYPE_CLASS  = { athlete: 'b-athlete', coach: 'b-coach', vip: 'b-vip' };

const PLAN_LABELS = { basic: 'پایه', standard: 'استاندارد', premium: 'پریمیوم' };
const PLAN_CLASS  = { basic: 'b-basic', standard: 'b-standard', premium: 'b-premium' };

// نوع اشتراک و مدت آن (ماه)
const SUB_LABELS  = { monthly: 'ماهانه', quarterly: 'سه‌ماهه', yearly: 'سالانه' };
const SUB_CLASS   = { monthly: 'b-basic', quarterly: 'b-standard', yearly: 'b-premium' };
const SUB_MONTHS  = { monthly: 1, quarterly: 3, yearly: 12 };

// وضعیت رنگی اشتراک بر اساس تاریخ انقضا
const STATUS_LABELS = { active: '🟢 فعال', soon: '🟡 نزدیک انقضا', expired: '🔴 منقضی', none: '—' };
const STATUS_CLASS  = { active: 'b-active', soon: 'b-soon', expired: 'b-expired', none: '' };
const NEAR_EXPIRY_DAYS = 7;

// رشته تخصصی مربیان
const SPECIALTY_LABELS = { bodybuilding: '🏋️ بدنسازی', crossfit: '🔥 کراسفیت', yoga: '🧘 یوگا' };

const AV_COLORS = ['av-o', 'av-c', 'av-g', 'av-p'];

let currentUser      = null;
let deleteTargetId   = null;
let deleteTargetType = 'member'; // 'member' یا 'workout' — تشخیص نوع آیتم مودال حذف

// ───────────────────────────────
// localStorage
// ───────────────────────────────
const getMembers      = ()  => JSON.parse(localStorage.getItem('gymMembers')          || '[]');
const saveMembers     = (m) => localStorage.setItem('gymMembers',          JSON.stringify(m));
const getRegUsers     = ()  => JSON.parse(localStorage.getItem('gymRegUsers')          || '[]');
const saveRegUsers    = (u) => localStorage.setItem('gymRegUsers',          JSON.stringify(u));

// ───────────────────────────────
// ورود / خروج
// ───────────────────────────────
// ── سوئیچ تب ورود / ثبت‌نام ──
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginFormWrap').style.display    = isLogin ? 'block' : 'none';
  document.getElementById('registerFormWrap').style.display = isLogin ? 'none'  : 'block';
  document.getElementById('tabBtnLogin').classList.toggle('active',    isLogin);
  document.getElementById('tabBtnRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('registerMsg').classList.add('hidden');
}

// ── ثبت‌نام ──
function register() {
  const name     = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  const role     = document.getElementById('regRole').value;
  const msgEl    = document.getElementById('registerMsg');

  if (!name)              { showMsg(msgEl, '⚠️ نام و نام خانوادگی الزامی است.', false);            return; }
  if (!username)          { showMsg(msgEl, '⚠️ نام کاربری الزامی است.', false);                    return; }
  if (username.length < 4){ showMsg(msgEl, '⚠️ نام کاربری باید حداقل ۴ کاراکتر باشد.', false);    return; }
  if (PERSIAN_RE.test(username)) { showMsg(msgEl, '⚠️ نام کاربری فقط با حروف انگلیسی مجاز است.', false); return; }
  if (password.length < 6){ showMsg(msgEl, '⚠️ رمز عبور باید حداقل ۶ کاراکتر باشد.', false);     return; }
  if (password !== confirm){ showMsg(msgEl, '⚠️ رمز عبور و تکرار آن یکسان نیستند.', false);       return; }

  // بررسی تکراری نبودن نام کاربری
  if (USERS[username])                                       { showMsg(msgEl, '⚠️ این نام کاربری قبلاً استفاده شده.', false); return; }
  if (getRegUsers().find(u => u.username === username))      { showMsg(msgEl, '⚠️ این نام کاربری قبلاً ثبت شده.', false);     return; }

  // ذخیره کاربر جدید
  const users = getRegUsers();
  users.push({ id: Date.now(), name, username, password, role, createdAt: new Date().toISOString() });
  saveRegUsers(users);

  showMsg(msgEl, '✅ ثبت‌نام موفق! در حال انتقال به صفحه ورود...', true);

  // بعد از ۱.۵ ثانیه به تب ورود برو و نام کاربری رو پر کن
  setTimeout(() => {
    switchAuthTab('login');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginRole').value     = role;
    document.getElementById('loginPassword').focus();
  }, 1500);
}

// ── ورود ──
function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const role     = document.getElementById('loginRole').value;
  const errEl    = document.getElementById('loginError');
  const card     = document.getElementById('loginCard');

  // بررسی کاربران پیش‌فرض
  let user = null;
  if (USERS[username] && USERS[username].password === password && USERS[username].role === role) {
    user = { username, ...USERS[username] };
  }
  // بررسی کاربران ثبت‌نام‌شده
  if (!user) {
    const found = getRegUsers().find(u => u.username === username && u.password === password && u.role === role);
    if (found) user = { username: found.username, password: found.password, role: found.role, name: found.name, memberId: found.memberId || null };
  }

  if (!user) {
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    errEl.classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
    setTimeout(() => card.classList.remove('shake'), 450);
    return;
  }

  errEl.classList.add('hidden');
  currentUser = user;

  // نوار بالا
  document.getElementById('userNameDisplay').textContent = currentUser.name;
  document.getElementById('userRoleDisplay').textContent = ROLE_LABELS[currentUser.role];
  const badge = document.getElementById('userRoleBadge');
  badge.textContent = ROLE_LABELS[currentUser.role];
  badge.className   = `role-chip ${ROLE_CLASS[currentUser.role]}`;

  // نمایش بخش مدیریت فقط برای admin
  document.getElementById('adminNavSection').classList.toggle('hidden', currentUser.role !== 'admin');

  // اعمال سایدبار و صفحه اولیه بر اساس نقش
  _applyRoleUI(currentUser.role);
  showPage('dashboardPage');

  if (currentUser.role === 'athlete') {
    renderAthleteDashboard();
    showSection('athleteDashboard', null);
  } else {
    showSection('overviewSection', document.querySelector('#navItemHome .nav-link'));
    updateDashboard();
    setTimeout(initRevenueChart, 100);
  }

  logActivity('login', `🔑 ${currentUser.name} وارد سیستم شد`, 'log-login');
  addNotification(`${currentUser.name} وارد سیستم شد`);
  updateNotifBadge();
}

// کنترل نمایش آیتم‌های سایدبار بر اساس نقش کاربر
function _applyRoleUI(role) {
  // همه nav-item‌های اصلی
  const all = ['navItemHome','navItemMembers','navItemCoaches','navItemPayment','navItemReports','navItemMgmt','navItemWorkout'];

  if (role === 'admin') {
    // admin: همه نمایان
    all.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
  } else if (role === 'coach') {
    // coach: فقط مربیان + برنامه تمرینی + مدیریت اعضا
    const show = new Set(['navItemCoaches','navItemWorkout','navItemMgmt']);
    all.forEach(id => document.getElementById(id)?.classList.toggle('hidden', !show.has(id)));
  } else {
    // athlete: همه آیتم‌های سایدبار مخفی
    all.forEach(id => document.getElementById(id)?.classList.add('hidden'));
  }
}

function logout() {
  if (currentUser) logActivity('logout', `🚪 ${currentUser.name} از سیستم خارج شد`, 'log-logout');
  currentUser = null;
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.add('hidden');
  showPage('loginPage');
}

// ───────────────────────────────
// ناوبری
// ───────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showSection(id, linkEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (id === 'overviewSection')   { updateDashboard(); initRevenueChart(); }
  if (id === 'membersSection')    renderTable(getMembers());
  if (id === 'memberMgmtSection') { renderMgList(); _toggleMgSpecialty(); }
  if (id === 'coachesSection')    renderCoaches();
  if (id === 'paymentSection')    { _populatePayMemberSel(); renderPayments(); }
  if (id === 'reportsSection')    initReportsCharts();
  if (id === 'adminSection')      { switchAdminTab('adminUsers', null); renderAdminUsers(); }
  if (id === 'workoutSection')    { _populateWpMemberSel(); _populateWpCoachSel(); renderWorkoutList(); }
  if (id === 'athleteDashboard')  renderAthleteDashboard();
}

// ───────────────────────────────
// داشبورد
// ───────────────────────────────
function updateDashboard() {
  const m = getMembers();
  const athletes = m.filter(x => x.type === 'athlete').length;
  const coaches  = m.filter(x => x.type === 'coach').length;
  const vips     = m.filter(x => x.type === 'vip').length;

  _animateStat('totalMembers', m.length);
  _animateStat('athleteCount', athletes);
  _animateStat('coachCount',   coaches);
  _animateStat('vipCount',     vips);

  const trend = document.getElementById('trendTotal');
  if (m.length > 0) {
    trend.textContent = `↑ ${m.length}`;
    trend.className   = 'stat-trend trend-up';
  } else {
    trend.textContent = '—';
    trend.className   = 'stat-trend trend-zero';
  }

  renderRecent(m.slice(0, 5));
  renderExpiringMembers();
}

// نمایش اعضایی که عضویت‌شان منقضی یا در شرف انقضاست (کمتر از ۷ روز)
function renderExpiringMembers() {
  const el = document.getElementById('expiringList');
  if (!el) return;

  const expiring = getMembers()
    .map(m => ({ ...m, days: daysUntilExpiry(m.expiryDate) }))
    .filter(m => m.days !== null && m.days <= NEAR_EXPIRY_DAYS)
    .sort((a, b) => a.days - b.days);

  if (!expiring.length) {
    el.innerHTML = '<div class="expiring-all-ok">✅ همه اعضا وضعیت عضویت فعال دارند</div>';
    return;
  }

  el.innerHTML = expiring.map(m => {
    const isExpired = m.days < 0;
    const dayLabel  = isExpired
      ? `منقضی شده (${Math.abs(m.days)} روز پیش)`
      : m.days === 0 ? 'امروز منقضی می‌شود' : `${m.days} روز مانده`;
    return `
    <div class="expiring-row">
      <div class="expiring-name">${m.name}</div>
      <div class="expiring-date">${formatDate(m.expiryDate)}</div>
      <div class="expiring-days ${isExpired ? 'is-expired' : 'is-soon'}">${dayLabel}</div>
      <span class="badge ${STATUS_CLASS[isExpired ? 'expired' : 'soon']}">${STATUS_LABELS[isExpired ? 'expired' : 'soon']}</span>
    </div>`;
  }).join('');
}

function _animateStat(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 700, step = 16, steps = duration / step;
  let frame = 0;
  clearInterval(el._timer);
  el._timer = setInterval(() => {
    frame++;
    const prog = 1 - Math.pow(1 - frame / steps, 3);
    el.textContent = Math.round(prog * target).toLocaleString('fa-IR');
    if (frame >= steps) { el.textContent = target.toLocaleString('fa-IR'); clearInterval(el._timer); }
  }, step);
}

function renderRecent(members) {
  const el = document.getElementById('recentMembers');
  if (!members.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><p>هنوز عضوی ثبت نشده</p></div>';
    return;
  }
  el.innerHTML = members.map((m, i) => `
    <div class="recent-row">
      <div class="avatar ${AV_COLORS[i % 4]}">${m.name.charAt(0)}</div>
      <div>
        <div class="rec-name">${m.name}</div>
        <div class="rec-phone">${m.phone}</div>
      </div>
      <span class="badge ${TYPE_CLASS[m.type]}">${TYPE_LABELS[m.type]}</span>
      <span class="rec-date">${formatDate(m.startDate)}</span>
    </div>
  `).join('');
}

function showMsg(el, text, ok) {
  el.textContent = text;
  el.className   = ok ? 'success-msg' : 'error-msg';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4500);
}

// ───────────────────────────────
// جدول اعضا
// ───────────────────────────────
function renderTable(members) {
  const tbody    = document.getElementById('membersTableBody');
  const empty    = document.getElementById('emptyState');
  const countLbl = document.getElementById('memberCountLabel');
  const canDel   = currentUser?.role !== 'athlete';

  countLbl.textContent = `${members.length} عضو`;

  if (!members.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = members.map((m, i) => `
    <tr>
      <td><div class="row-num">${i + 1}</div></td>
      <td>
        <div class="td-name">${m.name}</div>
        ${m.notes ? `<div class="td-note">${m.notes}</div>` : ''}
      </td>
      <td style="direction:ltr;text-align:right">${m.phone}</td>
      <td>${m.age || '—'}</td>
      <td><span class="badge ${TYPE_CLASS[m.type]}">${TYPE_LABELS[m.type]}</span></td>
      <td><span class="badge ${PLAN_CLASS[m.plan]}">${PLAN_LABELS[m.plan]}</span></td>
      <td>${formatDate(m.startDate)}</td>
      <td>
        ${canDel
          ? `<button class="btn-icon" onclick="openDeleteModal(${m.id})" title="حذف">🗑️</button>`
          : `<span style="color:var(--muted);font-size:12px">—</span>`}
      </td>
    </tr>
  `).join('');
}

function filterMembers() {
  const q    = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  let   m    = getMembers();
  if (type !== 'all') m = m.filter(x => x.type === type);
  if (q)              m = m.filter(x => x.name.toLowerCase().includes(q) || x.phone.includes(q));
  renderTable(m);
}

// ───────────────────────────────
// حذف عضو
// ───────────────────────────────
function openDeleteModal(id, type = 'member') {
  deleteTargetId   = id;
  deleteTargetType = type;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeModal() {
  deleteTargetId   = null;
  deleteTargetType = 'member';
  document.getElementById('deleteModal').classList.add('hidden');
}

function confirmDelete() {
  if (!deleteTargetId) return;

  if (deleteTargetType === 'workout') {
    const plans = getWorkoutPlans();
    const p = plans.find(x => x.id === deleteTargetId);
    saveWorkoutPlans(plans.filter(x => x.id !== deleteTargetId));
    if (p) logActivity('delete', `🗑️ برنامه تمرینی "${p.memberName}" حذف شد`, 'log-delete');
    closeModal();
    renderWorkoutList();
    return;
  }

  const m = getMembers().find(x => x.id === deleteTargetId);
  saveMembers(getMembers().filter(m => m.id !== deleteTargetId));
  if (m) logActivity('delete', `🗑️ عضو "${m.name}" حذف شد`, 'log-delete');
  closeModal();
  filterMembers();
  updateDashboard();
}

// کلیک بیرون مودال
document.getElementById('deleteModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

blockPersian('loginUsername',  'warnUsername');
blockPersian('loginPassword',  'warnPassword');
blockPersian('regUsername',    'warnRegUsername');
blockPersian('regPassword',    'warnRegPassword');

// ───────────────────────────────
// کمکی
// ───────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  // اگر تاریخ شمسی باشد (سال > ۱۳۰۰) همان‌طور نمایش بده
  const yr = parseInt(d);
  if (yr > 1300 && yr < 1600) return d;
  // میلادی → شمسی
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    const j = jalaali.toJalaali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    return `${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`;
  } catch { return d; }
}

function spToday() {
  const j = jalaali.toJalaali(...todayParts());
  return `${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`;
}

function todayParts() {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

// ─────────────────────────────────────────
// محاسبه انقضای اشتراک بر اساس تاریخ شمسی
// ─────────────────────────────────────────
function shamsiToJsDate(s) {
  const [jy, jm, jd] = String(s).split('/').map(Number);
  const g = jalaali.toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

function jsDateToShamsi(dt) {
  const j = jalaali.toJalaali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  return `${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`;
}

// تاریخ شمسی + چند ماه = تاریخ انقضا (با تبدیل به میلادی برای جمع زدن صحیح ماه)
function calcExpiry(startShamsi, subType) {
  if (!startShamsi) return '';
  const months = SUB_MONTHS[subType] || 1;
  const dt = shamsiToJsDate(startShamsi);
  dt.setMonth(dt.getMonth() + months);
  return jsDateToShamsi(dt);
}

// تعداد روز باقی‌مانده تا انقضا (منفی یعنی منقضی شده)
function daysUntilExpiry(expiryShamsi) {
  if (!expiryShamsi) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = shamsiToJsDate(expiryShamsi);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / 86400000);
}

// وضعیت رنگی عضو بر اساس تاریخ انقضا: فعال (سبز) / نزدیک انقضا (زرد) / منقضی (قرمز)
function getMemberStatus(m) {
  const days = daysUntilExpiry(m.expiryDate);
  if (days === null) return { key: 'none',    days };
  if (days < 0)               return { key: 'expired', days };
  if (days <= NEAR_EXPIRY_DAYS) return { key: 'soon',   days };
  return { key: 'active', days };
}

// ─────────────────────────────────────────
// SHAMSI DATE PICKER
// ─────────────────────────────────────────
const SP_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
                   'مهر','آبان','آذر','دی','بهمن','اسفند'];
const SP_WDAYS  = ['ش','ی','د','س','چ','پ','ج'];

// بازه‌ی سال‌های قابل انتخاب در تقویم: ۱۰ سال آینده تا ۱۰۰ سال قبل (نزولی برای انتخاب سریع‌تر تاریخ تولد و...)
const SP_CUR_JY = jalaali.toJalaali(...todayParts()).jy;
const SP_YEARS  = Array.from({ length: 110 }, (_, i) => SP_CUR_JY + 10 - i);

class ShamsiPicker {
  constructor(containerId, opts = {}) {
    this._el = document.getElementById(containerId);
    if (!this._el) return;
    const j   = jalaali.toJalaali(...todayParts());
    this._y   = j.jy;
    this._m   = j.jm;
    this._val = opts.today ? this._fmt(j.jy, j.jm, j.jd) : '';
    this._onChange = opts.onChange || null;
    this._render();
  }

  _fmt(y, m, d) {
    return `${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}`;
  }

  _render() {
    this._el.className = 'sp-wrap';
    this._el.innerHTML = `
      <div class="sp-row">
        <input class="sp-input" type="text" placeholder="انتخاب تاریخ شمسی" readonly
               value="${this._val}">
        <button class="sp-icon-btn" type="button">📅</button>
      </div>
      <div class="sp-popup hidden">
        <div class="sp-nav">
          <button class="sp-nb" data-a="pm" type="button" title="ماه قبل">‹</button>
          <div class="sp-dd sp-dd-month">
            <button class="sp-dd-btn" type="button"></button>
            <div class="sp-dd-list hidden">
              ${SP_MONTHS.map((mn, i) => `<span class="sp-dd-item" data-v="${i + 1}">${mn}</span>`).join('')}
            </div>
          </div>
          <div class="sp-dd sp-dd-year">
            <button class="sp-dd-btn" type="button"></button>
            <div class="sp-dd-list hidden">
              ${SP_YEARS.map(y => `<span class="sp-dd-item" data-v="${y}">${y}</span>`).join('')}
            </div>
          </div>
          <button class="sp-nb" data-a="nm" type="button" title="ماه بعد">›</button>
        </div>
        <div class="sp-wdays">${SP_WDAYS.map(w => `<span>${w}</span>`).join('')}</div>
        <div class="sp-days"></div>
      </div>`;

    this._inp  = this._el.querySelector('.sp-input');
    this._pop  = this._el.querySelector('.sp-popup');
    this._dbox = this._el.querySelector('.sp-days');

    // درآپ‌داون‌های سفارشی انتخاب مستقیم ماه و سال (به‌جای select بومی که فونت فارسی را درست رندر نمی‌کرد)
    this._ddMonthBtn  = this._el.querySelector('.sp-dd-month > .sp-dd-btn');
    this._ddMonthList = this._el.querySelector('.sp-dd-month > .sp-dd-list');
    this._ddYearBtn   = this._el.querySelector('.sp-dd-year > .sp-dd-btn');
    this._ddYearList  = this._el.querySelector('.sp-dd-year > .sp-dd-list');

    const toggle = e => { e.stopPropagation(); this._toggle(); };
    this._inp.addEventListener('click', toggle);
    this._el.querySelector('.sp-icon-btn').addEventListener('click', toggle);

    this._el.querySelectorAll('.sp-nb').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'pm') { if (--this._m < 1)  { this._m = 12; this._y--; } }
      if (a === 'nm') { if (++this._m > 12) { this._m = 1;  this._y++; } }
      this._fillDays();
    }));

    // باز/بسته کردن درآپ‌داون ماه و سال — انتخاب مستقیم بدون فشردن مکرر دکمه‌های قبلی/بعدی
    this._ddMonthBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._ddYearList.classList.add('hidden');
      this._ddYearBtn.classList.remove('open');
      this._ddMonthList.classList.toggle('hidden');
      this._ddMonthBtn.classList.toggle('open');
    });
    this._ddYearBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._ddMonthList.classList.add('hidden');
      this._ddMonthBtn.classList.remove('open');
      this._ddYearList.classList.toggle('hidden');
      this._ddYearBtn.classList.toggle('open');
      const active = this._ddYearList.querySelector('.sp-dd-item.active');
      if (active) active.scrollIntoView({ block: 'center' });
    });
    this._ddMonthList.querySelectorAll('.sp-dd-item').forEach(it => it.addEventListener('click', e => {
      e.stopPropagation();
      this._m = parseInt(it.dataset.v);
      this._closeDropdowns();
      this._fillDays();
    }));
    this._ddYearList.querySelectorAll('.sp-dd-item').forEach(it => it.addEventListener('click', e => {
      e.stopPropagation();
      this._y = parseInt(it.dataset.v);
      this._closeDropdowns();
      this._fillDays();
    }));
    this._ddMonthList.addEventListener('click', e => e.stopPropagation());
    this._ddYearList.addEventListener('click',  e => e.stopPropagation());

    document.addEventListener('click', () => { this._close(); this._closeDropdowns(); });
    this._fillDays();
  }

  _closeDropdowns() {
    this._ddMonthList.classList.add('hidden');
    this._ddYearList.classList.add('hidden');
    this._ddMonthBtn.classList.remove('open');
    this._ddYearBtn.classList.remove('open');
  }

  _fillDays() {
    this._ddMonthBtn.textContent = SP_MONTHS[this._m - 1];
    this._ddYearBtn.textContent  = this._y;
    this._ddMonthList.querySelectorAll('.sp-dd-item').forEach(it =>
      it.classList.toggle('active', parseInt(it.dataset.v) === this._m));
    this._ddYearList.querySelectorAll('.sp-dd-item').forEach(it =>
      it.classList.toggle('active', parseInt(it.dataset.v) === this._y));

    // ستون شروع: شنبه=0 … جمعه=6
    const g  = jalaali.toGregorian(this._y, this._m, 1);
    const fc = (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
    const dm = jalaali.jalaaliMonthLength(this._y, this._m);
    const tj = jalaali.toJalaali(...todayParts());

    let html = '<span></span>'.repeat(fc);
    for (let d = 1; d <= dm; d++) {
      const v   = this._fmt(this._y, this._m, d);
      const cls = ['sp-day',
        (d === tj.jd && this._m === tj.jm && this._y === tj.jy) ? 'sp-today' : '',
        v === this._val ? 'sp-sel' : ''
      ].filter(Boolean).join(' ');
      html += `<span class="${cls}" data-v="${v}">${d}</span>`;
    }
    this._dbox.innerHTML = html;

    this._dbox.querySelectorAll('.sp-day').forEach(s => s.addEventListener('click', e => {
      e.stopPropagation();
      this._val = s.dataset.v;
      this._inp.value = this._val;
      this._close();
      this._fillDays();
      if (this._onChange) this._onChange(this._val);
    }));
  }

  _toggle() {
    if (this._pop.classList.contains('hidden')) {
      document.querySelectorAll('.sp-popup').forEach(p => p.classList.add('hidden'));
      this._pop.classList.remove('hidden');
    } else {
      this._close();
    }
  }

  _close() { this._pop.classList.add('hidden'); }
  get()    { return this._val; }
  set(v)   { this._val = v || ''; if (this._inp) this._inp.value = this._val; }
  clear()  { this.set(''); }
}

// ─────────────────────────────────────────
// مدیریت اعضا — توابع
// ─────────────────────────────────────────
function switchTab(id, btn) {
  const parent = document.getElementById('memberMgmtSection');
  parent.querySelectorAll('.mgmt-panel').forEach(p => p.classList.remove('active'));
  parent.querySelectorAll('.mgmt-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'tabMgList')  renderMgList();
  if (id === 'tabProfile') profileSearchFn();
}

// ── ثبت‌نام ──
// نمایش/مخفی‌کردن فیلد رشته تخصصی و اعتبارنامه بر اساس نوع عضویت
function _toggleMgSpecialty() {
  const isCoach = document.getElementById('mgType').value === 'coach';
  document.getElementById('mgSpecialtyWrap').classList.toggle('hidden', !isCoach);
  _toggleMgCredentials();
}

// نمایش username/password فقط برای مربی و ورزشکار (نه VIP)
function _toggleMgCredentials() {
  const type = document.getElementById('mgType').value;
  const show = type === 'coach' || type === 'athlete';
  document.getElementById('mgUsernameWrap').classList.toggle('hidden', !show);
  document.getElementById('mgPasswordWrap').classList.toggle('hidden', !show);
}

function _toggleEmSpecialty() {
  const isCoach = document.getElementById('emType').value === 'coach';
  document.getElementById('emSpecialtyWrap').classList.toggle('hidden', !isCoach);
}

function mgRegister() {
  const name      = document.getElementById('mgName').value.trim();
  const phone     = document.getElementById('mgPhone').value.trim();
  const natId     = document.getElementById('mgNationalId').value.trim();
  const weight    = document.getElementById('mgWeight').value.trim();
  const height    = document.getElementById('mgHeight').value.trim();
  const birthDate = spMgBirth ? spMgBirth.get() : '';
  const type      = document.getElementById('mgType').value;
  const specialty = type === 'coach' ? document.getElementById('mgSpecialty').value : null;
  const plan      = document.getElementById('mgPlan').value;
  const subType   = document.getElementById('mgSubType').value;
  const startDate = spMgStart ? spMgStart.get() : '';
  const notes     = document.getElementById('mgNotes').value.trim();
  const photoFile = document.getElementById('mgPhotoFile').files[0];
  const msgEl     = document.getElementById('mgRegMsg');

  // خواندن username/password برای مربی و ورزشکار
  const needsCred = type === 'coach' || type === 'athlete';
  const username  = needsCred ? document.getElementById('mgUsername').value.trim() : null;
  const password  = needsCred ? document.getElementById('mgPassword').value : null;

  if (!name || !phone) { showMsg(msgEl, '⚠️ نام و شماره تماس الزامی هستند.', false); return; }
  if (!/^09\d{9}$/.test(phone)) { showMsg(msgEl, '⚠️ شماره تماس معتبر نیست.', false); return; }
  if (!startDate) { showMsg(msgEl, '⚠️ تاریخ شروع اشتراک را انتخاب کنید.', false); return; }

  // اعتبارسنجی اعتبارنامه برای مربی/ورزشکار
  if (needsCred) {
    if (!username || username.length < 4) { showMsg(msgEl, '⚠️ نام کاربری باید حداقل ۴ کاراکتر باشد.', false); return; }
    if (PERSIAN_RE.test(username))        { showMsg(msgEl, '⚠️ نام کاربری فقط با حروف انگلیسی مجاز است.', false); return; }
    if (!password || password.length < 6) { showMsg(msgEl, '⚠️ رمز عبور باید حداقل ۶ کاراکتر باشد.', false); return; }
    if (USERS[username] || getRegUsers().find(u => u.username === username)) {
      showMsg(msgEl, '⚠️ این نام کاربری قبلاً استفاده شده.', false); return;
    }
  }

  const finish = (photo) => {
    const memberId   = Date.now();
    const expiryDate = calcExpiry(startDate, subType);
    const members = getMembers();
    members.unshift({
      id: memberId, name, phone, type, specialty, plan, notes,
      weight: weight || null, height: height || null, nationalId: natId || null,
      birthDate: birthDate || null, photo: photo || null,
      subscriptionType: subType, startDate, expiryDate,
      addedAt: new Date().toISOString(),
    });
    saveMembers(members);

    // ذخیره اعتبارنامه در gymRegUsers با ربط به memberId
    if (needsCred) {
      const users = getRegUsers();
      users.push({ id: Date.now() + 1, name, username, password, role: type, memberId, createdAt: new Date().toISOString() });
      saveRegUsers(users);
    }

    mgClear();
    showMsg(msgEl, `✅ عضو "${name}" ثبت شد. تاریخ انقضای اشتراک: ${expiryDate}`, true);
    logActivity('add', `➕ عضو "${name}" از بخش مدیریت ثبت شد`, 'log-add');
    addNotification(`عضو جدید "${name}" ثبت شد`);
    updateDashboard();
  };

  if (photoFile) {
    const reader = new FileReader();
    reader.onload = e => finish(e.target.result);
    reader.readAsDataURL(photoFile);
  } else {
    finish(null);
  }
}

function mgClear() {
  ['mgName','mgPhone','mgNationalId','mgWeight','mgHeight','mgNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('mgType').value      = 'athlete';
  document.getElementById('mgSpecialty').value = 'bodybuilding';
  document.getElementById('mgUsername').value  = '';
  document.getElementById('mgPassword').value  = '';
  _toggleMgSpecialty();
  document.getElementById('mgPlan').value    = 'basic';
  document.getElementById('mgSubType').value = 'monthly';
  document.getElementById('mgPhotoFile').value = '';
  if (spMgStart) spMgStart.clear();
  if (spMgBirth) spMgBirth.clear();
  _resetMgPhotoPreview();
  updateMgExpiryPreview();
}

// پیش‌نمایش عکس پروفایل هنگام انتخاب فایل
function mgPhotoPreview(input) {
  const file = input.files[0];
  if (!file) { _resetMgPhotoPreview(); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('mgPhotoPreviewImg');
    img.src = e.target.result;
    img.classList.remove('hidden');
    document.getElementById('mgPhotoPreviewEmpty').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function _resetMgPhotoPreview() {
  const img = document.getElementById('mgPhotoPreviewImg');
  img.src = '';
  img.classList.add('hidden');
  document.getElementById('mgPhotoPreviewEmpty').classList.remove('hidden');
}

// نمایش زنده‌ی تاریخ انقضا با توجه به تاریخ شروع و نوع اشتراک
function updateMgExpiryPreview() {
  const el    = document.getElementById('mgExpiryPreview');
  const start = spMgStart ? spMgStart.get() : '';
  if (!start) { el.textContent = '— ابتدا تاریخ شروع را انتخاب کنید'; return; }
  const subType = document.getElementById('mgSubType').value;
  el.textContent = `📅 ${calcExpiry(start, subType)}`;
}

// ── لیست اعضا ──
function renderMgList() {
  const q      = (document.getElementById('mgListSearch').value || '').toLowerCase();
  const filter = document.getElementById('mgListFilter').value;
  let members  = getMembers();

  if (q)             members = members.filter(m => m.name.toLowerCase().includes(q) || m.phone.includes(q));
  if (filter !== 'all') members = members.filter(m => getMemberStatus(m).key === filter);

  const tbody    = document.getElementById('mgListTableBody');
  const empty    = document.getElementById('mgListEmpty');
  const countLbl = document.getElementById('mgListCountLabel');
  countLbl.textContent = `${members.length} عضو`;

  if (!members.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = members.map((m, i) => {
    const status = getMemberStatus(m);
    return `
    <tr>
      <td><div class="row-num">${i + 1}</div></td>
      <td><div class="td-name">${m.name}</div></td>
      <td style="direction:ltr;text-align:right">${m.phone}</td>
      <td><span class="badge ${SUB_CLASS[m.subscriptionType] || ''}">${SUB_LABELS[m.subscriptionType] || '—'}</span></td>
      <td>${formatDate(m.startDate)}</td>
      <td>${formatDate(m.expiryDate)}</td>
      <td><span class="badge ${STATUS_CLASS[status.key]}">${STATUS_LABELS[status.key]}</span></td>
      <td>
        <button class="btn-icon" onclick="openEditModal(${m.id})" title="ویرایش">✏️</button>
        <button class="btn-icon" onclick="openDeleteModal(${m.id})" title="حذف">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ── ویرایش عضو ──
let editTargetId = null;

function openEditModal(id) {
  const m = getMembers().find(x => x.id === id);
  if (!m) return;
  editTargetId = id;

  document.getElementById('emName').value       = m.name || '';
  document.getElementById('emPhone').value      = m.phone || '';
  document.getElementById('emNationalId').value = m.nationalId || '';
  document.getElementById('emWeight').value     = m.weight || '';
  document.getElementById('emHeight').value     = m.height || '';
  document.getElementById('emType').value       = m.type || 'athlete';
  document.getElementById('emSpecialty').value  = m.specialty || 'bodybuilding';
  _toggleEmSpecialty();
  document.getElementById('emPlan').value       = m.plan || 'basic';
  document.getElementById('emSubType').value    = m.subscriptionType || 'monthly';
  if (spEmStart) spEmStart.set(m.startDate || '');
  updateEmExpiryPreview();

  document.getElementById('editMemberModal').classList.remove('hidden');
}

function closeEditModal() {
  editTargetId = null;
  document.getElementById('editMemberModal').classList.add('hidden');
}

function updateEmExpiryPreview() {
  const el    = document.getElementById('emExpiryPreview');
  const start = spEmStart ? spEmStart.get() : '';
  if (!start) { el.textContent = '—'; return; }
  const subType = document.getElementById('emSubType').value;
  el.textContent = `📅 ${calcExpiry(start, subType)}`;
}

function saveEditMember() {
  if (!editTargetId) return;
  const name  = document.getElementById('emName').value.trim();
  const phone = document.getElementById('emPhone').value.trim();
  if (!name || !phone)            { alert('⚠️ نام و شماره تماس الزامی هستند.'); return; }
  if (!/^09\d{9}$/.test(phone))   { alert('⚠️ شماره تماس معتبر نیست.'); return; }

  const members = getMembers();
  const m = members.find(x => x.id === editTargetId);
  if (!m) return;

  m.name             = name;
  m.phone            = phone;
  m.nationalId       = document.getElementById('emNationalId').value.trim() || null;
  m.weight           = document.getElementById('emWeight').value.trim() || null;
  m.height           = document.getElementById('emHeight').value.trim() || null;
  m.type             = document.getElementById('emType').value;
  m.specialty        = m.type === 'coach' ? document.getElementById('emSpecialty').value : null;
  m.plan             = document.getElementById('emPlan').value;
  m.subscriptionType = document.getElementById('emSubType').value;
  m.startDate        = (spEmStart && spEmStart.get()) || m.startDate;
  m.expiryDate       = calcExpiry(m.startDate, m.subscriptionType);

  saveMembers(members);
  logActivity('edit', `✏️ اطلاعات عضو "${m.name}" ویرایش شد`, 'log-edit');
  closeEditModal();
  renderMgList();
  updateDashboard();
}

// کلیک بیرون مودال ویرایش
document.getElementById('editMemberModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEditModal();
});

// ── پروفایل ──
function profileSearchFn() {
  const q = (document.getElementById('profileSearch').value || '').toLowerCase();
  const list = getMembers().filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.phone.includes(q)
  );
  _renderProfileList(list);
}

function _renderProfileList(members) {
  const el = document.getElementById('profileList');
  document.getElementById('profileDetail').classList.add('hidden');
  if (!members.length) {
    el.innerHTML = '<div class="history-empty">عضوی یافت نشد</div>';
    return;
  }
  el.innerHTML = members.map((m, i) => `
    <div class="profile-card" onclick="showProfileDetail(${m.id})">
      <div class="pc-avatar ${AV_COLORS[i % 4]}">${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : m.name.charAt(0)}</div>
      <div class="pc-name">${m.name}</div>
      <div class="pc-phone">${m.phone}</div>
      <span class="badge ${TYPE_CLASS[m.type] || ''}">${TYPE_LABELS[m.type] || m.type}</span>
    </div>`).join('');
}

function showProfileDetail(id) {
  const m = getMembers().find(x => x.id === id);
  if (!m) return;
  document.getElementById('profileList').innerHTML = '';
  const det = document.getElementById('profileDetail');
  det.classList.remove('hidden');

  const status   = getMemberStatus(m);
  const payments = getPayments().filter(p => String(p.memberId) === String(m.id));

  det.innerHTML = `
    <div class="pd-back">
      <button class="btn btn-ghost btn-sm" onclick="profileSearchFn()">← بازگشت</button>
    </div>
    <div class="pd-header">
      <div class="pd-avatar ${AV_COLORS[0]}">${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : m.name.charAt(0)}</div>
      <div class="pd-info">
        <h3>${m.name}</h3>
        <p>${m.phone} &nbsp;·&nbsp;
           <span class="badge ${TYPE_CLASS[m.type]||''}">${TYPE_LABELS[m.type]||m.type}</span>
           &nbsp;·&nbsp;
           <span class="badge ${STATUS_CLASS[status.key]}">${STATUS_LABELS[status.key]}</span></p>
      </div>
    </div>
    <div class="pd-grid">
      <div class="pd-item"><label>کد ملی</label><span>${m.nationalId || '—'}</span></div>
      <div class="pd-item"><label>تاریخ تولد</label><span>${formatDate(m.birthDate)}</span></div>
      <div class="pd-item"><label>وزن</label><span>${m.weight ? m.weight + ' کیلوگرم' : '—'}</span></div>
      <div class="pd-item"><label>قد</label><span>${m.height ? m.height + ' سانتی‌متر' : '—'}</span></div>
      <div class="pd-item"><label>پلن تمرینی</label><span>${PLAN_LABELS[m.plan] || m.plan || '—'}</span></div>
      <div class="pd-item"><label>نوع اشتراک</label><span>${SUB_LABELS[m.subscriptionType] || '—'}</span></div>
      <div class="pd-item"><label>تاریخ شروع</label><span>${formatDate(m.startDate)}</span></div>
      <div class="pd-item"><label>تاریخ انقضا</label><span>${formatDate(m.expiryDate)}</span></div>
      ${m.notes ? `<div class="pd-item" style="grid-column:1/-1"><label>یادداشت</label><span>${m.notes}</span></div>` : ''}
    </div>

    <div class="form-actions" style="margin-bottom:24px">
      <button class="btn btn-primary" onclick="renewSubscription(${m.id})">🔄 تمدید اشتراک</button>
    </div>

    <div class="pd-section-title">💳 تاریخچه پرداخت‌ها</div>
    ${payments.length
      ? payments.map(p => `
        <div class="history-item">
          <div class="hi-icon hi-payment">💰</div>
          <div>
            <div class="hi-desc">${(p.amount || 0).toLocaleString('fa-IR')} تومان —
              <span class="badge ${PAY_TYPE_CLASS[p.type]||''}">${PAY_TYPE_LABELS[p.type]||p.type}</span></div>
            <div class="hi-date">${formatDate(p.date)}${p.desc ? ' · ' + p.desc : ''}</div>
          </div>
        </div>`).join('')
      : '<div class="history-empty">پرداختی برای این عضو ثبت نشده است</div>'}
  `;
}

// تمدید اشتراک عضو با توجه به نوع اشتراک فعلی او
function renewSubscription(id) {
  const members = getMembers();
  const m = members.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`اشتراک "${m.name}" تمدید شود؟`)) return;

  const status = getMemberStatus(m);
  const base   = (status.key === 'expired' || !m.expiryDate) ? spToday() : m.expiryDate;
  m.expiryDate = calcExpiry(base, m.subscriptionType || 'monthly');
  saveMembers(members);
  logActivity('edit', `🔄 اشتراک "${m.name}" تا تاریخ ${m.expiryDate} تمدید شد`, 'log-edit');
  addNotification(`اشتراک "${m.name}" تمدید شد`);
  showProfileDetail(id);
  renderMgList();
  updateDashboard();
}

// ─────────────────────────────────────────
// راه‌اندازی Date Picker‌ها
// ─────────────────────────────────────────
let spMgStart, spMgBirth, spEmStart, spPayDate, spWpStart, spWpEnd, spEwStart, spEwEnd;

function initPickers() {
  spMgStart     = new ShamsiPicker('mgStartDate', { onChange: updateMgExpiryPreview });
  spMgBirth     = new ShamsiPicker('mgBirthDate');
  spEmStart     = new ShamsiPicker('emStartDate', { onChange: updateEmExpiryPreview });
  spPayDate     = new ShamsiPicker('payDate', { today: true });
  spWpStart     = new ShamsiPicker('wpStartDate');
  spWpEnd       = new ShamsiPicker('wpEndDate');
  spEwStart     = new ShamsiPicker('ewStartDate');
  spEwEnd       = new ShamsiPicker('ewEndDate');
}

// ───────────────────────────────
// Service Modal — داده‌های هر ورزش
// ───────────────────────────────
const SERVICE_DATA = {
  bodybuilding: {
    icon: '🏋️',
    iconClass: 'lp-si-1',
    title: 'بدنسازی',
    tagline: 'قدرت، حجم، فرم — سه هدف یک مسیر',
    desc: 'بدنسازی علم و هنر ساختن بدن ایده‌آل با استفاده از تمرینات مقاومتی است. با برنامه‌ریزی دقیق و تغذیه صحیح، می‌توانید حجم عضلانی، قدرت و فرم بدنی خود را به‌طور همزمان بهبود دهید. در IronZone هر برنامه متناسب با هدف و سطح شما طراحی می‌شود.',
    benefits: [
      'افزایش حجم و قدرت عضلانی',
      'تسریع متابولیسم و چربی‌سوزی',
      'بهبود تراکم استخوان‌ها',
      'افزایش اعتماد به نفس و ظاهر',
      'کاهش خطر آسیب‌های ورزشی',
      'بهبود وضعیت قامتی بدن',
    ],
    whoFor: [
      'مبتدیانی که می‌خواهند ورزش را شروع کنند',
      'افرادی که دنبال تغییر فرم بدن هستند',
      'ورزشکارانی که می‌خواهند قدرت افزایش دهند',
      'کسانی که به دنبال کاهش وزن اصولی هستند',
    ],
    stats: [
      { value: '۳×', label: 'جلسه در هفته' },
      { value: '۶۰', label: 'دقیقه هر جلسه' },
      { value: '۳', label: 'پلن موجود' },
    ],
  },
  crossfit: {
    icon: '🔥',
    iconClass: 'lp-si-2',
    title: 'کراسفیت',
    tagline: 'تمرین سخت، نتیجه واقعی',
    desc: 'کراسفیت یک سیستم تمرینی چندوجهی است که ترکیبی از وزنه‌برداری المپیک، ژیمناستیک و تمرینات هوازی با شدت بالاست. هر روز یک برنامه جدید (WOD) دارید که هرگز تکراری نیست. این تنوع باعث می‌شود بدن به رکود نرسد و همیشه در حال پیشرفت باشد.',
    benefits: [
      'چربی‌سوزی شدید با تمرینات HIIT',
      'افزایش استقامت قلبی و عروقی',
      'تقویت هماهنگی و چابکی',
      'روحیه تیمی و انگیزه گروهی',
      'تنوع روزانه — هرگز یکنواخت نمی‌شه',
      'کالری‌سوزی حتی بعد از تمرین',
    ],
    whoFor: [
      'افراد فعالی که دنبال چالش جدید هستند',
      'کسانی که از تمرین یکنواخت خسته شده‌اند',
      'افرادی که می‌خواهند سریع نتیجه بگیرند',
      'ورزشکارانی که می‌خواهند آمادگی کلی داشته باشند',
    ],
    stats: [
      { value: '۵×', label: 'جلسه در هفته' },
      { value: '۴۵', label: 'دقیقه هر جلسه' },
      { value: '۸۰۰+', label: 'کالری در جلسه' },
    ],
  },
  yoga: {
    icon: '🧘',
    iconClass: 'lp-si-3',
    title: 'یوگا',
    tagline: 'آرامش ذهن، انعطاف بدن، تعادل زندگی',
    desc: 'یوگا یک سیستم تمرینی هزاران ساله است که ذهن، بدن و روح را به هم پیوند می‌دهد. از طریق آساناها (پوزها)، تنفس و مدیتیشن، می‌توانید استرس روزمره را کنار بگذارید و به آرامش عمیقی برسید. یوگا برای هر سنی و هر سطحی مناسب است.',
    benefits: [
      'افزایش انعطاف‌پذیری و دامنه حرکتی',
      'کاهش استرس و اضطراب روزمره',
      'بهبود تعادل و هماهنگی بدن',
      'تقویت عضلات مرکزی (core)',
      'بهبود کیفیت خواب',
      'آرامش ذهنی و تمرکز بیشتر',
    ],
    whoFor: [
      'افراد پر استرس که دنبال آرامش هستند',
      'کسانی که می‌خواهند انعطاف بدنشان را افزایش دهند',
      'بانوان در هر سن و سطحی',
      'ورزشکارانی که برای ریکاوری یوگا می‌خواهند',
    ],
    stats: [
      { value: '۳×', label: 'جلسه در هفته' },
      { value: '۶۰', label: 'دقیقه هر جلسه' },
      { value: '۱۲', label: 'نوع کلاس' },
    ],
  },
};

function openServiceModal(type) {
  const data = SERVICE_DATA[type];
  if (!data) return;

  document.getElementById('svcIcon').textContent = data.icon;
  document.getElementById('svcIcon').className   = `svc-modal-icon ${data.iconClass}`;
  document.getElementById('svcTitle').textContent   = data.title;
  document.getElementById('svcTagline').textContent = data.tagline;
  document.getElementById('svcDesc').textContent    = data.desc;

  document.getElementById('svcBenefits').innerHTML =
    data.benefits.map(b => `<li>${b}</li>`).join('');
  document.getElementById('svcWhoFor').innerHTML =
    data.whoFor.map(w => `<li>${w}</li>`).join('');
  document.getElementById('svcStats').innerHTML =
    data.stats.map(s => `
      <div class="svc-stat-box">
        <strong>${s.value}</strong>
        <span>${s.label}</span>
      </div>`).join('');

  document.getElementById('serviceModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeServiceModal() {
  document.getElementById('serviceModal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ───────────────────────────────
// Landing Page
// ───────────────────────────────
function showLogin() {
  showPage('loginPage');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function initLanding() {
  // Navbar: تغییر استایل هنگام اسکرول
  const nav = document.getElementById('lpMainNav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (document.getElementById('landingPage').classList.contains('active')) {
      nav.classList.toggle('lp-nav-scrolled', window.scrollY > 60);
    }
  }, { passive: true });

  // Scroll Reveal
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  // Counter Animation
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.lp-counter').forEach(animateLpCounter);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });

  const statsSec = document.querySelector('.lp-stats-sec');
  if (statsSec) counterObs.observe(statsSec);

  // Smooth scroll برای anchor لینک‌های لندینگ
  document.querySelectorAll('#landingPage a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function animateLpCounter(el) {
  const target = parseInt(el.getAttribute('data-target'));
  const duration = 1800;
  const step = 16;
  const totalSteps = duration / step;
  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    const progress = 1 - Math.pow(1 - frame / totalSteps, 3);
    el.textContent = Math.round(progress * target).toLocaleString('fa-IR');
    if (frame >= totalSteps) {
      el.textContent = target.toLocaleString('fa-IR');
      clearInterval(timer);
    }
  }, step);
}

document.addEventListener('DOMContentLoaded', () => {
  initPickers();
  initLanding();
  renderLandingCoaches();
  wpAddExerciseRow();
});

// ═══════════════════════════════════════════
// اعلان‌ها
// ═══════════════════════════════════════════
const getNotifs   = () => JSON.parse(localStorage.getItem('gymNotifs') || '[]');
const saveNotifs  = n  => localStorage.setItem('gymNotifs', JSON.stringify(n));

function addNotification(text) {
  const notifs = getNotifs();
  notifs.unshift({ id: Date.now(), text, time: new Date().toISOString(), read: false });
  saveNotifs(notifs.slice(0, 20));
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = getNotifs().filter(n => !n.read).length;
  const badge  = document.getElementById('notifBadge');
  if (!badge) return;
  badge.textContent = unread;
  badge.classList.toggle('hidden', unread === 0);
}

function toggleNotifications() {
  const dd = document.getElementById('notifDropdown');
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) renderNotifList();
  document.addEventListener('click', closeNotifOutside, { once: true });
}

function closeNotifOutside(e) {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('notifDropdown')?.classList.add('hidden');
  }
}

function renderNotifList() {
  const notifs = getNotifs();
  const el = document.getElementById('notifList');
  if (!el) return;
  if (!notifs.length) {
    el.innerHTML = '<div class="notif-empty">اعلانی وجود ندارد</div>';
    return;
  }
  const marked = notifs.map(n => ({ ...n, read: true }));
  saveNotifs(marked);
  updateNotifBadge();
  el.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <div class="notif-dot"></div>
      <div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${_timeAgo(n.time)}</div>
      </div>
    </div>`).join('');
}

function clearNotifications() {
  saveNotifs([]);
  updateNotifBadge();
  document.getElementById('notifList').innerHTML = '<div class="notif-empty">اعلانی وجود ندارد</div>';
}

function _timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1)  return 'همین الان';
  if (diff < 60) return `${diff} دقیقه پیش`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h} ساعت پیش`;
  return `${Math.floor(h / 24)} روز پیش`;
}

// ═══════════════════════════════════════════
// نمودار درآمد ماهانه
// ═══════════════════════════════════════════
const PLAN_PRICES = { basic: 500000, standard: 800000, premium: 1200000 };
let _revenueChartInst = null;

function initRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  const members = getMembers();
  const payments = getPayments();
  const now = new Date();
  const labels = [];
  const data   = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const jm = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, 1);
    labels.push(`${SP_MONTHS[jm.jm - 1]}`);

    // درآمد از پرداخت‌های ثبت‌شده در آن ماه
    let rev = payments
      .filter(p => {
        if (!p.date) return false;
        const py = parseInt(p.date.split('/')[0]);
        const pm = parseInt(p.date.split('/')[1]);
        return py === jm.jy && pm === jm.jm;
      })
      .reduce((s, p) => s + (parseInt(p.amount) || 0), 0);

    // برای ماه جاری اعضا بدون پرداخت ثبت‌شده هم حساب می‌شن
    if (i === 0 && rev === 0) {
      rev = members.reduce((s, m) => s + (PLAN_PRICES[m.plan] || 500000), 0);
    }
    data.push(rev);
  }

  if (_revenueChartInst) _revenueChartInst.destroy();

  _revenueChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'درآمد (تومان)',
        data,
        borderColor: '#FF6B35',
        backgroundColor: 'rgba(255,107,53,0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: '#FF6B35',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y.toLocaleString('fa-IR')} تومان`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8b95a8', font: { family: 'Vazir', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#8b95a8',
            font: { family: 'Vazir', size: 11 },
            callback: v => (v / 1000000).toFixed(1) + 'M'
          }
        }
      }
    }
  });
}

// ═══════════════════════════════════════════
// نمودارهای گزارشات
// ═══════════════════════════════════════════
let _memberTypeInst = null, _planTypeInst = null, _annualInst = null;

function initReportsCharts() {
  const members = getMembers();
  _buildDoughnut('memberTypeChart', _memberTypeInst,
    ['ورزشکار', 'مربی', 'VIP'],
    [members.filter(m => m.type === 'athlete').length,
     members.filter(m => m.type === 'coach').length,
     members.filter(m => m.type === 'vip').length],
    ['rgba(249,115,22,0.8)', 'rgba(6,182,212,0.8)', 'rgba(168,85,247,0.8)'],
    i => _memberTypeInst = i);

  _buildDoughnut('planTypeChart', _planTypeInst,
    ['پایه', 'استاندارد', 'پریمیوم'],
    [members.filter(m => m.plan === 'basic').length,
     members.filter(m => m.plan === 'standard').length,
     members.filter(m => m.plan === 'premium').length],
    ['rgba(107,114,128,0.8)', 'rgba(34,197,94,0.8)', 'rgba(250,204,20,0.8)'],
    i => _planTypeInst = i);

  _buildAnnualChart();
}

function _buildDoughnut(id, existingInst, labels, data, colors, setInst) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (existingInst) existingInst.destroy();
  const inst = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8b95a8', font: { family: 'Vazir', size: 12 }, padding: 16 }
        }
      }
    }
  });
  setInst(inst);
}

function _buildAnnualChart() {
  const canvas = document.getElementById('annualRevenueChart');
  if (!canvas) return;
  if (_annualInst) _annualInst.destroy();

  const members  = getMembers();
  const payments = getPayments();
  const now = new Date();
  const labels = [], data = [];

  for (let i = 11; i >= 0; i--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const jm = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, 1);
    labels.push(`${SP_MONTHS[jm.jm - 1]}`);
    let rev = payments.filter(p => {
      if (!p.date) return false;
      return parseInt(p.date.split('/')[0]) === jm.jy && parseInt(p.date.split('/')[1]) === jm.jm;
    }).reduce((s, p) => s + (parseInt(p.amount) || 0), 0);
    if (i === 0 && rev === 0)
      rev = members.reduce((s, m) => s + (PLAN_PRICES[m.plan] || 500000), 0);
    data.push(rev);
  }

  _annualInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'درآمد',
        data,
        backgroundColor: 'rgba(255,107,53,0.6)',
        borderColor: '#FF6B35',
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b95a8', font: { family: 'Vazir', size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b95a8', font: { family: 'Vazir', size: 11 }, callback: v => (v / 1000000).toFixed(1) + 'M' } }
      }
    }
  });
}

// ═══════════════════════════════════════════
// مربیان
// ═══════════════════════════════════════════
let coachSpecialtyFilter = null;

// باز/بسته‌کردن زیرمنوی رشته‌های مربیان در سایدبار
function toggleCoachesSubmenu(e, linkEl) {
  e.preventDefault();
  linkEl.classList.toggle('submenu-open');
  document.getElementById('coachesSubmenu').classList.toggle('open');
}

// فیلتر مربیان بر اساس رشته تخصصی از طریق زیرمنوی سایدبار
function filterCoachesBySpecialty(specialty, linkEl) {
  coachSpecialtyFilter = specialty;
  document.querySelectorAll('.nav-sublink').forEach(l => l.classList.remove('active'));
  linkEl.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  showSection('coachesSection', null);
}

// نمایش برترین مربی هر رشته در صفحه اصلی (بر اساس بیشترین برنامه تمرینی در ۳ ماه اخیر)
function renderLandingCoaches() {
  const grid = document.getElementById('lpCoachesGrid');
  if (!grid) return;

  const coaches = getMembers().filter(m => m.type === 'coach');
  const plans   = getWorkoutPlans();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const specialties = Object.keys(SPECIALTY_LABELS);
  grid.innerHTML = specialties.map((sp, i) => {
    const spCoaches = coaches.filter(c => c.specialty === sp);
    let topCoach = null, topCount = -1;
    spCoaches.forEach(c => {
      const count = plans.filter(p =>
        p.coachId === c.id && new Date(p.addedAt) >= threeMonthsAgo
      ).length;
      if (count > topCount) { topCount = count; topCoach = c; }
    });

    if (!topCoach) {
      return `
      <div class="lp-coach-card lp-coach-placeholder reveal visible delay-${i + 1}">
        <div class="lp-coach-av-wrap">
          <div class="lp-coach-av">?</div>
          <span class="lp-coach-badge">${SPECIALTY_LABELS[sp].replace(/^\S+\s/, '')}</span>
          <span class="lp-coach-placeholder-text">به زودی</span>
        </div>
        <div class="lp-coach-info">
          <h3>به زودی</h3>
          <p>مربی این رشته به‌زودی معرفی می‌شود</p>
        </div>
      </div>`;
    }

    return `
    <div class="lp-coach-card reveal visible delay-${i + 1}">
      <div class="lp-coach-av-wrap">
        <div class="lp-coach-av">${topCoach.name.charAt(0)}</div>
        <span class="lp-coach-badge">${SPECIALTY_LABELS[sp].replace(/^\S+\s/, '')}</span>
      </div>
      <div class="lp-coach-info">
        <h3>${topCoach.name}</h3>
        <p>مربی برتر — ${SPECIALTY_LABELS[sp]}</p>
        <div class="lp-coach-stats">
          <div><strong>${topCount}</strong><span>برنامه تمرینی (۳ ماه اخیر)</span></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderCoaches() {
  let coaches = getMembers().filter(m => m.type === 'coach');
  if (coachSpecialtyFilter) coaches = coaches.filter(m => m.specialty === coachSpecialtyFilter);
  const grid  = document.getElementById('coachesGrid');
  const empty = document.getElementById('coachesEmpty');
  const lbl   = document.getElementById('coachCountLabel');
  if (!grid) return;

  lbl.textContent = `${coaches.length} مربی` + (coachSpecialtyFilter ? ` — ${SPECIALTY_LABELS[coachSpecialtyFilter]}` : '');
  if (!coaches.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = coaches.map((m, i) => `
    <div class="coach-card">
      <div class="coach-av">${m.name.charAt(0)}</div>
      <div>
        <div class="coach-name">${m.name}</div>
        <div class="coach-phone">${m.phone}</div>
        <div class="coach-plan">
          <span class="badge b-coach">مربی</span>
          ${m.specialty ? `<span class="badge b-basic" style="margin-right:6px">${SPECIALTY_LABELS[m.specialty]}</span>` : ''}
          <span class="badge ${PLAN_CLASS[m.plan] || 'b-basic'}" style="margin-right:6px">${PLAN_LABELS[m.plan] || m.plan}</span>
        </div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════
// پرداخت
// ═══════════════════════════════════════════
const getPayments   = () => JSON.parse(localStorage.getItem('gymPayments') || '[]');
const savePayments  = p  => localStorage.setItem('gymPayments', JSON.stringify(p));

const PAY_TYPE_LABELS = { subscription: '💎 اشتراک', session: '🏋️ جلسه‌ای', other: '📝 سایر' };
const PAY_TYPE_CLASS  = { subscription: 'pay-type-subscription', session: 'pay-type-session', other: 'pay-type-other' };

function _populatePayMemberSel() {
  const sel = document.getElementById('payMemberSel');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- انتخاب عضو --</option>' +
    getMembers().map(m => `<option value="${m.id}">${m.name} — ${m.phone}</option>`).join('');
}

function addPayment() {
  const mid    = document.getElementById('payMemberSel').value;
  const amount = document.getElementById('payAmount').value.trim();
  const date   = spPayDate ? spPayDate.get() : '';
  const type   = document.getElementById('payType').value;
  const desc   = document.getElementById('payDesc').value.trim();
  const msgEl  = document.getElementById('payMsg');

  if (!mid)    { showMsg(msgEl, '⚠️ یک عضو انتخاب کنید.', false); return; }
  if (!amount) { showMsg(msgEl, '⚠️ مبلغ را وارد کنید.', false); return; }

  const member = getMembers().find(m => String(m.id) === String(mid));
  const payments = getPayments();
  payments.unshift({ id: Date.now(), memberId: parseInt(mid), memberName: member?.name || '', amount: parseInt(amount), type, date: date || spToday(), desc });
  savePayments(payments);
  logActivity('payment', `💳 پرداخت ${parseInt(amount).toLocaleString('fa-IR')} تومان از "${member?.name}" ثبت شد`, 'log-payment');
  addNotification(`پرداخت ${parseInt(amount).toLocaleString('fa-IR')} تومان از "${member?.name}" ثبت شد`);
  document.getElementById('payAmount').value = '';
  document.getElementById('payDesc').value = '';
  showMsg(msgEl, '✅ پرداخت با موفقیت ثبت شد.', true);
  renderPayments();
}

function renderPayments() {
  const tbody = document.getElementById('paymentTableBody');
  const empty = document.getElementById('paymentEmpty');
  const payments = getPayments();
  if (!tbody) return;
  if (!payments.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = payments.map((p, i) => `
    <tr>
      <td><div class="row-num">${i + 1}</div></td>
      <td><div class="td-name">${p.memberName}</div></td>
      <td style="color:var(--accent);font-weight:700">${(p.amount || 0).toLocaleString('fa-IR')}</td>
      <td><span class="badge ${PAY_TYPE_CLASS[p.type] || ''}">${PAY_TYPE_LABELS[p.type] || p.type}</span></td>
      <td>${formatDate(p.date)}</td>
      <td style="color:var(--muted);font-size:13px">${p.desc || '—'}</td>
      <td>
        <button class="btn-icon" onclick="deletePayment(${p.id})" title="حذف">🗑️</button>
      </td>
    </tr>`).join('');
}

function deletePayment(id) {
  if (!confirm('این پرداخت حذف شود؟')) return;
  savePayments(getPayments().filter(p => p.id !== id));
  renderPayments();
}

// ═══════════════════════════════════════════
// مدیریت سیستم (admin)
// ═══════════════════════════════════════════
function switchAdminTab(id, btn) {
  const parent = document.getElementById('adminSection');
  parent.querySelectorAll('.mgmt-panel').forEach(p => p.classList.remove('active'));
  parent.querySelectorAll('.mgmt-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'adminUsers')       renderAdminUsers();
  if (id === 'adminCredentials') renderAdminCredentials();
  if (id === 'adminGym')         loadGymSettings();
  if (id === 'adminPlans')       renderPlans();
  if (id === 'adminLog')         renderActivityLog();
}

// ─ کاربران ─
function renderAdminUsers() {
  const el = document.getElementById('adminUsersList');
  if (!el) return;

  const defaultUsers = Object.entries(USERS).map(([username, u]) => ({
    username, name: u.name, role: u.role, isDefault: true
  }));
  const regUsers = getRegUsers().map(u => ({ ...u, isDefault: false }));
  const all = [...defaultUsers, ...regUsers];

  el.innerHTML = all.map(u => `
    <div class="admin-user-row">
      <div class="au-avatar ${u.role === 'admin' ? 'av-o' : u.role === 'coach' ? 'av-c' : 'av-g'}">
        ${u.name.charAt(0)}
      </div>
      <div>
        <div class="au-name">${u.name}</div>
        <div class="au-username">@${u.username}</div>
      </div>
      <span class="badge ${TYPE_CLASS[u.role] || ''}">${ROLE_LABELS[u.role] || u.role}</span>
      <div class="au-actions">
        ${!u.isDefault ? `
          <select class="au-role-sel" onchange="changeUserRole('${u.username}', this.value)">
            <option value="admin"   ${u.role === 'admin'   ? 'selected' : ''}>مدیر</option>
            <option value="coach"   ${u.role === 'coach'   ? 'selected' : ''}>مربی</option>
            <option value="athlete" ${u.role === 'athlete' ? 'selected' : ''}>ورزشکار</option>
          </select>
          <button class="btn-icon" onclick="deleteUser('${u.username}')" title="حذف">🗑️</button>
        ` : `<span style="font-size:11px;color:var(--muted);padding:6px 10px;background:rgba(255,255,255,0.04);border-radius:6px">پیش‌فرض</span>`}
      </div>
    </div>`).join('');
}

// نمایش لیست اعتبارنامه‌های مربیان و ورزشکاران (فقط برای admin)
function renderAdminCredentials() {
  const el = document.getElementById('adminCredentialsList');
  if (!el) return;

  // join بین gymRegUsers و gymMembers بر اساس memberId
  const regUsers = getRegUsers().filter(u => u.role === 'coach' || u.role === 'athlete');
  if (!regUsers.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔑</div><p>هنوز اعتبارنامه‌ای ثبت نشده</p></div>';
    return;
  }

  el.innerHTML = regUsers.map(u => `
    <div class="cred-row">
      <div class="au-avatar ${u.role === 'coach' ? 'av-c' : 'av-g'}">${u.name.charAt(0)}</div>
      <div class="cred-info">
        <div class="cred-name">${u.name}</div>
        <div class="cred-user">👤 ${u.username}</div>
        <div class="cred-pass">🔑 ${u.password}</div>
      </div>
      <span class="badge ${TYPE_CLASS[u.role] || ''}">${ROLE_LABELS[u.role] || u.role}</span>
    </div>`).join('');
}

function changeUserRole(username, newRole) {
  const users = getRegUsers();
  const idx = users.findIndex(u => u.username === username);
  if (idx === -1) return;
  users[idx].role = newRole;
  saveRegUsers(users);
  logActivity('edit', `✏️ نقش کاربر @${username} به "${ROLE_LABELS[newRole]}" تغییر کرد`, 'log-edit');
  renderAdminUsers();
}

function deleteUser(username) {
  if (!confirm(`کاربر @${username} حذف شود؟`)) return;
  saveRegUsers(getRegUsers().filter(u => u.username !== username));
  logActivity('delete', `🗑️ کاربر @${username} حذف شد`, 'log-delete');
  renderAdminUsers();
}

// ─ تنظیمات باشگاه ─
const getGymSettings  = () => JSON.parse(localStorage.getItem('gymSettings') || '{}');
const saveGymSettings_ = s  => localStorage.setItem('gymSettings', JSON.stringify(s));

function loadGymSettings() {
  const s = getGymSettings();
  document.getElementById('gymName').value    = s.name    || '';
  document.getElementById('gymPhone').value   = s.phone   || '';
  document.getElementById('gymEmail').value   = s.email   || '';
  document.getElementById('gymAddress').value = s.address || '';
}

function saveGymSettings() {
  const s = {
    name:    document.getElementById('gymName').value.trim(),
    phone:   document.getElementById('gymPhone').value.trim(),
    email:   document.getElementById('gymEmail').value.trim(),
    address: document.getElementById('gymAddress').value.trim(),
  };
  saveGymSettings_(s);
  logActivity('edit', `✏️ تنظیمات باشگاه به‌روز شد`, 'log-edit');
  showMsg(document.getElementById('gymSettingsMsg'), '✅ تنظیمات ذخیره شد.', true);
}

// ─ پلن‌ها ─
const getPlans   = () => JSON.parse(localStorage.getItem('gymCustomPlans') || '[]');
const savePlans  = p  => localStorage.setItem('gymCustomPlans', JSON.stringify(p));

function addPlan() {
  const name     = document.getElementById('planName').value.trim();
  const price    = parseInt(document.getElementById('planPrice').value);
  const duration = parseInt(document.getElementById('planDuration').value) || 1;
  const msgEl    = document.getElementById('planMsg');

  if (!name)            { showMsg(msgEl, '⚠️ نام پلن الزامی است.', false); return; }
  if (!price || price < 1) { showMsg(msgEl, '⚠️ قیمت معتبر وارد کنید.', false); return; }

  const plans = getPlans();
  plans.push({ id: Date.now(), name, price, duration });
  savePlans(plans);
  document.getElementById('planName').value  = '';
  document.getElementById('planPrice').value = '';
  document.getElementById('planDuration').value = '';
  logActivity('add', `➕ پلن "${name}" اضافه شد`, 'log-add');
  renderPlans();
}

function deletePlan(id) {
  if (!confirm('این پلن حذف شود؟')) return;
  savePlans(getPlans().filter(p => p.id !== id));
  renderPlans();
}

function renderPlans() {
  const el = document.getElementById('plansList');
  if (!el) return;
  const defaults = [
    { id: 'basic',    name: 'پایه',      price: 500000,  duration: 1, isDefault: true },
    { id: 'standard', name: 'استاندارد', price: 800000,  duration: 1, isDefault: true },
    { id: 'premium',  name: 'پریمیوم',   price: 1200000, duration: 1, isDefault: true },
  ];
  const all = [...defaults, ...getPlans()];
  el.innerHTML = all.map(p => `
    <div class="plan-item">
      <div class="plan-icon">💎</div>
      <div>
        <div class="plan-name">${p.name}</div>
        <div class="plan-details">${p.price.toLocaleString('fa-IR')} تومان — ${p.duration} ماه</div>
      </div>
      ${!p.isDefault
        ? `<button class="btn-icon plan-del" onclick="deletePlan(${p.id})" title="حذف">🗑️</button>`
        : `<span style="font-size:11px;color:var(--muted);margin-right:auto;padding:6px 10px;background:rgba(255,255,255,0.04);border-radius:6px">پیش‌فرض</span>`}
    </div>`).join('');
}

// ─ لاگ فعالیت ─
const getActivityLog   = () => JSON.parse(localStorage.getItem('gymActivityLog') || '[]');
const saveActivityLog  = l  => localStorage.setItem('gymActivityLog', JSON.stringify(l));

function logActivity(type, msg, cssClass) {
  const log = getActivityLog();
  log.unshift({ id: Date.now(), type, msg, cssClass: cssClass || 'log-add', time: new Date().toISOString() });
  saveActivityLog(log.slice(0, 100));
}

function renderActivityLog() {
  const el   = document.getElementById('activityLogList');
  const logs = getActivityLog();
  if (!el) return;
  if (!logs.length) {
    el.innerHTML = '<div class="log-empty">هیچ فعالیتی ثبت نشده</div>';
    return;
  }
  el.innerHTML = logs.map(l => `
    <div class="log-item">
      <div class="log-icon ${l.cssClass || 'log-add'}">📋</div>
      <div>
        <div class="log-msg">${l.msg}</div>
        <div class="log-time">${_timeAgo(l.time)}</div>
      </div>
    </div>`).join('');
}

function clearActivityLog() {
  if (!confirm('تمام لاگ‌ها پاک شود؟')) return;
  saveActivityLog([]);
  renderActivityLog();
}

// ═══════════════════════════════════════════
// برنامه تمرینی
// ═══════════════════════════════════════════
const getWorkoutPlans  = ()  => JSON.parse(localStorage.getItem('gymWorkoutPlans') || '[]');
const saveWorkoutPlans = (p) => localStorage.setItem('gymWorkoutPlans', JSON.stringify(p));

let editWorkoutTargetId = null;

// پر کردن لیست اعضا (غیرمربی) برای انتخاب در فرم ثبت و ویرایش برنامه
function _populateWpMemberSel() {
  const members = getMembers().filter(m => m.type !== 'coach');
  ['wpMember', 'ewMember'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- انتخاب عضو --</option>' +
      members.map(m => `<option value="${m.id}">${m.name} — ${m.phone}</option>`).join('');
    if (cur) sel.value = cur;
  });
}

// پر کردن لیست مربی‌ها برای تخصیص به برنامه
function _populateWpCoachSel() {
  const coaches = getMembers().filter(m => m.type === 'coach');
  ['wpCoach', 'ewCoach'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- بدون مربی --</option>' +
      coaches.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (cur) sel.value = cur;
  });
}

// افزودن یک ردیف حرکت تمرینی به لیست (فرم ثبت یا مودال ویرایش)
function _addExerciseRow(containerId, data = {}) {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'wp-ex-row';
  row.innerHTML = `
    <input type="text" class="wp-ex-name" placeholder="مثلاً پرس سینه" value="${data.name || ''}">
    <input type="number" class="wp-ex-sets" placeholder="۳" value="${data.sets || ''}">
    <input type="number" class="wp-ex-reps" placeholder="۱۲" value="${data.reps || ''}">
    <input type="number" class="wp-ex-weight" placeholder="۲۰" value="${data.weight || ''}">
    <button type="button" class="wp-ex-del" title="حذف حرکت">🗑️</button>`;
  row.querySelector('.wp-ex-del').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function wpAddExerciseRow(data) { _addExerciseRow('wpExList', data); }
function ewAddExerciseRow(data) { _addExerciseRow('ewExList', data); }

// خواندن حرکات تمرینی واردشده از یک کانتینر (ردیف‌های بدون نام حرکت نادیده گرفته می‌شوند)
function _getExerciseRows(containerId) {
  return [...document.querySelectorAll(`#${containerId} .wp-ex-row`)]
    .map(row => ({
      name:   row.querySelector('.wp-ex-name').value.trim(),
      sets:   row.querySelector('.wp-ex-sets').value.trim(),
      reps:   row.querySelector('.wp-ex-reps').value.trim(),
      weight: row.querySelector('.wp-ex-weight').value.trim(),
    }))
    .filter(ex => ex.name);
}

// وضعیت برنامه تمرینی بر اساس تاریخ پایان نسبت به امروز
function getWorkoutStatus(plan) {
  if (!plan.endDate) return { key: 'active' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = shamsiToJsDate(plan.endDate);
  end.setHours(0, 0, 0, 0);
  return { key: end < today ? 'expired' : 'active' };
}

// ── ثبت برنامه تمرینی ──
function wpRegister() {
  const memberId  = document.getElementById('wpMember').value;
  const coachId   = document.getElementById('wpCoach').value;
  const startDate = spWpStart ? spWpStart.get() : '';
  const endDate   = spWpEnd ? spWpEnd.get() : '';
  const notes     = document.getElementById('wpNotes').value.trim();
  const msgEl     = document.getElementById('wpRegMsg');

  if (!memberId)              { showMsg(msgEl, '⚠️ یک عضو انتخاب کنید.', false); return; }
  if (!startDate || !endDate) { showMsg(msgEl, '⚠️ تاریخ شروع و پایان را انتخاب کنید.', false); return; }

  const exercises = _getExerciseRows('wpExList');
  if (!exercises.length) { showMsg(msgEl, '⚠️ حداقل یک حرکت تمرینی اضافه کنید.', false); return; }

  const member = getMembers().find(m => String(m.id) === String(memberId));
  const coach  = getMembers().find(m => String(m.id) === String(coachId));

  const plans = getWorkoutPlans();
  plans.unshift({
    id: Date.now(),
    memberId: parseInt(memberId), memberName: member?.name || '',
    coachId: coachId ? parseInt(coachId) : null, coachName: coach?.name || '',
    startDate, endDate, exercises, notes,
    addedAt: new Date().toISOString(),
  });
  saveWorkoutPlans(plans);
  wpClear();
  showMsg(msgEl, `✅ برنامه تمرینی برای "${member?.name}" ثبت شد.`, true);
  logActivity('add', `🏋️ برنامه تمرینی برای "${member?.name}" ثبت شد`, 'log-add');
  addNotification(`برنامه تمرینی جدید برای "${member?.name}" ثبت شد`);
  renderWorkoutList();
}

// پاک کردن فرم ثبت برنامه تمرینی
function wpClear() {
  document.getElementById('wpMember').value = '';
  document.getElementById('wpCoach').value  = '';
  document.getElementById('wpNotes').value  = '';
  if (spWpStart) spWpStart.clear();
  if (spWpEnd)   spWpEnd.clear();
  document.getElementById('wpExList').innerHTML = '';
  wpAddExerciseRow();
}

// ── لیست برنامه‌های تمرینی ──
function renderWorkoutList() {
  const q      = (document.getElementById('wpListSearch').value || '').toLowerCase();
  const filter = document.getElementById('wpListFilter').value;
  let plans    = getWorkoutPlans();

  // مربی فقط برنامه‌های خودش را می‌بیند
  if (currentUser?.role === 'coach' && currentUser?.memberId) {
    plans = plans.filter(p => p.coachId === currentUser.memberId);
  }

  if (q)                plans = plans.filter(p => p.memberName.toLowerCase().includes(q));
  if (filter !== 'all') plans = plans.filter(p => getWorkoutStatus(p).key === filter);

  const tbody    = document.getElementById('wpListTableBody');
  const empty    = document.getElementById('wpListEmpty');
  const countLbl = document.getElementById('wpListCountLabel');
  countLbl.textContent = `${plans.length} برنامه`;

  if (!plans.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = plans.map((p, i) => {
    const status = getWorkoutStatus(p);
    return `
    <tr>
      <td><div class="row-num">${i + 1}</div></td>
      <td><div class="td-name">${p.memberName}</div></td>
      <td>${p.coachName || '—'}</td>
      <td>${formatDate(p.startDate)}</td>
      <td>${formatDate(p.endDate)}</td>
      <td>${p.exercises.length}</td>
      <td><span class="badge ${STATUS_CLASS[status.key]}">${STATUS_LABELS[status.key]}</span></td>
      <td>
        <button class="btn-icon" onclick="openEditWorkoutModal(${p.id})" title="ویرایش">✏️</button>
        <button class="btn-icon" onclick="openDeleteModal(${p.id}, 'workout')" title="حذف">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ── ویرایش برنامه تمرینی ──
function openEditWorkoutModal(id) {
  const plan = getWorkoutPlans().find(p => p.id === id);
  if (!plan) return;
  editWorkoutTargetId = id;

  _populateWpMemberSel();
  _populateWpCoachSel();
  document.getElementById('ewMember').value = plan.memberId;
  document.getElementById('ewCoach').value  = plan.coachId || '';
  document.getElementById('ewNotes').value  = plan.notes || '';
  if (spEwStart) spEwStart.set(plan.startDate || '');
  if (spEwEnd)   spEwEnd.set(plan.endDate || '');

  document.getElementById('ewExList').innerHTML = '';
  if (plan.exercises && plan.exercises.length) {
    plan.exercises.forEach(ex => ewAddExerciseRow(ex));
  } else {
    ewAddExerciseRow();
  }

  document.getElementById('editWorkoutModal').classList.remove('hidden');
}

function closeEditWorkoutModal() {
  editWorkoutTargetId = null;
  document.getElementById('editWorkoutModal').classList.add('hidden');
}

function saveEditWorkout() {
  if (!editWorkoutTargetId) return;
  const memberId  = document.getElementById('ewMember').value;
  const coachId   = document.getElementById('ewCoach').value;
  const startDate = spEwStart ? spEwStart.get() : '';
  const endDate   = spEwEnd ? spEwEnd.get() : '';

  if (!memberId)              { alert('⚠️ یک عضو انتخاب کنید.'); return; }
  if (!startDate || !endDate) { alert('⚠️ تاریخ شروع و پایان را انتخاب کنید.'); return; }

  const exercises = _getExerciseRows('ewExList');
  if (!exercises.length) { alert('⚠️ حداقل یک حرکت تمرینی اضافه کنید.'); return; }

  const plans = getWorkoutPlans();
  const plan  = plans.find(p => p.id === editWorkoutTargetId);
  if (!plan) return;

  const member = getMembers().find(m => String(m.id) === String(memberId));
  const coach  = getMembers().find(m => String(m.id) === String(coachId));

  plan.memberId   = parseInt(memberId);
  plan.memberName = member?.name || '';
  plan.coachId    = coachId ? parseInt(coachId) : null;
  plan.coachName  = coach?.name || '';
  plan.startDate  = startDate;
  plan.endDate    = endDate;
  plan.exercises  = exercises;
  plan.notes      = document.getElementById('ewNotes').value.trim();

  saveWorkoutPlans(plans);
  logActivity('edit', `✏️ برنامه تمرینی "${plan.memberName}" ویرایش شد`, 'log-edit');
  closeEditWorkoutModal();
  renderWorkoutList();
}

// ═══════════════════════════════════════════
// داشبورد ورزشکار
// ═══════════════════════════════════════════
// نمایش بنر هشدار انقضای عضویت در داشبورد ورزشکار
function _showAthExpiryBanner() {
  const banner = document.getElementById('athExpiryBanner');
  if (!banner || !currentUser?.memberId) return;

  const member = getMembers().find(m => m.id === currentUser.memberId);
  if (!member) { banner.classList.add('hidden'); return; }

  const days = daysUntilExpiry(member.expiryDate);
  if (days === null || days > NEAR_EXPIRY_DAYS) {
    banner.classList.add('hidden');
    return;
  }

  banner.classList.remove('hidden');
  if (days < 0) {
    banner.className = 'ath-expiry-banner ath-expiry-expired';
    banner.textContent = '🔴 عضویت شما منقضی شده است. برای تمدید با مدیر باشگاه تماس بگیرید.';
  } else {
    banner.className = 'ath-expiry-banner ath-expiry-soon';
    const dLabel = days === 0 ? 'امروز' : `${days} روز دیگر`;
    banner.textContent = `⚠️ عضویت شما ${dLabel} منقضی می‌شود. برای تمدید با مدیر باشگاه تماس بگیرید.`;
  }
}

function renderAthleteDashboard() {
  const welcomeEl = document.getElementById('athWelcome');
  const grid      = document.getElementById('athPlansGrid');
  const emptyEl   = document.getElementById('athPlansEmpty');
  if (!grid) return;

  if (welcomeEl) welcomeEl.textContent = `سلام، ${currentUser?.name || 'ورزشکار'} 👋`;
  _showAthExpiryBanner();

  // فقط برنامه‌هایی که memberId با عضو لاگین‌شده مطابقت داشته باشد
  const plans = getWorkoutPlans().filter(p => p.memberId === currentUser?.memberId);

  if (!plans.length) {
    grid.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  grid.innerHTML = plans.map(p => {
    const status    = getWorkoutStatus(p);
    const isActive  = status.key === 'active';
    const exRows    = (p.exercises || []).map(ex => `
      <tr>
        <td>${ex.name}</td>
        <td style="text-align:center">${ex.sets || '—'}</td>
        <td style="text-align:center">${ex.reps || '—'}</td>
        <td style="text-align:center">${ex.weight ? ex.weight + ' کیلو' : '—'}</td>
      </tr>`).join('');

    return `
    <div class="ath-plan-card ${isActive ? 'ath-active' : ''}">
      <div class="ath-plan-header">
        <span class="badge ${STATUS_CLASS[status.key]}">${STATUS_LABELS[status.key]}</span>
      </div>
      <div class="ath-plan-coach">مربی: <strong>${p.coachName || 'تعیین‌نشده'}</strong></div>
      <div class="ath-plan-dates">
        <span><strong>${formatDate(p.startDate)}</strong>تاریخ شروع</span>
        <span><strong>${formatDate(p.endDate)}</strong>تاریخ پایان</span>
      </div>
      ${exRows ? `
      <table class="ath-ex-table">
        <thead><tr><th>حرکت</th><th>ست</th><th>تکرار</th><th>وزن</th></tr></thead>
        <tbody>${exRows}</tbody>
      </table>` : ''}
      ${p.notes ? `<div style="font-size:12px;color:var(--muted);padding-top:6px">📝 ${p.notes}</div>` : ''}
    </div>`;
  }).join('');
}

// کلیک بیرون مودال ویرایش برنامه تمرینی
document.getElementById('editWorkoutModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEditWorkoutModal();
});
