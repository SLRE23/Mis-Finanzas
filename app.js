'use strict';
/* =========================================================
   Mis Finanzas — app personal de finanzas (funciona sin internet)
   Los datos se guardan en el dispositivo (localStorage) y, si
   activas la sincronización, también en tu cuenta de Firebase.
   ========================================================= */

const APP_VERSION = '2.0.0';
const STORAGE_KEY = 'misfinanzas:data:v1';
const PENDING_KEY = 'misfinanzas:pendientes';
const SYNCUID_KEY = 'misfinanzas:sync-uid';
const $ = (s, r = document) => r.querySelector(s);
const LOCALE = (navigator.language || '').toLowerCase().startsWith('es') ? navigator.language : 'es-419';

const CURRENCIES = [
  ['USD', 'Dólar estadounidense'], ['EUR', 'Euro'], ['MXN', 'Peso mexicano'], ['COP', 'Peso colombiano'],
  ['ARS', 'Peso argentino'], ['CLP', 'Peso chileno'], ['PEN', 'Sol peruano'], ['DOP', 'Peso dominicano'],
  ['GTQ', 'Quetzal'], ['CRC', 'Colón costarricense'], ['HNL', 'Lempira'], ['NIO', 'Córdoba'],
  ['BOB', 'Boliviano'], ['PYG', 'Guaraní'], ['UYU', 'Peso uruguayo'], ['VES', 'Bolívar'],
  ['BRL', 'Real brasileño'], ['CAD', 'Dólar canadiense'], ['GBP', 'Libra esterlina']
];
const TYPE_LABEL = { ingreso: 'Ingreso', gasto: 'Gasto', ahorro: 'Ahorro', pago: 'Pago de tarjeta' };
const FILTER_LABEL = { todos: 'Todos', ingreso: 'Ingresos', gasto: 'Gastos', ahorro: 'Ahorro', pago: 'Pagos de tarjeta' };
const GOAL_KINDS = { ahorro: 'Ahorro', inversion: 'Inversión', emergencia: 'Fondo de emergencia' };
const GOAL_EMOJI = { ahorro: '🐷', inversion: '📈', emergencia: '🛟' };
const DEBT_KINDS = { tarjeta: 'Tarjeta de crédito', prestamo: 'Préstamo', personal: 'Deuda personal', otro: 'Otra deuda' };
const DEBT_EMOJI = { tarjeta: '💳', prestamo: '🏦', personal: '🤝', otro: '📄' };
const REC_KINDS = { factura: 'Facturas y servicios', suscripcion: 'Suscripciones', pension: 'Pensión alimenticia', otro: 'Otros pagos fijos' };
const REC_KIND_ONE = { factura: 'Factura / servicio', suscripcion: 'Suscripción', pension: 'Pensión alimenticia', otro: 'Otro pago fijo' };
const REC_EMOJI = { factura: '🧾', suscripcion: '📺', pension: '🧒', otro: '📌' };
const REC_DEFAULT_CAT = { factura: 'Servicios', suscripcion: 'Suscripciones', pension: 'Pensión alimenticia', otro: 'Otros gastos' };
const FREQ = { mensual: 'Mensual', quincenal: 'Quincenal', anual: 'Anual' };
const CLIENT_FREQ = { mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal', proyecto: 'Por proyecto' };
const GROUP_LABEL = { needs: 'Necesidad', wants: 'Deseo' };
const TITLES = { inicio: 'Inicio', movimientos: 'Movimientos', pagos: 'Pagos fijos', deudas: 'Deudas y tarjetas', clientes: 'Clientes', cliente: 'Cliente', mas: 'Más', metas: 'Metas', presupuesto: 'Presupuesto', ajustes: 'Ajustes' };
const TAB_OF = { metas: 'mas', presupuesto: 'mas', ajustes: 'mas', cliente: 'clientes' };
const BACK_TO = { metas: 'mas', ajustes: 'mas', cliente: 'clientes' };
const MONTH_VIEWS = ['inicio', 'movimientos', 'pagos', 'presupuesto'];
const CAT_EMOJI = {
  'Salario': '💼', 'Clientes': '🤝', 'Negocio': '🏪', 'Freelance': '💻', 'Inversiones': '📈', 'Regalos': '🎁', 'Otros ingresos': '💵',
  'Vivienda': '🏠', 'Comida': '🍽️', 'Transporte': '🚌', 'Servicios': '💡', 'Salud': '🩺', 'Educación': '📚',
  'Entretenimiento': '🎬', 'Ropa': '👕', 'Suscripciones': '📺', 'Pensión alimenticia': '🧒', 'Deudas': '🏦', 'Otros gastos': '🧾'
};
const CHART_COLORS = ['#0d9488', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#16a34a', '#dc2626', '#64748b'];
const FIXED_CATS = { gasto: ['Deudas'], ingreso: ['Clientes'] };
const COLLS = ['transactions', 'debts', 'goals', 'recurring', 'clients', 'invoices'];
const ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';

/* =========================================================
   Estado
   ========================================================= */
function guessCurrency() {
  const map = { MX: 'MXN', CO: 'COP', AR: 'ARS', CL: 'CLP', PE: 'PEN', DO: 'DOP', GT: 'GTQ', CR: 'CRC', HN: 'HNL', NI: 'NIO', BO: 'BOB', PY: 'PYG', UY: 'UYU', VE: 'VES', BR: 'BRL', ES: 'EUR', CA: 'CAD', GB: 'GBP' };
  const lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  return map[(lang.split('-')[1] || '').toUpperCase()] || 'USD';
}

function defaultState() {
  return {
    version: 2,
    settings: { currency: guessCurrency(), theme: 'auto', expectedIncome: 0, lastBackup: null, lastMethod: 'cash' },
    categories: {
      ingreso: ['Salario', 'Clientes', 'Negocio', 'Freelance', 'Inversiones', 'Regalos', 'Otros ingresos'],
      gasto: ['Vivienda', 'Comida', 'Transporte', 'Servicios', 'Salud', 'Educación', 'Pensión alimenticia', 'Entretenimiento', 'Ropa', 'Suscripciones', 'Deudas', 'Otros gastos']
    },
    catGroup: {
      'Vivienda': 'needs', 'Comida': 'needs', 'Transporte': 'needs', 'Servicios': 'needs', 'Salud': 'needs', 'Educación': 'needs',
      'Pensión alimenticia': 'needs', 'Deudas': 'needs', 'Entretenimiento': 'wants', 'Ropa': 'wants', 'Suscripciones': 'wants', 'Otros gastos': 'wants'
    },
    limits: {},
    split: { needs: 50, wants: 30, savings: 20 },
    transactions: [], debts: [], goals: [], recurring: [], clients: [], invoices: [],
    updatedAt: Date.now()
  };
}

function normalize(obj) {
  const d = defaultState();
  const o = obj && typeof obj === 'object' ? obj : {};
  const cats = o.categories || {};
  const s = {
    ...d, ...o,
    settings: { ...d.settings, ...(o.settings || {}) },
    categories: {
      ingreso: Array.isArray(cats.ingreso) ? [...cats.ingreso] : d.categories.ingreso,
      gasto: Array.isArray(cats.gasto) ? [...cats.gasto] : d.categories.gasto
    },
    catGroup: { ...d.catGroup, ...(o.catGroup || {}) },
    limits: o.limits && typeof o.limits === 'object' ? o.limits : {},
    split: { ...d.split, ...(o.split || {}) }
  };
  for (const c of COLLS) s[c] = Array.isArray(o[c]) ? o[c] : [];
  // Migración desde la versión 1
  if ((o.version || 1) < 2) {
    if (!s.categories.gasto.includes('Pensión alimenticia')) s.categories.gasto.splice(Math.max(0, s.categories.gasto.indexOf('Entretenimiento')), 0, 'Pensión alimenticia');
    for (const debt of s.debts) if (!debt.kind) debt.kind = 'prestamo';
  }
  for (const [type, list] of Object.entries(FIXED_CATS)) for (const c of list) if (!s.categories[type].includes(c)) s.categories[type].push(c);
  s.version = 2;
  return s;
}

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* almacenamiento bloqueado */ }
  if (!raw) return defaultState();
  try {
    return normalize(JSON.parse(raw));
  } catch (e) {
    try { localStorage.setItem('misfinanzas:danado:' + Date.now(), raw); } catch (_) { }
    return defaultState();
  }
}

let state = loadState();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('No se pudo guardar en este dispositivo', 'error');
  }
  savePending();
}

/** Guarda un cambio hecho en este dispositivo y lo manda a sincronizar. */
function save() {
  state.updatedAt = Date.now();
  detectChanges();
  persist();
  if (window.Sync && window.Sync.flush) window.Sync.flush();
}

/* =========================================================
   Seguimiento de cambios para la sincronización
   ========================================================= */
let tracked = {};
let pending = (() => { try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || {}; } catch (_) { return {}; } })();
function savePending() { try { localStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch (_) { } }
const recJson = (r) => { const { updatedAt, ...rest } = r; return JSON.stringify(rest); };
function configRecord() {
  const { lastBackup, lastMethod, ...settings } = state.settings;
  return { settings, categories: state.categories, catGroup: state.catGroup, limits: state.limits, split: state.split };
}
function snapshotTracked() {
  tracked = {};
  for (const c of COLLS) for (const r of state[c]) tracked[c + ':' + r.id] = recJson(r);
  tracked['config:main'] = JSON.stringify(configRecord());
}
function detectChanges() {
  const now = Date.now();
  const seen = new Set(['config:main']);
  for (const c of COLLS) for (const r of state[c]) {
    const key = c + ':' + r.id;
    seen.add(key);
    const j = recJson(r);
    if (tracked[key] !== j) { r.updatedAt = now; tracked[key] = j; pending[key] = 0; }
  }
  const cj = JSON.stringify(configRecord());
  if (tracked['config:main'] !== cj) { state.configUpdatedAt = now; tracked['config:main'] = cj; pending['config:main'] = 0; }
  for (const key of Object.keys(tracked)) if (!seen.has(key)) { delete tracked[key]; pending[key] = now; }
}
function splitKey(key) { const i = key.indexOf(':'); return [key.slice(0, i), key.slice(i + 1)]; }
function stampOf(key) {
  const [coll, id] = splitKey(key);
  if (coll === 'config') return state.configUpdatedAt || 1;
  const rec = (state[coll] || []).find((r) => r.id === id);
  return rec ? (rec.updatedAt || 1) : (pending[key] || 1);
}

// Interfaz que usa sync.js
window.App = {
  pendingDocs() {
    return Object.keys(pending).map((key) => {
      const [coll, id] = splitKey(key);
      if (coll === 'config') return { key, coll, id, deleted: false, updatedAt: stampOf(key), data: JSON.parse(JSON.stringify(configRecord())) };
      const rec = (state[coll] || []).find((r) => r.id === id);
      if (!rec) return { key, coll, id, deleted: true, updatedAt: stampOf(key), data: null };
      return { key, coll, id, deleted: false, updatedAt: stampOf(key), data: JSON.parse(JSON.stringify(rec)) };
    });
  },
  pendingCount() { return Object.keys(pending).length; },
  clearPending(sent) {
    for (const d of sent) if (d.key in pending && stampOf(d.key) === d.updatedAt) delete pending[d.key];
    savePending();
    refreshSyncUi();
  },
  markAllPending() {
    for (const key of Object.keys(tracked)) pending[key] = 0;
    savePending();
  },
  getSyncUid() { try { return localStorage.getItem(SYNCUID_KEY); } catch (_) { return null; } },
  setSyncUid(uid) { try { localStorage.setItem(SYNCUID_KEY, uid); } catch (_) { } },
  /** Aplica cambios que llegan de otros dispositivos (gana el más reciente). */
  applyRemote(docs) {
    let changed = false;
    for (const d of docs) {
      if (!d || !d.coll || !d.id) continue;
      const key = d.coll + ':' + d.id;
      const remoteTs = Number(d.updatedAt) || 0;
      if (key in pending) {
        if (stampOf(key) >= remoteTs) continue; // lo de este dispositivo es más nuevo
        delete pending[key];
      }
      if (d.coll === 'config') {
        if (d.deleted || !d.data || remoteTs <= (state.configUpdatedAt || 0)) continue;
        const c = d.data;
        if (c.settings) state.settings = { ...state.settings, ...c.settings };
        if (c.categories) state.categories = c.categories;
        if (c.catGroup) state.catGroup = c.catGroup;
        if (c.limits) state.limits = c.limits;
        if (c.split) state.split = c.split;
        state.configUpdatedAt = remoteTs;
        tracked[key] = JSON.stringify(configRecord());
        changed = true;
        continue;
      }
      if (!COLLS.includes(d.coll)) continue;
      const arr = state[d.coll];
      const idx = arr.findIndex((r) => r.id === d.id);
      const local = idx >= 0 ? arr[idx] : null;
      if (d.deleted) {
        if (local && (local.updatedAt || 0) <= remoteTs) { arr.splice(idx, 1); delete tracked[key]; changed = true; }
      } else if (d.data && (!local || (local.updatedAt || 0) < remoteTs)) {
        const rec = { ...d.data, updatedAt: remoteTs };
        if (local) { for (const k of Object.keys(local)) delete local[k]; Object.assign(local, rec); }
        else arr.push(rec);
        tracked[key] = recJson(rec);
        changed = true;
      }
    }
    if (changed) {
      persist();
      applyTheme();
      safeRender();
    } else savePending();
  },
  setSyncStatus(s) { syncState = { ...syncState, ...s }; refreshSyncUi(); }
};

let syncState = { status: window.FIREBASE_CONFIG ? 'loading' : 'off' };

/* =========================================================
   Utilidades
   ========================================================= */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normText = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

let _fmt = null, _fmtCur = null;
function money(n) {
  if (_fmtCur !== state.settings.currency) {
    _fmtCur = state.settings.currency;
    try { _fmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: _fmtCur, useGrouping: 'always' }); }
    catch (e) { _fmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  }
  return _fmt.format(Number(n) || 0);
}

/** Convierte "1.234,56", "1,234.56", "1500" o "12,5" en número. */
function parseAmount(input) {
  let s = String(input ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const hasC = s.includes(','), hasD = s.includes('.');
  if (hasC && hasD) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (hasC || hasD) {
    const sep = hasC ? ',' : '.';
    const parts = s.split(sep);
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) s = parts.join('');
    else s = parts.join('.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? round2(n) : NaN;
}
const optAmount = (v) => (String(v ?? '').trim() ? parseAmount(v) : 0);

/* --- Fechas --- */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => iso(new Date());
const monthOf = (s) => String(s).slice(0, 7);
function parseISO(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function shiftMonth(m, delta) {
  let [y, mo] = m.split('-').map(Number);
  mo += delta;
  y += Math.floor((mo - 1) / 12);
  mo = ((mo - 1) % 12 + 12) % 12 + 1;
  return `${y}-${String(mo).padStart(2, '0')}`;
}
function daysInMonth(m) { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); }
function dateFor(m, day) { return `${m}-${String(clamp(Number(day) || 1, 1, daysInMonth(m))).padStart(2, '0')}`; }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
function monthName(m, short) {
  const d = parseISO(m + '-01');
  return short
    ? d.toLocaleDateString(LOCALE, { month: 'short' }).replace('.', '')
    : d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}
function dateLabel(s) {
  const t = todayISO();
  if (s === t) return 'Hoy';
  if (s === addDays(t, -1)) return 'Ayer';
  if (s === addDays(t, 1)) return 'Mañana';
  return cap(parseISO(s).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }));
}
const shortDate = (s) => parseISO(s).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }).replace('.', '');
const longDate = (s) => parseISO(s).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });

function emojiFor(cat) { return CAT_EMOJI[cat] || (cat || '?').trim().charAt(0).toUpperCase(); }

/* =========================================================
   Cálculos
   ========================================================= */
const txOfMonth = (m) => state.transactions.filter((t) => monthOf(t.date) === m);
const sortTx = (list) => [...list].sort((a, b) => (b.date.localeCompare(a.date)) || ((b.createdAt || 0) - (a.createdAt || 0)));
const findDebt = (id) => state.debts.find((d) => d.id === id);
const findGoal = (id) => state.goals.find((g) => g.id === id);
const findRec = (id) => state.recurring.find((r) => r.id === id);
const findClient = (id) => state.clients.find((c) => c.id === id);
const cards = () => state.debts.filter((d) => d.kind === 'tarjeta');
const groupOf = (cat) => state.catGroup[cat] || 'wants';

function monthTotals(m) {
  const list = txOfMonth(m);
  const gastos = list.filter((t) => t.type === 'gasto');
  const income = round2(sum(list.filter((t) => t.type === 'ingreso'), (t) => t.amount));
  const expense = round2(sum(gastos, (t) => t.amount));
  const onCard = round2(sum(gastos.filter((t) => t.cardId), (t) => t.amount));
  const saved = round2(sum(list.filter((t) => t.type === 'ahorro'), (t) => t.amount));
  const cardPayments = round2(sum(list.filter((t) => t.type === 'pago'), (t) => t.amount));
  // Efectivo disponible: lo que entró menos lo que salió de tu bolsillo/cuenta
  const available = round2(income - (expense - onCard) - cardPayments - saved);
  return { income, expense, onCard, saved, cardPayments, available };
}

function expensesByCategory(m) {
  const out = {};
  for (const t of txOfMonth(m)) if (t.type === 'gasto') out[t.category] = round2((out[t.category] || 0) + t.amount);
  return out;
}

/* --- Deudas y tarjetas --- */
function payoffMonths(balance, apr, payment) {
  if (balance <= 0) return 0;
  if (!(payment > 0)) return null;
  const r = (Number(apr) || 0) / 100 / 12;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r) return Infinity;
  return Math.ceil(-Math.log(1 - (r * balance) / payment) / Math.log(1 + r));
}

function debtInfo(d) {
  const txs = state.transactions;
  const chargesTx = d.kind === 'tarjeta' ? txs.filter((t) => t.type === 'gasto' && t.cardId === d.id) : [];
  const paysTx = txs.filter((t) => t.debtId === d.id && (t.type === 'gasto' || t.type === 'pago'));
  const charges = round2(sum(chargesTx, (t) => t.amount));
  const paid = round2(sum(paysTx, (t) => t.amount));
  const balance = round2((Number(d.startBalance) || 0) + charges - paid);
  const owed = Math.max(0, balance);
  const progress = d.startBalance > 0 ? clamp(paid / (d.startBalance + charges), 0, 1) : 1;
  const months = payoffMonths(owed, d.rate, d.minPayment);
  const interest = Number.isFinite(months) && months > 0 ? Math.max(0, round2(d.minPayment * months - owed)) : null;
  const t = todayISO(), cm = monthOf(t);
  const info = { charges, paid, balance, owed, progress, months, interest };

  if (d.kind === 'tarjeta') {
    let lastCut = null;
    if (d.cutDay) {
      lastCut = dateFor(cm, d.cutDay);
      if (lastCut > t) lastCut = dateFor(shiftMonth(cm, -1), d.cutDay);
    }
    let nextDue = null;
    if (d.dueDay) {
      if (lastCut) {
        const cutM = monthOf(lastCut);
        nextDue = Number(d.dueDay) > Number(d.cutDay) ? dateFor(cutM, d.dueDay) : dateFor(shiftMonth(cutM, 1), d.dueDay);
      } else {
        nextDue = dateFor(cm, d.dueDay);
        if (nextDue < t) nextDue = dateFor(shiftMonth(cm, 1), d.dueDay);
      }
    }
    const afterCut = (x) => lastCut && x.date > lastCut;
    const sinceCut = round2(sum(chargesTx.filter(afterCut), (x) => x.amount));
    const paidSinceCut = round2(sum(paysTx.filter(afterCut), (x) => x.amount));
    const statement = lastCut ? Math.max(0, round2(balance - sinceCut + paidSinceCut)) : owed;
    const toPay = Math.max(0, round2(statement - paidSinceCut));
    const limit = Number(d.creditLimit) || 0;
    Object.assign(info, {
      lastCut, nextDue, sinceCut, paidSinceCut, statement, toPay,
      available: limit ? round2(limit - balance) : null,
      usage: limit ? clamp(balance / limit, 0, 1.5) : null,
      daysToDue: nextDue ? daysBetween(t, nextDue) : null,
      monthCharges: round2(sum(chargesTx.filter((x) => monthOf(x.date) === cm), (x) => x.amount))
    });
  } else {
    info.paidThisMonth = paysTx.some((x) => monthOf(x.date) === cm);
  }
  return info;
}

function debtTotals() {
  const list = state.debts.map((d) => ({ d, i: debtInfo(d) }));
  return {
    debt: round2(sum(list, (x) => x.i.owed)),
    minPayments: round2(sum(list.filter((x) => x.i.owed > 0), (x) => Math.min(x.d.minPayment || 0, x.i.owed))),
    cardDebt: round2(sum(list.filter((x) => x.d.kind === 'tarjeta'), (x) => x.i.owed))
  };
}

/* --- Metas --- */
function goalContrib(g) { return round2(sum(state.transactions.filter((t) => t.type === 'ahorro' && t.goalId === g.id), (t) => t.amount)); }
function goalInfo(g) {
  const saved = round2((Number(g.initial) || 0) + goalContrib(g));
  const target = Number(g.target) || 0;
  const remaining = Math.max(0, round2(target - saved));
  const pct = target > 0 ? clamp(saved / target, 0, 1) : 0;
  let perMonth = null, overdue = false;
  if (g.deadline && remaining > 0) {
    const days = daysBetween(todayISO(), g.deadline);
    if (days < 0) overdue = true;
    else perMonth = round2(remaining / Math.max(1, Math.ceil(days / 30.44)));
  }
  const value = g.kind === 'inversion' && Number.isFinite(g.currentValue) ? g.currentValue : saved;
  return { saved, target, remaining, pct, perMonth, overdue, value, gain: round2(value - saved) };
}

function avgMonthlyExpense(n = 3) {
  const cm = monthOf(todayISO());
  const vals = [];
  for (let i = 0; i < n; i++) { const v = monthTotals(shiftMonth(cm, -i)).expense; if (v > 0) vals.push(v); }
  return vals.length ? round2(sum(vals) / vals.length) : 0;
}

/* --- Pagos fijos (facturas, suscripciones, pensión) --- */
function occurrences(r, m) {
  if (r.active === false) return [];
  const [y, mo] = m.split('-').map(Number);
  const out = [];
  const add = (day, period, withArrival) => {
    const due = dateFor(m, day);
    let arrive = null;
    if (withArrival && r.arriveDay) arrive = Number(r.arriveDay) > Number(day) ? dateFor(shiftMonth(m, -1), r.arriveDay) : dateFor(m, r.arriveDay);
    out.push({ r, m, period, due, arrive });
  };
  if (r.frequency === 'anual') { if (Number(r.month) === mo) add(r.dueDay, String(y), true); }
  else if (r.frequency === 'quincenal') { add(r.dueDay, m + '-1', false); add(r.dueDay2 || 30, m + '-2', false); }
  else add(r.dueDay, m, true);
  // No mostrar cobros de antes de que existiera el pago fijo (los automáticos ya se cobraron)
  const created = r.createdAt ? iso(new Date(r.createdAt)) : null;
  return out.filter((o) => (!r.startMonth || monthOf(o.due) >= r.startMonth) && !(r.autopay && created && o.due < created));
}
const recTx = (r, period) => state.transactions.find((t) => t.recurringId === r.id && t.period === period);
function occStatus(o) {
  const tx = recTx(o.r, o.period);
  if (tx) return { code: 'pagada', tx };
  if ((o.r.skip || []).includes(o.period)) return { code: 'omitida' };
  const t = todayISO();
  if (t > o.due) return { code: 'vencida', days: daysBetween(o.due, t) };
  if (!o.arrive || t >= o.arrive) return { code: 'porpagar', days: daysBetween(t, o.due) };
  return { code: 'porllegar', days: daysBetween(t, o.arrive) };
}
function monthlyEquivalent(r) {
  if (r.active === false) return 0;
  const a = Number(r.amount) || 0;
  return r.frequency === 'quincenal' ? a * 2 : r.frequency === 'anual' ? a / 12 : a;
}
function methodLabel(cardId) { const c = cardId && findDebt(cardId); return c ? '💳 ' + c.name : '💵 Efectivo/débito'; }

/** Pagos fijos sin pagar que vencieron o vencen pronto. */
function upcomingOccurrences(daysAhead = 10) {
  const t = todayISO(), cm = monthOf(t);
  const list = [];
  for (const r of state.recurring) for (const m of [shiftMonth(cm, -1), cm, shiftMonth(cm, 1)]) {
    for (const o of occurrences(r, m)) {
      o.s = occStatus(o);
      if (o.s.code === 'vencida' || (o.s.code !== 'pagada' && o.s.code !== 'omitida' && daysBetween(t, o.due) <= daysAhead)) list.push(o);
    }
  }
  return list.sort((a, b) => a.due.localeCompare(b.due));
}

/* --- Clientes --- */
function invoiceStatus(inv) {
  if (inv.paidDate) return { code: 'pagada' };
  const t = todayISO();
  if (inv.dueDate && inv.dueDate < t) return { code: 'atrasada', days: daysBetween(inv.dueDate, t) };
  return { code: 'pendiente', days: inv.dueDate ? daysBetween(t, inv.dueDate) : null };
}
function clientInfo(c) {
  const inv = state.invoices.filter((i) => i.clientId === c.id);
  const unpaid = inv.filter((i) => !i.paidDate);
  const overdue = unpaid.filter((i) => invoiceStatus(i).code === 'atrasada');
  const paid = inv.filter((i) => i.paidDate).sort((a, b) => b.paidDate.localeCompare(a.paidDate));
  return { inv, unpaid, overdue, owed: round2(sum(unpaid, (i) => i.amount)), overdueAmt: round2(sum(overdue, (i) => i.amount)), lastPaid: paid[0] || null };
}
function receivables() {
  const unpaid = state.invoices.filter((i) => !i.paidDate && findClient(i.clientId));
  const overdue = unpaid.filter((i) => invoiceStatus(i).code === 'atrasada');
  const cm = monthOf(todayISO());
  return {
    owed: round2(sum(unpaid, (i) => i.amount)), count: unpaid.length,
    overdueAmt: round2(sum(overdue, (i) => i.amount)), overdueCount: overdue.length, overdue,
    collectedMonth: round2(sum(state.invoices.filter((i) => i.paidDate && monthOf(i.paidDate) === cm), (i) => i.paidAmount ?? i.amount))
  };
}
/** Facturas que faltan por crear este mes para clientes con pago fijo. */
function missingInvoices(m) {
  const out = [];
  for (const c of state.clients) {
    if (c.active === false || !(c.amount > 0)) continue;
    const periods = c.frequency === 'mensual' ? [[m, c.billingDay || 1]]
      : c.frequency === 'quincenal' ? [[m + '-1', c.billingDay || 1], [m + '-2', c.billingDay2 || 16]] : [];
    for (const [period, day] of periods) {
      const id = `inv_${c.id}_${period}`;
      if (state.invoices.some((i) => i.id === id || (i.clientId === c.id && i.period === period))) continue;
      const issueDate = dateFor(m, day);
      out.push({ id, clientId: c.id, period, number: '', amount: c.amount, issueDate, dueDate: addDays(issueDate, Number(c.terms) || 0), paidDate: null, createdAt: Date.now() });
    }
  }
  return out;
}
function nextInvoiceNumber() {
  const nums = state.invoices.map((i) => parseInt(String(i.number || '').replace(/\D/g, ''), 10)).filter(Number.isFinite);
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}

/* --- Automáticos: pagos domiciliados --- */
function runAutomations() {
  const t = todayISO(), cm = monthOf(t);
  let changed = false;
  for (const r of state.recurring) {
    if (!r.autopay || r.active === false || !(r.amount > 0)) continue;
    for (const m of [shiftMonth(cm, -1), cm]) for (const o of occurrences(r, m)) {
      if (o.due > t || (r.createdAt && o.due < iso(new Date(r.createdAt)))) continue;
      const s = occStatus(o);
      if (s.code === 'pagada' || s.code === 'omitida') continue;
      const id = `auto_${r.id}_${o.period}`;
      if (state.transactions.some((x) => x.id === id)) continue;
      const tx = { id, createdAt: Date.now(), type: 'gasto', amount: r.amount, category: r.category, date: o.due, note: r.name, recurringId: r.id, period: o.period, auto: true };
      if (r.cardId && findDebt(r.cardId)) tx.cardId = r.cardId;
      state.transactions.push(tx);
      changed = true;
    }
  }
  if (changed) save();
  return changed;
}

/* =========================================================
   Navegación y render
   ========================================================= */
const ui = { tab: 'inicio', month: monthOf(todayISO()), txFilter: 'todos', search: '', debtStrategy: 'avalanche', payFilter: 'todos', clientId: null, showPaidInv: false };
const view = $('#view');

function go(tab, opts = {}) {
  ui.tab = tab;
  if (opts.clientId !== undefined) ui.clientId = opts.clientId;
  render();
  window.scrollTo({ top: 0 });
}

function render() {
  if (ui.tab === 'cliente' && !findClient(ui.clientId)) ui.tab = 'clientes';
  const activeTab = TAB_OF[ui.tab] || ui.tab;
  for (const b of document.querySelectorAll('.tabbar button')) b.setAttribute('aria-current', b.dataset.tab === activeTab ? 'page' : 'false');
  const withMonth = MONTH_VIEWS.includes(ui.tab);
  $('#monthNav').hidden = !withMonth;
  $('#pageTitle').hidden = withMonth;
  $('#backBtn').hidden = !BACK_TO[ui.tab];
  $('#pageTitle').textContent = ui.tab === 'cliente' ? (findClient(ui.clientId)?.name || 'Cliente') : TITLES[ui.tab];
  $('#monthLabel').textContent = cap(monthName(ui.month));
  const fabLabel = { deudas: 'Agregar deuda o tarjeta', metas: 'Nueva meta', pagos: 'Agregar pago fijo', clientes: 'Agregar cliente', cliente: 'Nueva factura' }[ui.tab] || 'Agregar movimiento';
  $('#fab').hidden = ui.tab === 'ajustes' || ui.tab === 'mas';
  $('#fab').setAttribute('aria-label', fabLabel);
  view.innerHTML = VIEWS[ui.tab]();
  refreshSyncUi();
}

let renderQueued = false;
/** Re-dibuja sin interrumpir un formulario abierto. */
function safeRender() {
  if (sheet.open) { renderQueued = true; return; }
  const a = document.activeElement;
  if (a && view.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { renderQueued = true; return; }
  render();
}

/* --- Piezas reutilizables --- */
function stat(label, value, tone, extra = '', action = '') {
  const inner = `<span>${label}</span><strong>${money(value)}</strong>${extra ? `<small>${extra}</small>` : ''}`;
  return action ? `<button class="stat tone-${tone}" ${action}>${inner}</button>` : `<div class="stat tone-${tone}">${inner}</div>`;
}
function countStat(label, value, tone, extra = '') {
  return `<div class="stat tone-${tone}"><span>${label}</span><strong>${value}</strong>${extra ? `<small>${extra}</small>` : ''}</div>`;
}
function bar(pct, tone = '') { return `<div class="bar ${tone}"><i style="width:${(clamp(pct, 0, 1) * 100).toFixed(1)}%"></i></div>`; }
function emptyState(icon, text, btnHtml = '') { return `<div class="empty"><span class="big">${icon}</span><p>${text}</p>${btnHtml}</div>`; }
function editBtn(action, id, name) { return `<button class="icon-btn" data-action="${action}" data-id="${id}" aria-label="Editar ${esc(name)}">${ICON_EDIT}</button>`; }
function alertBox(tone, ico, text, action = '') {
  return action
    ? `<button class="alert ${tone}" ${action}><span class="ico">${ico}</span><span>${text}</span></button>`
    : `<div class="alert ${tone}"><span class="ico">${ico}</span><span>${text}</span></div>`;
}
function options(list, selected) {
  const all = selected && !list.includes(selected) ? [...list, selected] : list;
  return all.map((c) => `<option value="${esc(c)}" ${c === selected ? 'selected' : ''}>${esc(c)}</option>`).join('');
}
function methodOptions(selected) {
  const cs = cards();
  return `<option value="">💵 Efectivo / débito</option>` + cs.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>💳 ${esc(c.name)}</option>`).join('');
}

function txTitle(t) {
  if (t.type === 'ahorro') { const g = findGoal(t.goalId); return (g ? g.name : 'Ahorro') + (t.amount < 0 ? ' (retiro)' : ''); }
  if (t.type === 'pago') { const d = findDebt(t.debtId); return 'Pago a ' + (d ? d.name : 'tarjeta'); }
  if (t.type === 'gasto' && t.debtId) { const d = findDebt(t.debtId); return 'Pago: ' + (d ? d.name : 'deuda'); }
  if (t.recurringId) { const r = findRec(t.recurringId); if (r) return r.name; }
  if (t.invoiceId) { const inv = state.invoices.find((i) => i.id === t.invoiceId); const c = inv && findClient(inv.clientId); if (c) return c.name; }
  return t.category;
}

function txRow(t, withDate = false) {
  const title = t.note && t.note !== txTitle(t) ? t.note : txTitle(t);
  const parts = [title === txTitle(t) ? (t.type === 'gasto' || t.type === 'ingreso' ? t.category : TYPE_LABEL[t.type]) : txTitle(t)];
  if (t.cardId) parts.push('💳 ' + (findDebt(t.cardId)?.name || 'tarjeta'));
  if (t.auto) parts.push('automático');
  if (withDate) parts.push(dateLabel(t.date));
  const emoji = t.type === 'ahorro' ? (GOAL_EMOJI[findGoal(t.goalId)?.kind] || '🐷')
    : t.type === 'pago' ? '💳'
      : t.recurringId ? (REC_EMOJI[findRec(t.recurringId)?.kind] || emojiFor(t.category)) : emojiFor(t.category);
  const amt = t.type === 'ingreso' ? '+' + money(t.amount)
    : t.type === 'ahorro' ? (t.amount < 0 ? '−' + money(-t.amount) : money(t.amount))
      : '−' + money(t.amount);
  return `<button class="row" data-action="edit-tx" data-id="${t.id}">
    <span class="avatar t-${t.type}">${esc(emoji)}</span>
    <span class="row-main"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(parts.join(' · '))}</span></span>
    <span class="row-amt amt-${t.type}">${amt}</span>
  </button>`;
}

function occBadge(s) {
  switch (s.code) {
    case 'pagada': return '<span class="badge good">Pagada ✓</span>';
    case 'omitida': return '<span class="badge">Omitida</span>';
    case 'vencida': return `<span class="badge bad">Vencida ${s.days === 1 ? 'ayer' : `hace ${s.days} días`}</span>`;
    case 'porpagar': return `<span class="badge ${s.days <= 3 ? 'warn' : 'primary'}">${s.days === 0 ? 'Vence hoy' : s.days === 1 ? 'Vence mañana' : `Vence en ${s.days} días`}</span>`;
    default: return `<span class="badge">Llega en ${plural(s.days, 'día', 'días')}</span>`;
  }
}
function occRow(o) {
  const r = o.r, s = o.s || occStatus(o);
  const amount = s.tx ? s.tx.amount : r.amount;
  const sub = [];
  if (o.arrive) sub.push('Llega ' + shortDate(o.arrive));
  sub.push('Vence ' + shortDate(o.due));
  sub.push(s.tx ? methodLabel(s.tx.cardId) : methodLabel(r.cardId));
  if (r.autopay) sub.push('automático');
  return `<button class="row" data-action="occ" data-id="${r.id}" data-period="${esc(o.period)}" data-month="${o.m}">
    <span class="avatar">${REC_EMOJI[r.kind] || '📌'}</span>
    <span class="row-main"><span class="row-title">${esc(r.name)}</span><span class="row-sub">${esc(sub.join(' · '))}</span></span>
    <span class="row-end"><span class="row-amt">${r.variable && !s.tx ? '~' : ''}${money(amount)}</span>${occBadge(s)}</span>
  </button>`;
}
function cardDueRow(d, i) {
  const s = i.daysToDue < 0 ? { code: 'vencida', days: -i.daysToDue } : { code: 'porpagar', days: i.daysToDue };
  return `<button class="row" data-action="pay-debt" data-id="${d.id}">
    <span class="avatar">💳</span>
    <span class="row-main"><span class="row-title">Pago ${esc(d.name)}</span><span class="row-sub">Para no pagar intereses · vence ${shortDate(i.nextDue)}</span></span>
    <span class="row-end"><span class="row-amt">${money(i.toPay)}</span>${occBadge(s)}</span>
  </button>`;
}

/* =========================================================
   Vista: Inicio
   ========================================================= */
function renderInicio() {
  const m = ui.month;
  const tot = monthTotals(m);
  const rate = tot.income > 0 ? Math.round((tot.saved / tot.income) * 100) : null;
  const hasAny = COLLS.some((c) => state[c].length);
  let html = '';

  if (!hasAny) {
    html += `<section class="card welcome">
      <h2>¡Bienvenido a tus finanzas! 👋</h2>
      <p>Te recomiendo empezar así: 1) agrega tu tarjeta de crédito, 2) tus pagos fijos (facturas, suscripciones, pensión), 3) tus clientes, y 4) lo que ganas y gastas.</p>
      <div class="btn-grid">
        <button class="btn soft" data-action="new-card">💳 Mi tarjeta</button>
        <button class="btn soft" data-action="new-rec" data-id="factura">🧾 Pago fijo</button>
        <button class="btn soft" data-action="new-client">🤝 Cliente</button>
        <button class="btn soft" data-action="new-tx" data-id="ingreso">💵 Ingreso</button>
      </div>
    </section>`;
  }

  html += `<section class="stats">
    ${stat('Ingresos', tot.income, 'income')}
    ${stat('Gastos', tot.expense, 'expense', tot.onCard ? `${money(tot.onCard)} con tarjeta` : '')}
    ${stat('Ahorro e inversión', tot.saved, 'saving', rate !== null ? `${rate}% de tus ingresos` : '')}
    ${stat('Efectivo disponible', tot.available, tot.available < 0 ? 'expense' : 'primary', 'Lo que te queda en mano')}
  </section>`;

  html += alertsHtml(m, tot);

  // Próximos pagos
  const isCurrent = m === monthOf(todayISO());
  if (isCurrent) {
    const occ = upcomingOccurrences(10);
    const cardRows = cards().map((d) => ({ d, i: debtInfo(d) })).filter(({ i }) => i.toPay > 0 && i.nextDue && i.daysToDue <= 10);
    if (occ.length || cardRows.length) {
      html += `<section class="card list-card">
        <div class="card-head pad"><h2>Próximos pagos</h2><button class="link" data-action="goto" data-id="pagos">Ver todos</button></div>
        ${cardRows.map(({ d, i }) => cardDueRow(d, i)).join('')}
        ${occ.slice(0, 6).map(occRow).join('')}
      </section>`;
    }
  }

  // Por cobrar
  if (state.clients.length) {
    const R = receivables();
    html += `<section class="card">
      <div class="card-head"><h2>Por cobrar a clientes</h2><button class="link" data-action="goto" data-id="clientes">Ver clientes</button></div>
      <div class="facts" style="margin:0">
        <div><span>Te deben</span><b>${money(R.owed)}</b></div>
        <div><span>Facturas atrasadas</span><b style="color:${R.overdueCount ? 'var(--expense)' : 'inherit'}">${R.overdueCount}${R.overdueCount ? ' · ' + money(R.overdueAmt) : ''}</b></div>
        <div><span>Cobrado este mes</span><b style="color:var(--income)">${money(R.collectedMonth)}</b></div>
      </div>
    </section>`;
  }

  html += categoryCard(m);
  html += trendCard(m);

  const T = debtTotals();
  const saved = round2(sum(state.goals, (g) => goalInfo(g).value));
  html += `<section class="card">
    <h2>Resumen general</h2>
    <button class="kv" data-action="goto" data-id="metas"><span>Ahorros e inversiones</span><strong class="num" style="color:var(--saving)">${money(saved)}</strong></button>
    ${T.cardDebt ? `<button class="kv" data-action="goto" data-id="deudas"><span>Deuda de tarjetas</span><strong class="num" style="color:var(--expense)">${money(T.cardDebt)}</strong></button>` : ''}
    <button class="kv" data-action="goto" data-id="deudas"><span>Deudas totales</span><strong class="num" style="color:var(--expense)">${money(T.debt)}</strong></button>
    ${state.clients.length ? `<button class="kv" data-action="goto" data-id="clientes"><span>Te deben tus clientes</span><strong class="num" style="color:var(--income)">${money(receivables().owed)}</strong></button>` : ''}
    <div class="kv"><span><b>Patrimonio neto</b><br><span class="small muted">Lo que tienes y te deben, menos lo que debes</span></span><strong class="num">${money(round2(saved + receivables().owed - T.debt))}</strong></div>
  </section>`;

  const recent = sortTx(txOfMonth(m)).slice(0, 5);
  html += `<section class="card list-card">
    <div class="card-head pad"><h2>Movimientos recientes</h2>${recent.length ? '<button class="link" data-action="goto" data-id="movimientos">Ver todos</button>' : ''}</div>
    ${recent.length ? recent.map((t) => txRow(t, true)).join('') : emptyState('🧾', 'Aún no hay movimientos en ' + monthName(m) + '.')}
  </section>`;
  return html;
}

function alertsHtml(m, tot) {
  const out = [];
  const isCurrent = m === monthOf(todayISO());
  if (tot.income > 0 && tot.available < 0) out.push(alertBox('bad', '⚠️', `Este mes salió <b>${money(-tot.available)}</b> más de lo que entró.`));
  if (isCurrent) {
    const overdueBills = upcomingOccurrences(0).filter((o) => o.s.code === 'vencida');
    if (overdueBills.length) out.push(alertBox('bad', '⏰', `Tienes <b>${plural(overdueBills.length, 'pago fijo vencido', 'pagos fijos vencidos')}</b>: ${overdueBills.slice(0, 3).map((o) => esc(o.r.name)).join(', ')}.`, 'data-action="goto" data-id="pagos"'));
    const R = receivables();
    if (R.overdueCount) out.push(alertBox('', '📨', `Tus clientes tienen <b>${plural(R.overdueCount, 'factura atrasada', 'facturas atrasadas')}</b> por ${money(R.overdueAmt)}.`, 'data-action="goto" data-id="clientes"'));
    for (const d of cards()) {
      const i = debtInfo(d);
      if (i.usage !== null && i.usage >= 0.9) out.push(alertBox('bad', '💳', `Usaste el <b>${Math.round(i.usage * 100)}%</b> del límite de ${esc(d.name)}.`));
    }
    const today = new Date().getDate();
    for (const d of state.debts) {
      if (d.kind === 'tarjeta') continue;
      const i = debtInfo(d);
      if (i.owed <= 0 || !d.dueDay || i.paidThisMonth) continue;
      const diff = d.dueDay - today;
      if (diff >= 0 && diff <= 5) out.push(alertBox('', '📅', `El pago de <b>${esc(d.name)}</b> vence ${diff === 0 ? 'hoy' : diff === 1 ? 'mañana' : `en ${diff} días`}${d.minPayment ? ` (${money(d.minPayment)})` : ''}.`));
      else if (diff < 0) out.push(alertBox('bad', '⏰', `No has registrado el pago de <b>${esc(d.name)}</b> (vencía el día ${d.dueDay}).`));
    }
  }
  const exp = expensesByCategory(m);
  for (const [cat, limit] of Object.entries(state.limits)) {
    if (!(limit > 0)) continue;
    const p = (exp[cat] || 0) / limit;
    if (p >= 1) out.push(alertBox('bad', '🚨', `Pasaste tu límite en <b>${esc(cat)}</b>: ${money(exp[cat])} de ${money(limit)}.`));
    else if (p >= 0.8) out.push(alertBox('', '🔔', `Llevas el ${Math.round(p * 100)}% de tu límite en <b>${esc(cat)}</b>.`));
  }
  const last = state.settings.lastBackup;
  const syncing = syncState.status !== 'off' && syncState.email;
  if (!syncing && state.transactions.length >= 5 && (!last || Date.now() - last > 14 * 86400000)) {
    out.push(alertBox('info', '☁️', `Tus datos solo están en este dispositivo. <b>Activa la sincronización</b> o haz un respaldo en Ajustes.`, 'data-action="goto" data-id="ajustes"'));
  }
  return out.join('');
}

function categoryCard(m) {
  const exp = Object.entries(expensesByCategory(m)).sort((a, b) => b[1] - a[1]);
  const total = sum(exp, (x) => x[1]);
  if (!total) return '';
  const items = exp.slice(0, 7);
  if (exp.length > 7) items.push(['Otras', sum(exp.slice(7), (x) => x[1])]);
  let offset = 0;
  const circles = items.map(([, v], i) => {
    const p = (v / total) * 100;
    const c = `<circle r="15.9155" cx="21" cy="21" stroke="${CHART_COLORS[i % CHART_COLORS.length]}" stroke-dasharray="${p.toFixed(3)} ${(100 - p).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`;
    offset += p;
    return c;
  }).join('');
  const legend = items.map(([cat, v], i) => `<div><i style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></i><span>${esc(cat)}</span><b>${money(v)}</b></div>`).join('');
  return `<section class="card"><h2>Gastos por categoría <span class="muted small num">${money(total)}</span></h2>
    <div class="donut-wrap"><div class="donut"><svg viewBox="0 0 42 42" aria-hidden="true">${circles}</svg></div><div class="legend">${legend}</div></div>
  </section>`;
}

function trendCard(m) {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(m, i - 5));
  const data = months.map((mm) => ({ m: mm, ...monthTotals(mm) }));
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 0);
  if (!max) return '';
  const cols = data.map((d) => `<div class="trend-col ${d.m === m ? 'current' : ''}" title="${esc(monthName(d.m))}: ingresos ${money(d.income)}, gastos ${money(d.expense)}">
      <div class="trend-bars"><i class="in" style="height:${(d.income / max) * 100}%"></i><i class="out" style="height:${(d.expense / max) * 100}%"></i></div>
      <span>${esc(monthName(d.m, true))}</span></div>`).join('');
  return `<section class="card"><h2>Últimos 6 meses</h2><div class="trend">${cols}</div>
    <div class="trend-legend"><span><i style="background:var(--income)"></i>Ingresos</span><span><i style="background:var(--expense)"></i>Gastos</span></div></section>`;
}

/* =========================================================
   Vista: Movimientos
   ========================================================= */
function renderMovimientos() {
  const tot = monthTotals(ui.month);
  return `<section class="mini-stats">
      <div><span>Ingresos</span><strong style="color:var(--income)">${money(tot.income)}</strong></div>
      <div><span>Gastos</span><strong style="color:var(--expense)">${money(tot.expense)}</strong></div>
      <div><span>Ahorro</span><strong style="color:var(--saving)">${money(tot.saved)}</strong></div>
    </section>
    <div class="toolbar">
      <div class="chips">${Object.keys(FILTER_LABEL).map((f) => `<button class="chip" data-action="filter" data-id="${f}" aria-pressed="${ui.txFilter === f}">${FILTER_LABEL[f]}</button>`).join('')}</div>
      <input type="search" class="search" data-input="search" placeholder="Buscar por nota o categoría…" value="${esc(ui.search)}" aria-label="Buscar movimientos">
    </div>
    <section class="card list-card" id="txList">${renderTxList()}</section>`;
}

function renderTxList() {
  let list = txOfMonth(ui.month);
  if (ui.txFilter !== 'todos') list = list.filter((t) => t.type === ui.txFilter);
  const q = normText(ui.search.trim());
  if (q) list = list.filter((t) => normText(`${t.note || ''} ${txTitle(t)} ${t.category}`).includes(q));
  if (!list.length) {
    const filtered = q || ui.txFilter !== 'todos';
    return emptyState(filtered ? '🔍' : '🧾', filtered ? 'No hay movimientos con ese filtro.' : `No hay movimientos en ${monthName(ui.month)}.`,
      filtered ? '' : '<button class="btn primary" data-action="new-tx" data-id="gasto">Agregar movimiento</button>');
  }
  let html = '', last = '';
  for (const t of sortTx(list)) {
    if (t.date !== last) { html += `<div class="day-head">${esc(dateLabel(t.date))}</div>`; last = t.date; }
    html += txRow(t);
  }
  return html;
}

/* =========================================================
   Vista: Pagos fijos
   ========================================================= */
function renderPagos() {
  const m = ui.month;
  const recs = state.recurring;
  if (!recs.length) {
    return `<section class="card">${emptyState('🗓️', 'Agrega tus facturas (luz, agua, internet, teléfono, renta…), tus suscripciones y la pensión alimenticia. Te diré cuándo llega cada factura, hasta qué día tienes para pagarla y cuáles están vencidas.',
      `<div class="btn-grid">
        <button class="btn soft" data-action="new-rec" data-id="factura">🧾 Factura</button>
        <button class="btn soft" data-action="new-rec" data-id="suscripcion">📺 Suscripción</button>
        <button class="btn soft" data-action="new-rec" data-id="pension">🧒 Pensión</button>
        <button class="btn soft" data-action="new-rec" data-id="otro">📌 Otro</button>
      </div>`)}</section>`;
  }
  const occs = recs.flatMap((r) => occurrences(r, m)).map((o) => ({ ...o, s: occStatus(o) }));
  const shown = ui.payFilter === 'todos' ? occs : occs.filter((o) => o.r.kind === ui.payFilter);
  const amountOf = (o) => (o.s.tx ? o.s.tx.amount : Number(o.r.amount) || 0);
  const paid = round2(sum(shown.filter((o) => o.s.code === 'pagada'), amountOf));
  const pendingList = shown.filter((o) => !['pagada', 'omitida'].includes(o.s.code));
  const pendingAmt = round2(sum(pendingList, amountOf));
  const overdue = shown.filter((o) => o.s.code === 'vencida');

  let html = `<section class="stats">
    ${stat('Total del mes', round2(paid + pendingAmt), 'primary', plural(shown.length, 'pago', 'pagos'))}
    ${stat('Pagado', paid, 'income')}
    ${stat('Pendiente', pendingAmt, pendingAmt ? 'expense' : 'income', plural(pendingList.length, 'por pagar', 'por pagar'))}
    ${countStat('Vencidos', overdue.length, overdue.length ? 'expense' : 'income', overdue.length ? money(sum(overdue, amountOf)) : 'Todo al día ✓')}
  </section>
  <div class="toolbar"><div class="chips">
    ${['todos', ...Object.keys(REC_KINDS)].map((k) => `<button class="chip" data-action="pay-filter" data-id="${k}" aria-pressed="${ui.payFilter === k}">${k === 'todos' ? 'Todos' : REC_KINDS[k]}</button>`).join('')}
  </div></div>`;

  const groups = [
    ['vencida', 'Vencidos'], ['porpagar', 'Por pagar'], ['porllegar', 'Por llegar'], ['pagada', 'Pagados'], ['omitida', 'Omitidos']
  ];
  let any = false;
  for (const [code, label] of groups) {
    const list = shown.filter((o) => o.s.code === code).sort((a, b) => a.due.localeCompare(b.due));
    if (!list.length) continue;
    any = true;
    html += `<h2 class="section-title">${label} <span class="muted small">${money(sum(list, amountOf))}</span></h2><section class="card list-card">${list.map(occRow).join('')}</section>`;
  }
  if (!any) html += `<section class="card">${emptyState('✅', 'No hay pagos de este tipo en ' + monthName(m) + '.')}</section>`;

  // Lista completa
  html += `<h2 class="section-title">Tus pagos fijos <button class="link" data-action="new-rec" data-id="${ui.payFilter === 'todos' ? 'factura' : ui.payFilter}">+ Agregar</button></h2>`;
  for (const [kind, label] of Object.entries(REC_KINDS)) {
    if (ui.payFilter !== 'todos' && ui.payFilter !== kind) continue;
    const list = recs.filter((r) => r.kind === kind);
    if (!list.length) continue;
    html += `<section class="card list-card"><div class="card-head pad"><h2>${REC_EMOJI[kind]} ${label}</h2><span class="muted small num">${money(sum(list, monthlyEquivalent))}/mes</span></div>
      ${list.map((r) => `<button class="row" data-action="edit-rec" data-id="${r.id}">
        <span class="row-main"><span class="row-title">${esc(r.name)}${r.active === false ? ' <span class="badge">pausado</span>' : ''}</span>
        <span class="row-sub">${esc(recSchedule(r))} · ${esc(methodLabel(r.cardId))}</span></span>
        <span class="row-amt">${r.variable ? '~' : ''}${money(r.amount)}</span></button>`).join('')}
    </section>`;
  }
  return html;
}
function recSchedule(r) {
  const parts = [];
  if (r.frequency === 'quincenal') parts.push(`Quincenal: días ${r.dueDay} y ${r.dueDay2 || 30}`);
  else if (r.frequency === 'anual') parts.push(`Anual: ${r.dueDay} de ${parseISO(`2000-${String(r.month).padStart(2, '0')}-01`).toLocaleDateString(LOCALE, { month: 'long' })}`);
  else parts.push(`Vence el día ${r.dueDay}`);
  if (r.arriveDay && r.frequency !== 'quincenal') parts.push(`llega el ${r.arriveDay}`);
  if (r.autopay) parts.push('automático');
  return parts.join(', ');
}

/* =========================================================
   Vista: Deudas y tarjetas
   ========================================================= */
function renderDeudas() {
  const list = state.debts.map((d) => ({ d, i: debtInfo(d) }));
  if (!list.length) {
    return `<section class="card">${emptyState('💳', 'Agrega tu tarjeta de crédito para que cada compra que hagas con ella sume a lo que le debes. También puedes agregar préstamos o dinero que le debas a alguien.',
      '<div class="btn-grid"><button class="btn primary" data-action="new-card">💳 Agregar tarjeta</button><button class="btn soft" data-action="new-debt">🏦 Otra deuda</button></div>')}</section>`;
  }
  const T = debtTotals();
  const cm = monthOf(todayISO());
  const paidMonth = round2(sum(state.transactions.filter((t) => t.debtId && monthOf(t.date) === cm), (t) => t.amount));
  const cardList = list.filter((x) => x.d.kind === 'tarjeta');
  const others = list.filter((x) => x.d.kind !== 'tarjeta');
  const active = others.filter((x) => x.i.owed > 0);
  const done = others.filter((x) => x.i.owed <= 0);

  let html = `<section class="stats">
    ${stat('Deuda total', T.debt, 'expense')}
    ${stat('Pagado este mes', paidMonth, 'income')}
    <div class="stat big"><span>Pagos mínimos al mes</span><strong>${money(T.minPayments)}</strong></div>
  </section>`;

  if (cardList.length) html += `<h2 class="section-title">Tarjetas de crédito</h2>` + cardList.map(({ d, i }) => cardCard(d, i)).join('');

  const debtsWithBalance = [...active, ...cardList.filter((x) => x.i.owed > 0)];
  if (debtsWithBalance.length > 1) {
    if (ui.debtStrategy === 'avalanche') debtsWithBalance.sort((a, b) => (b.d.rate || 0) - (a.d.rate || 0) || a.i.owed - b.i.owed);
    else debtsWithBalance.sort((a, b) => a.i.owed - b.i.owed);
    const first = debtsWithBalance[0];
    html += `<section class="card">
      <h2>¿Cuál pagar primero?</h2>
      <div class="seg-toggle">
        <button data-action="strategy" data-id="avalanche" aria-pressed="${ui.debtStrategy === 'avalanche'}">Avalancha</button>
        <button data-action="strategy" data-id="snowball" aria-pressed="${ui.debtStrategy === 'snowball'}">Bola de nieve</button>
      </div>
      <p class="hint">${ui.debtStrategy === 'avalanche'
        ? 'Paga el mínimo en todas y todo lo extra a la de <b>mayor interés</b>. Así pagas menos intereses en total.'
        : 'Paga el mínimo en todas y todo lo extra a la de <b>menor saldo</b>. Saldas deudas más rápido y te mantiene motivado.'}</p>
      <p class="small" style="margin-top:8px">👉 Enfócate en: <b>${esc(first.d.name)}</b> (${money(first.i.owed)}${first.d.rate ? `, ${first.d.rate}% anual` : ''})</p>
    </section>`;
  }

  if (active.length) html += `<h2 class="section-title">Préstamos y otras deudas</h2>` + active.map(({ d, i }) => debtCard(d, i)).join('');
  if (done.length) html += `<h2 class="section-title">Deudas saldadas 🎉</h2>` + done.map(({ d, i }) => debtCard(d, i)).join('');
  html += `<div class="btn-row" style="margin-top:8px"><button class="btn soft" data-action="new-card">+ Tarjeta</button><button class="btn soft" data-action="new-debt">+ Otra deuda</button></div>`;
  return html;
}

function payoffText(d, i) {
  if (i.owed <= 0) return '';
  if (i.months === null) return 'Agrega un pago mínimo para estimar cuándo terminas.';
  if (i.months === Infinity) return '⚠️ El pago mínimo no cubre los intereses: la deuda no bajará. Intenta pagar más.';
  const end = new Date(); end.setMonth(end.getMonth() + i.months);
  return `Si solo pagas el mínimo terminas en <b>${plural(i.months, 'mes', 'meses')}</b> (${end.toLocaleDateString(LOCALE, { month: 'short', year: 'numeric' })})` +
    (i.interest ? ` y pagarías unos <b>${money(i.interest)}</b> de intereses.` : '.');
}

function cardCard(d, i) {
  const usageTone = i.usage === null ? '' : i.usage >= 0.9 ? 'bad' : i.usage >= 0.3 ? 'warn' : 'income';
  let due = '';
  if (i.nextDue) {
    if (i.toPay > 0) {
      due = alertBox(i.daysToDue < 0 ? 'bad' : i.daysToDue <= 5 ? '' : 'info', '📅',
        `Paga <b>${money(i.toPay)}</b> antes del <b>${longDate(i.nextDue)}</b> ${i.daysToDue < 0 ? '(¡ya venció!)' : i.daysToDue === 0 ? '(¡hoy!)' : `(en ${plural(i.daysToDue, 'día', 'días')})`} para no pagar intereses.`);
    } else if (i.lastCut) {
      due = alertBox('good', '✅', `Saldo del último corte cubierto. Próxima fecha de pago: ${longDate(i.nextDue)}.`);
    }
  }
  return `<section class="card">
    <div class="item-head">
      <span class="avatar">💳</span>
      <div class="item-title"><h3>${esc(d.name)}</h3><div class="badges">
        ${d.cutDay ? `<span class="badge">Corte: día ${d.cutDay}</span>` : ''}${d.dueDay ? `<span class="badge">Pago: día ${d.dueDay}</span>` : ''}
        ${i.owed <= 0 ? '<span class="badge good">Sin deuda ✓</span>' : ''}</div></div>
      ${editBtn('edit-debt', d.id, d.name)}
    </div>
    <div class="amount-line"><strong style="color:${i.owed > 0 ? 'var(--expense)' : 'var(--income)'}">${money(i.balance)}</strong><span class="muted small">${i.balance < 0 ? 'saldo a favor' : 'debes en total'}</span></div>
    ${i.usage !== null ? `${bar(i.usage, usageTone)}<div class="budget-foot"><span>Usas el ${Math.round(i.usage * 100)}% de ${money(d.creditLimit)}</span><span>Disponible ${money(i.available)}</span></div>` : ''}
    <div class="facts">
      ${i.lastCut ? `<div><span>Saldo al corte (${shortDate(i.lastCut)})</span><b>${money(i.statement)}</b></div>` : ''}
      <div><span>Compras ${i.lastCut ? 'desde el corte' : 'este mes'}</span><b>${money(i.lastCut ? i.sinceCut : i.monthCharges)}</b></div>
      <div><span>Pago mínimo</span><b>${d.minPayment ? money(d.minPayment) : '—'}</b></div>
      <div><span>Interés anual</span><b>${d.rate ? d.rate + '%' : '—'}</b></div>
    </div>
    ${due}
    ${i.owed > 0 ? `<p class="small">${payoffText(d, i)}</p>` : ''}
    <div class="btn-row">
      <button class="btn primary" data-action="pay-debt" data-id="${d.id}">Pagar tarjeta</button>
      <button class="btn" data-action="card-purchase" data-id="${d.id}">+ Compra</button>
    </div>
  </section>`;
}

function debtCard(d, i) {
  const badges = [`<span class="badge">${DEBT_KINDS[d.kind] || 'Deuda'}</span>`];
  if (i.owed <= 0) badges.push('<span class="badge good">Saldada ✓</span>');
  else if (i.paidThisMonth) badges.push('<span class="badge good">Pagada este mes ✓</span>');
  return `<section class="card">
    <div class="item-head">
      <span class="avatar">${DEBT_EMOJI[d.kind] || '📄'}</span>
      <div class="item-title"><h3>${esc(d.name)}</h3><div class="badges">${badges.join('')}</div></div>
      ${editBtn('edit-debt', d.id, d.name)}
    </div>
    <div class="amount-line"><strong style="color:${i.owed > 0 ? 'var(--expense)' : 'var(--income)'}">${money(i.owed)}</strong><span class="muted small">pagado ${money(i.paid)} (${Math.round(i.progress * 100)}%)</span></div>
    ${bar(i.progress, 'income')}
    ${i.owed > 0 ? `<div class="facts">
      <div><span>Interés anual</span><b>${d.rate ? d.rate + '%' : '—'}</b></div>
      <div><span>Pago mínimo</span><b>${d.minPayment ? money(d.minPayment) : '—'}</b></div>
      <div><span>Día de pago</span><b>${d.dueDay || '—'}</b></div>
    </div>
    <p class="small">${payoffText(d, i)}</p>
    <button class="btn primary block" data-action="pay-debt" data-id="${d.id}">Registrar pago</button>` : ''}
  </section>`;
}

/* =========================================================
   Vista: Clientes
   ========================================================= */
function renderClientes() {
  if (!state.clients.length) {
    return `<section class="card">${emptyState('🤝', 'Agrega a tus clientes con lo que te pagan y cada cuánto. Luego registra sus facturas y te diré cuánto te deben y cuáles están atrasadas.',
      '<button class="btn primary" data-action="new-client">Agregar cliente</button>')}</section>`;
  }
  const R = receivables();
  const cm = monthOf(todayISO());
  const missing = missingInvoices(cm);
  const monthlyExpected = round2(sum(state.clients.filter((c) => c.active !== false), (c) => c.frequency === 'quincenal' ? c.amount * 2 : c.frequency === 'semanal' ? c.amount * 4.33 : c.frequency === 'mensual' ? c.amount : 0));
  let html = `<section class="stats">
    ${stat('Te deben', R.owed, 'primary', plural(R.count, 'factura pendiente', 'facturas pendientes'))}
    ${countStat('Facturas atrasadas', R.overdueCount, R.overdueCount ? 'expense' : 'income', R.overdueCount ? money(R.overdueAmt) : 'Todo al día ✓')}
    ${stat('Cobrado este mes', R.collectedMonth, 'income')}
    ${stat('Ingreso fijo esperado', monthlyExpected, 'saving', 'al mes, de clientes fijos')}
  </section>`;
  if (missing.length) {
    html += alertBox('info', '🧾', `Faltan <b>${plural(missing.length, 'factura', 'facturas')}</b> de ${monthName(cm)} para tus clientes fijos (${money(sum(missing, (i) => i.amount))}). <b>Toca para crearlas.</b>`, 'data-action="gen-invoices"');
  }
  const infos = state.clients.map((c) => ({ c, i: clientInfo(c) }))
    .sort((a, b) => (b.i.overdue.length - a.i.overdue.length) || (b.i.owed - a.i.owed) || a.c.name.localeCompare(b.c.name));
  html += `<section class="card list-card">${infos.map(({ c, i }) => {
    const sub = [c.amount ? `${money(c.amount)} ${(CLIENT_FREQ[c.frequency] || '').toLowerCase()}` : CLIENT_FREQ[c.frequency] || ''];
    if (i.lastPaid) sub.push('último pago ' + shortDate(i.lastPaid.paidDate));
    const badge = i.overdue.length ? `<span class="badge bad">${plural(i.overdue.length, 'atrasada', 'atrasadas')}</span>`
      : i.unpaid.length ? `<span class="badge warn">${plural(i.unpaid.length, 'pendiente', 'pendientes')}</span>` : '<span class="badge good">Al día ✓</span>';
    return `<button class="row" data-action="open-client" data-id="${c.id}">
      <span class="avatar t-ingreso">${esc((c.name || '?').charAt(0).toUpperCase())}</span>
      <span class="row-main"><span class="row-title">${esc(c.name)}${c.active === false ? ' <span class="badge">inactivo</span>' : ''}</span><span class="row-sub">${esc(sub.filter(Boolean).join(' · '))}</span></span>
      <span class="row-end"><span class="row-amt">${i.owed ? money(i.owed) : ''}</span>${badge}</span>
    </button>`;
  }).join('')}</section>`;
  if (R.overdue.length) {
    html += `<h2 class="section-title">Facturas atrasadas</h2><section class="card list-card">${R.overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((inv) => invoiceRow(inv, true)).join('')}</section>`;
  }
  return html;
}

function invoiceRow(inv, withClient = false) {
  const s = invoiceStatus(inv);
  const c = findClient(inv.clientId);
  const badge = s.code === 'pagada' ? `<span class="badge good">Pagada ${shortDate(inv.paidDate)}</span>`
    : s.code === 'atrasada' ? `<span class="badge bad">Atrasada ${plural(s.days, 'día', 'días')}</span>`
      : `<span class="badge warn">${s.days === null ? 'Pendiente' : s.days === 0 ? 'Vence hoy' : `Vence en ${plural(s.days, 'día', 'días')}`}</span>`;
  const title = (withClient && c ? c.name + ' · ' : '') + (inv.number ? `Factura #${inv.number}` : 'Factura');
  const sub = [`Emitida ${shortDate(inv.issueDate)}`];
  if (inv.dueDate) sub.push(`vence ${shortDate(inv.dueDate)}`);
  if (inv.note) sub.push(inv.note);
  return `<div class="row-wrap">
    <button class="row" data-action="edit-invoice" data-id="${inv.id}">
      <span class="row-main"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub.join(' · '))}</span></span>
      <span class="row-end"><span class="row-amt">${money(inv.amount)}</span>${badge}</span>
    </button>
    ${s.code !== 'pagada' ? `<button class="btn sm soft" data-action="collect-invoice" data-id="${inv.id}">Cobrar</button>` : ''}
  </div>`;
}

function renderCliente() {
  const c = findClient(ui.clientId);
  const i = clientInfo(c);
  const unpaid = i.unpaid.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const paid = i.inv.filter((x) => x.paidDate).sort((a, b) => b.paidDate.localeCompare(a.paidDate));
  const collectedYear = round2(sum(paid.filter((x) => x.paidDate.startsWith(todayISO().slice(0, 4))), (x) => x.paidAmount ?? x.amount));
  let html = `<section class="card">
    <div class="item-head">
      <span class="avatar t-ingreso">${esc(c.name.charAt(0).toUpperCase())}</span>
      <div class="item-title"><h3>${esc(c.name)}</h3><div class="badges">
        <span class="badge">${CLIENT_FREQ[c.frequency] || ''}</span>
        ${c.billingDay && ['mensual', 'quincenal'].includes(c.frequency) ? `<span class="badge">Facturas el día ${c.billingDay}${c.frequency === 'quincenal' ? ' y ' + (c.billingDay2 || 16) : ''}</span>` : ''}
        ${c.terms ? `<span class="badge">Paga a ${c.terms} días</span>` : ''}</div>
        ${c.contact ? `<p class="small muted" style="margin:6px 0 0">${esc(c.contact)}</p>` : ''}
      </div>
      ${editBtn('edit-client', c.id, c.name)}
    </div>
    <div class="facts" style="margin-bottom:0">
      <div><span>Te paga</span><b>${c.amount ? money(c.amount) : '—'}</b></div>
      <div><span>Te debe</span><b style="color:${i.owed ? 'var(--expense)' : 'inherit'}">${money(i.owed)}</b></div>
      <div><span>Atrasadas</span><b style="color:${i.overdue.length ? 'var(--expense)' : 'inherit'}">${i.overdue.length}${i.overdue.length ? ' · ' + money(i.overdueAmt) : ''}</b></div>
      <div><span>Cobrado este año</span><b style="color:var(--income)">${money(collectedYear)}</b></div>
    </div>
    ${c.note ? `<p class="small muted" style="margin-top:10px">${esc(c.note)}</p>` : ''}
  </section>
  <h2 class="section-title">Pendientes de cobro <button class="link" data-action="new-invoice" data-id="${c.id}">+ Factura</button></h2>
  <section class="card list-card">${unpaid.length ? unpaid.map((x) => invoiceRow(x)).join('') : emptyState('✅', 'Este cliente no te debe nada.')}</section>`;
  if (paid.length) {
    const shownPaid = ui.showPaidInv ? paid : paid.slice(0, 5);
    html += `<h2 class="section-title">Pagadas</h2><section class="card list-card">${shownPaid.map((x) => invoiceRow(x)).join('')}
      ${paid.length > 5 && !ui.showPaidInv ? `<button class="link" style="padding:10px" data-action="show-paid">Ver las ${paid.length}</button>` : ''}</section>`;
  }
  return html;
}

/* =========================================================
   Vista: Más, Metas, Presupuesto, Ajustes
   ========================================================= */
function renderMas() {
  const saved = round2(sum(state.goals, (g) => goalInfo(g).value));
  const tot = monthTotals(monthOf(todayISO()));
  const s = syncState;
  const syncText = s.status === 'off' ? 'Sin configurar' : s.email ? (s.status === 'synced' ? 'Sincronizado ✓' : s.status === 'offline' ? 'Sin conexión' : 'Sincronizando…') : 'Sin iniciar sesión';
  return `<div class="tiles">
    <button class="tile" data-action="goto" data-id="metas"><span class="tile-ico">🎯</span><b>Metas y ahorro</b><span>${money(saved)} ahorrados</span></button>
    <button class="tile" data-action="goto" data-id="presupuesto"><span class="tile-ico">📊</span><b>Presupuesto</b><span>${money(tot.expense)} gastados este mes</span></button>
    <button class="tile" data-action="goto" data-id="ajustes"><span class="tile-ico">☁️</span><b>Sincronización</b><span>${syncText}</span></button>
    <button class="tile" data-action="goto" data-id="ajustes"><span class="tile-ico">⚙️</span><b>Ajustes</b><span>Moneda, categorías, respaldo</span></button>
  </div>`;
}

function renderMetas() {
  const cm = monthOf(todayISO());
  const monthSaved = round2(sum(state.transactions.filter((t) => t.type === 'ahorro' && monthOf(t.date) === cm), (t) => t.amount));
  const infos = state.goals.map((g) => ({ g, i: goalInfo(g) }));
  let html = '';
  if (infos.length) html += `<section class="stats">${stat('Total ahorrado', sum(infos, (x) => x.i.value), 'saving')}${stat('Aportado este mes', monthSaved, 'income')}</section>`;
  if (!state.goals.some((g) => g.kind === 'emergencia')) {
    const avg = avgMonthlyExpense();
    html += alertBox('info', '🛟', `<b>Empieza por un fondo de emergencia.</b> Lo usual es guardar de 3 a 6 meses de gastos para imprevistos${avg ? ` (con tus gastos, entre <b>${money(avg * 3)}</b> y <b>${money(avg * 6)}</b>)` : ''}. <b>Toca para crearlo.</b>`, 'data-action="new-emergency"');
  }
  if (!infos.length) {
    html += `<section class="card">${emptyState('🎯', 'Crea metas para ahorrar (un viaje, un carro), tu fondo de emergencia o tus inversiones, y registra cada aporte.', '<button class="btn primary" data-action="new-goal">Nueva meta</button>')}</section>`;
    return html;
  }
  const order = { emergencia: 0, ahorro: 1, inversion: 2 };
  infos.sort((a, b) => (order[a.g.kind] ?? 9) - (order[b.g.kind] ?? 9));
  return html + infos.map(({ g, i }) => goalCard(g, i)).join('');
}

function goalCard(g, i) {
  let line;
  if (i.remaining <= 0) line = '🎉 ¡Meta cumplida!';
  else if (i.overdue) line = `La fecha objetivo ya pasó. Te faltan <b>${money(i.remaining)}</b>.`;
  else if (i.perMonth) line = `Te faltan <b>${money(i.remaining)}</b>. Aporta <b>${money(i.perMonth)}</b> al mes para lograrlo antes del ${esc(longDate(g.deadline))}.`;
  else line = `Te faltan <b>${money(i.remaining)}</b>.`;
  const inv = g.kind === 'inversion' && Number.isFinite(g.currentValue)
    ? `<div class="facts"><div><span>Aportado</span><b>${money(i.saved)}</b></div><div><span>Valor actual</span><b>${money(i.value)}</b></div>
       <div><span>Rendimiento</span><b style="color:${i.gain >= 0 ? 'var(--income)' : 'var(--expense)'}">${i.gain >= 0 ? '+' : ''}${money(i.gain)}${i.saved > 0 ? ` (${i.gain >= 0 ? '+' : ''}${((i.gain / i.saved) * 100).toFixed(1)}%)` : ''}</b></div></div>`
    : '';
  const kindBadge = g.kind === 'inversion' ? 'saving' : g.kind === 'emergencia' ? 'warn' : 'primary';
  return `<section class="card">
    <div class="item-head">
      <span class="avatar">${GOAL_EMOJI[g.kind] || '🎯'}</span>
      <div class="item-title"><h3>${esc(g.name)}</h3><div class="badges"><span class="badge ${kindBadge}">${GOAL_KINDS[g.kind] || 'Meta'}</span></div></div>
      ${editBtn('edit-goal', g.id, g.name)}
    </div>
    <div class="amount-line"><strong style="color:var(--saving)">${money(i.saved)}</strong><span class="muted small">de ${money(i.target)} · ${Math.round(i.pct * 100)}%</span></div>
    ${bar(i.pct, i.pct >= 1 ? 'income' : 'saving')}
    ${inv}
    <p class="small" style="margin-top:10px">${line}</p>
    <div class="btn-row">
      <button class="btn primary" data-action="contrib-goal" data-id="${g.id}">+ Aportar</button>
      <button class="btn" data-action="withdraw-goal" data-id="${g.id}">Retirar</button>
    </div>
  </section>`;
}

function renderPresupuesto() {
  const m = ui.month;
  const tot = monthTotals(m);
  const exp = expensesByCategory(m);
  const base = tot.income > 0 ? tot.income : (Number(state.settings.expectedIncome) || 0);
  const usingExpected = !(tot.income > 0) && base > 0;
  const allCats = [...new Set([...state.categories.gasto, ...Object.keys(exp)])];
  const spentBy = (grp) => round2(sum(allCats.filter((c) => groupOf(c) === grp), (c) => exp[c] || 0));
  const fixedMonthly = round2(sum(state.recurring, monthlyEquivalent));
  let html = `<section class="card">
    <div class="card-head"><h2>Ingreso del mes</h2><button class="link" data-action="edit-income">Ingreso esperado</button></div>
    <div class="amount-line"><strong>${money(base)}</strong>${usingExpected ? '<span class="badge">ingreso esperado</span>' : ''}</div>
    <p class="hint">${base ? (usingExpected ? 'Aún no registras ingresos este mes, así que uso tu ingreso esperado.' : 'Basado en los ingresos que registraste este mes.') : 'Registra tus ingresos o define un ingreso mensual esperado para calcular tu presupuesto.'}</p>
    ${fixedMonthly ? `<p class="small" style="margin-top:8px">Tus pagos fijos suman <b>${money(fixedMonthly)}</b> al mes${base ? ` (${Math.round((fixedMonthly / base) * 100)}% de tu ingreso)` : ''}.</p>` : ''}
  </section>`;

  const S = state.split;
  const groups = [
    ['needs', 'Necesidades', 'Vivienda, comida, servicios, transporte, pensión, deudas', spentBy('needs'), false],
    ['wants', 'Deseos', 'Salidas, compras, entretenimiento, suscripciones', spentBy('wants'), false],
    ['savings', 'Ahorro e inversión', 'Aportes a tus metas, fondo de emergencia e inversiones', tot.saved, true]
  ];
  html += `<section class="card">
    <div class="card-head"><h2>Distribución ${S.needs}/${S.wants}/${S.savings}</h2><button class="link" data-action="edit-split">Ajustar</button></div>
    ${groups.map(([key, label, desc, actual, isSaving]) => {
    const target = round2((base * S[key]) / 100);
    const p = target > 0 ? actual / target : (actual > 0 ? 1 : 0);
    const tone = isSaving ? (p >= 1 ? 'income' : 'saving') : (p > 1 ? 'bad' : p >= 0.85 ? 'warn' : '');
    const diff = round2(target - actual);
    const foot = isSaving ? (diff > 0 ? `Te faltan ${money(diff)}` : '¡Cumpliste tu meta de ahorro! 🎉') : (diff >= 0 ? `Te quedan ${money(diff)}` : `Te pasaste ${money(-diff)}`);
    return `<div class="budget-row">
        <div class="budget-top"><b>${label} · ${S[key]}%</b><span class="num">${money(actual)} / ${money(target)}</span></div>
        ${bar(p, tone)}
        <div class="budget-foot"><span>${desc}</span><span style="white-space:nowrap">${base ? foot : ''}</span></div>
      </div>`;
  }).join('')}
    <p class="hint">La regla 50/30/20 es una guía general muy usada: puedes ajustar los porcentajes a tu realidad.</p>
  </section>`;

  html += `<section class="card"><div class="card-head"><h2>Límites por categoría</h2></div>
    <p class="hint" style="margin:-6px 0 6px">Toca una categoría para ponerle un límite mensual y te avisaré cuando te acerques.</p>
    ${allCats.map((c) => {
    const spent = exp[c] || 0, limit = Number(state.limits[c]) || 0;
    const p = limit ? spent / limit : 0;
    return `<button class="budget-row" data-action="edit-limit" data-id="${esc(c)}">
        <div class="budget-top"><b>${esc(emojiFor(c))} ${esc(c)} <span class="badge">${GROUP_LABEL[groupOf(c)]}</span></b>
        <span class="num">${money(spent)}${limit ? ' / ' + money(limit) : ''}</span></div>
        ${limit ? bar(p, p > 1 ? 'bad' : p >= 0.8 ? 'warn' : '') : '<div class="budget-foot"><span>Sin límite</span></div>'}
      </button>`;
  }).join('')}
  </section>`;
  return html;
}

function syncCardHtml() {
  const s = syncState;
  const n = window.App.pendingCount();
  let body;
  if (s.status === 'off') {
    body = `<p class="small muted">Para que tus datos aparezcan solos en todos tus dispositivos, la app necesita conectarse a tu cuenta gratuita de Firebase (de Google). Es un paso único: sigue la guía en <b>LEEME.md</b>. Mientras tanto, usa el respaldo de abajo.</p>`;
  } else if (s.status === 'loading' && !s.email) {
    body = `<p class="small muted">Conectando…</p>`;
  } else if (s.status === 'signedout' || (!s.email && s.status !== 'offline')) {
    body = `<p class="small muted">Entra con tu cuenta (la misma en todos tus dispositivos). Si es la primera vez, toca <b>Crear cuenta</b>.</p>
      <form id="loginForm" class="login" autocomplete="on">
        <input type="email" name="email" placeholder="Correo electrónico" autocomplete="username" required>
        <input type="password" name="password" placeholder="Contraseña (mínimo 6 caracteres)" autocomplete="current-password" required minlength="6">
        <div class="btn-row"><button class="btn primary" type="submit">Entrar</button><button class="btn" type="button" data-action="sign-up">Crear cuenta</button></div>
        <button class="link" type="button" data-action="reset-pw" style="padding:8px 0 0">Olvidé mi contraseña</button>
      </form>${s.message ? `<p class="small" style="color:var(--expense)">${esc(s.message)}</p>` : ''}`;
  } else if (!s.email) {
    body = `<p class="small muted">${esc(s.message || 'Sin conexión. La sincronización se activará cuando haya internet.')}</p>`;
  } else {
    const line = s.status === 'error' ? `<span style="color:var(--expense)">⚠️ ${esc(s.message || 'Error al sincronizar')}</span>`
      : !navigator.onLine || s.status === 'offline' ? `📴 Sin internet. ${n ? `${plural(n, 'cambio se subirá', 'cambios se subirán')} al reconectar.` : 'Tus cambios se subirán al reconectar.'}`
        : n || s.status === 'syncing' ? `🔄 Sincronizando${n ? ` ${plural(n, 'cambio', 'cambios')}` : ''}…`
          : '✅ Todo sincronizado';
    body = `<p class="small">Conectado como <b>${esc(s.email)}</b></p><p class="small">${line}</p>
      <div class="btn-row"><button class="btn" data-action="sync-now">Sincronizar ahora</button><button class="btn danger-ghost" data-action="sign-out">Cerrar sesión</button></div>`;
  }
  return `<h2>☁️ Sincronización automática</h2>${body}`;
}

function refreshSyncUi() {
  const card = $('#syncCard');
  if (card && !card.contains(document.activeElement)) card.innerHTML = syncCardHtml();
  const dot = $('#syncDot');
  if (dot) {
    const s = syncState;
    const n = window.App.pendingCount();
    dot.className = 'sync-dot ' + (s.status === 'off' || !s.email ? 'hidden' : s.status === 'error' ? 'bad' : (!navigator.onLine || s.status === 'offline') ? 'warn' : n ? 'busy' : 'ok');
  }
}

function renderAjustes() {
  const s = state.settings;
  const last = s.lastBackup ? new Date(s.lastBackup).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }) : 'nunca';
  const canShare = typeof navigator.share === 'function';
  const catBlock = (type, label) => `<h3 class="small muted" style="margin-top:8px">${label}</h3>
    <div class="tags">${state.categories[type].map((c) => FIXED_CATS[type].includes(c)
    ? `<span class="tag fixed">${esc(emojiFor(c))} ${esc(c)}</span>`
    : `<span class="tag">${esc(emojiFor(c))} ${esc(c)}<button data-action="del-cat" data-type="${type}" data-id="${esc(c)}" aria-label="Quitar ${esc(c)}">✕</button></span>`).join('')}</div>
    <div class="add-inline"><input id="newcat-${type}" placeholder="Nueva categoría" maxlength="30" aria-label="Nueva categoría de ${label.toLowerCase()}"><button class="btn sm" data-action="add-cat" data-type="${type}">Agregar</button></div>`;

  return `<section class="card" id="syncCard">${syncCardHtml()}</section>
    <section class="card">
      <h2>General</h2>
      <label class="setting"><span>Moneda</span><select data-setting="currency">${CURRENCIES.map(([c, n]) => `<option value="${c}" ${c === s.currency ? 'selected' : ''}>${c} · ${n}</option>`).join('')}</select></label>
      <label class="setting"><span>Tema</span><select data-setting="theme">
        <option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Automático</option>
        <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Claro</option>
        <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Oscuro</option></select></label>
      <button class="setting kv" data-action="edit-income"><span>Ingreso mensual esperado</span><strong class="num">${money(s.expectedIncome)}</strong></button>
    </section>
    <section class="card">
      <h2>Respaldo manual</h2>
      <p class="small muted">Una copia de todos tus datos en un archivo. Útil aunque uses la sincronización.</p>
      <p class="small">Último respaldo: <b>${esc(last)}</b></p>
      <div class="btn-row" style="margin-bottom:8px">
        ${canShare ? '<button class="btn primary" data-action="share-backup">Compartir respaldo</button>' : ''}
        <button class="btn ${canShare ? '' : 'primary'}" data-action="download-backup">Descargar respaldo</button>
      </div>
      <div class="btn-row">
        <button class="btn" data-action="import">Importar respaldo</button>
        <button class="btn" data-action="csv">Exportar a Excel</button>
      </div>
    </section>
    <section class="card"><h2>Categorías</h2>${catBlock('ingreso', 'Ingresos')}${catBlock('gasto', 'Gastos')}</section>
    <section class="card">
      <h2>Zona de cuidado</h2>
      <p class="small muted">Borra todos tus datos de este dispositivo${syncState.email ? ' y de tu cuenta sincronizada' : ''}. Haz un respaldo antes.</p>
      <button class="btn danger-ghost" style="padding-left:0" data-action="reset">Borrar todos mis datos</button>
    </section>
    <p class="hint" style="text-align:center">Mis Finanzas v${APP_VERSION} · ${state.transactions.length} movimientos guardados</p>`;
}

const VIEWS = {
  inicio: renderInicio, movimientos: renderMovimientos, pagos: renderPagos, deudas: renderDeudas, clientes: renderClientes,
  cliente: renderCliente, mas: renderMas, metas: renderMetas, presupuesto: renderPresupuesto, ajustes: renderAjustes
};

/* =========================================================
   Hoja de formularios
   ========================================================= */
const sheet = $('#sheet');
const sheetForm = $('#sheetForm');
let sheetHandlers = {};

function openSheet({ title, body, submitLabel = 'Guardar', onSubmit, onDelete, deleteLabel = 'Eliminar', onChange }) {
  sheetHandlers = { onSubmit, onDelete, onChange };
  sheetForm.innerHTML = `
    <div class="sheet-head"><h2 id="sheetTitle">${esc(title)}</h2>
      <button type="button" class="icon-btn" data-sheet="close" aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="sheet-body">${body}</div>
    <div class="sheet-actions">
      ${onDelete ? `<button type="button" class="btn danger-ghost" data-sheet="delete">${esc(deleteLabel)}</button>` : ''}
      <button type="submit" class="btn primary">${esc(submitLabel)}</button>
    </div>`;
  syncDependentFields();
  if (!sheet.open) sheet.showModal();
  const focus = sheetForm.querySelector('[data-autofocus]');
  if (focus) setTimeout(() => { focus.focus(); if (focus.select) focus.select(); }, 80);
}
function closeSheet() { if (sheet.open) sheet.close(); }
sheet.addEventListener('close', () => { if (renderQueued) { renderQueued = false; render(); } });

/** Muestra/oculta campos según otro campo: data-dep="type" data-for="gasto ahorro" */
function syncDependentFields() {
  for (const el of sheetForm.querySelectorAll('[data-for]')) {
    const dep = sheetForm.elements[el.dataset.dep || 'type'];
    const val = dep ? (dep.type === 'checkbox' ? (dep.checked ? 'on' : 'off') : dep.value) : '';
    const on = el.dataset.for.split(' ').includes(val);
    el.hidden = !on;
    for (const input of el.querySelectorAll('input, select, textarea')) input.disabled = !on;
  }
}

function afterChange(message) {
  save();
  render();
  if (message) toast(message);
}

sheetForm.addEventListener('change', (e) => {
  if (sheetHandlers.onChange) sheetHandlers.onChange(e, sheetForm);
  syncDependentFields();
});
sheetForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!sheetHandlers.onSubmit) return closeSheet();
  const data = Object.fromEntries(new FormData(sheetForm));
  const result = sheetHandlers.onSubmit(data);
  if (result === false) return;
  closeSheet();
  afterChange(typeof result === 'string' ? result : '');
});
sheetForm.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sheet]');
  if (!b) {
    const quick = e.target.closest('[data-fill]');
    if (quick) { const inp = sheetForm.elements[quick.dataset.target || 'amount']; if (inp) inp.value = quick.dataset.fill; }
    return;
  }
  if (b.dataset.sheet === 'close') closeSheet();
  if (b.dataset.sheet === 'delete' && sheetHandlers.onDelete) {
    const result = sheetHandlers.onDelete();
    if (result === false) return;
    closeSheet();
    afterChange(typeof result === 'string' ? result : 'Eliminado');
  }
});
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

function fail(msg) { toast(msg, 'error'); return false; }

const field = (label, inner, attrs = '') => `<label class="field" ${attrs}><span>${label}</span>${inner}</label>`;
const amountInput = (name, value, extra = '') =>
  `<input name="${name}" class="amount-input" inputmode="decimal" autocomplete="off" placeholder="0" value="${value === '' || value === undefined || value === null ? '' : esc(value)}" ${extra}>`;
const numInput = (name, value, ph, extra = '') => `<input name="${name}" inputmode="decimal" autocomplete="off" placeholder="${ph}" value="${value === undefined || value === null || value === '' ? '' : esc(value)}" ${extra}>`;
const dayInput = (name, value, extra = '') => `<input name="${name}" type="number" inputmode="numeric" min="1" max="31" placeholder="1–31" value="${value || ''}" ${extra}>`;
const checkbox = (name, label, checked) => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
const quickFill = (items) => `<div class="quick">${items.filter(([, v]) => v > 0).map(([label, v]) => `<button type="button" class="chip" data-fill="${v}">${label}: ${money(v)}</button>`).join('')}</div>`;
const toDay = (v) => (v ? clamp(parseInt(v, 10) || 0, 1, 31) : null);

/* --- Movimiento --- */
function defaultDate() { const cm = monthOf(todayISO()); return ui.month === cm ? todayISO() : ui.month + '-01'; }
function validCard(id) { return id && findDebt(id)?.kind === 'tarjeta' ? id : ''; }

function txForm(tx, presetType = 'gasto', preset = {}) {
  if (tx && tx.type === 'pago') return payDebtForm(findDebt(tx.debtId), tx);
  const type = tx ? tx.type : presetType;
  const goals = state.goals;
  const loans = state.debts.filter((d) => d.kind !== 'tarjeta' && (debtInfo(d).owed > 0 || (tx && tx.debtId === d.id)));
  const goalId = tx?.goalId || preset.goalId || goals[0]?.id || '';
  const method = tx ? (tx.cardId || '') : validCard(preset.cardId ?? state.settings.lastMethod);
  const body = `
    <div class="seg" role="radiogroup" aria-label="Tipo">
      ${['ingreso', 'gasto', 'ahorro'].map((t) => `<label class="seg-item seg-${t}"><input type="radio" name="type" value="${t}" ${t === type ? 'checked' : ''}><span>${TYPE_LABEL[t]}</span></label>`).join('')}
    </div>
    ${field('Monto', amountInput('amount', tx ? Math.abs(tx.amount) : (preset.amount || ''), 'data-autofocus required'))}
    ${field('Categoría', `<select name="category">${options(state.categories.ingreso, tx?.type === 'ingreso' ? tx.category : state.categories.ingreso[0])}</select>`, 'data-for="ingreso"')}
    ${field('Categoría', `<select name="category">${options(state.categories.gasto, tx?.type === 'gasto' ? tx.category : (preset.category || state.categories.gasto[0]))}</select>`, 'data-for="gasto"')}
    ${field('¿Con qué pagaste?', `<select name="cardId">${methodOptions(method)}</select>`, 'data-for="gasto"')}
    ${loans.length ? field('¿Es pago de un préstamo o deuda?', `<select name="debtId"><option value="">No</option>${loans.map((d) => `<option value="${d.id}" ${tx?.debtId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`, 'data-for="gasto"') : ''}
    ${goals.length
      ? field('Meta', `<select name="goalId">${goals.map((g) => `<option value="${g.id}" ${g.id === goalId ? 'selected' : ''}>${esc(GOAL_EMOJI[g.kind] || '')} ${esc(g.name)}</option>`).join('')}</select>`, 'data-for="ahorro"') +
      field('Movimiento', `<select name="dir"><option value="in" ${!(tx && tx.amount < 0) && preset.dir !== 'out' ? 'selected' : ''}>Aporte (meto dinero)</option><option value="out" ${(tx && tx.amount < 0) || preset.dir === 'out' ? 'selected' : ''}>Retiro (saco dinero)</option></select>`, 'data-for="ahorro"')
      : `<div class="alert info" data-for="ahorro"><span class="ico">🎯</span><span>Primero crea una meta en <b>Más → Metas</b> para registrar tus ahorros e inversiones.</span></div>`}
    ${field('Fecha', `<input type="date" name="date" required value="${esc(tx?.date || preset.date || defaultDate())}">`)}
    ${field('Nota (opcional)', `<input name="note" maxlength="80" placeholder="Ej. Supermercado, gasolina…" value="${esc(tx?.note || preset.note || '')}">`)}
    ${tx?.recurringId ? `<p class="hint">Este movimiento es el pago de “${esc(findRec(tx.recurringId)?.name || 'un pago fijo')}”.</p>` : ''}
    ${tx?.invoiceId ? `<p class="hint">Este ingreso es el cobro de una factura de cliente.</p>` : ''}`;

  openSheet({
    title: tx ? 'Editar movimiento' : (preset.title || 'Nuevo movimiento'),
    body,
    onSubmit: (data) => {
      const amount = parseAmount(data.amount);
      if (!(amount > 0)) return fail('Escribe un monto mayor que cero');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) return fail('Elige una fecha válida');
      const t = tx || { id: uid(), createdAt: Date.now() };
      t.type = data.type;
      t.date = data.date;
      t.note = (data.note || '').trim();
      t.amount = amount;
      delete t.debtId; delete t.goalId; delete t.cardId;
      if (t.type === 'ingreso') t.category = data.category;
      if (t.type === 'gasto') {
        t.category = data.category;
        if (data.cardId && findDebt(data.cardId)) t.cardId = data.cardId;
        if (data.debtId) { t.debtId = data.debtId; t.category = 'Deudas'; }
        state.settings.lastMethod = data.cardId || 'cash';
      }
      if (t.type === 'ahorro') {
        if (!data.goalId) return fail('Primero crea una meta en Más → Metas');
        t.goalId = data.goalId;
        t.category = 'Ahorro';
        if (data.dir === 'out') {
          const g = findGoal(t.goalId);
          const available = goalInfo(g).saved + (tx && tx.type === 'ahorro' && tx.goalId === g.id ? -tx.amount : 0);
          if (amount > available + 0.001) return fail(`Solo tienes ${money(available)} en esa meta`);
          t.amount = -amount;
        }
      }
      if (!tx) state.transactions.push(t);
      return tx ? 'Movimiento actualizado' : (t.cardId ? `Gasto guardado en ${findDebt(t.cardId).name}` : 'Movimiento guardado');
    },
    onDelete: tx ? () => {
      if (!confirm('¿Eliminar este movimiento?')) return false;
      deleteTx(tx);
      return 'Movimiento eliminado';
    } : null
  });
}

function deleteTx(tx) {
  state.transactions = state.transactions.filter((x) => x.id !== tx.id);
  if (tx.invoiceId) { const inv = state.invoices.find((i) => i.id === tx.invoiceId); if (inv) { inv.paidDate = null; delete inv.paidAmount; delete inv.txId; } }
  if (tx.recurringId) { const r = findRec(tx.recurringId); if (r && r.autopay) r.skip = [...new Set([...(r.skip || []), tx.period])].slice(-24); }
}

/* --- Deudas y tarjetas --- */
function debtForm(d, kindPreset = 'prestamo') {
  const info = d ? debtInfo(d) : null;
  const kind = d?.kind || kindPreset;
  openSheet({
    title: d ? 'Editar ' + (d.kind === 'tarjeta' ? 'tarjeta' : 'deuda') : (kind === 'tarjeta' ? 'Nueva tarjeta de crédito' : 'Nueva deuda'),
    body: `
      ${field('Tipo', `<select name="kind">${Object.entries(DEBT_KINDS).map(([k, v]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${DEBT_EMOJI[k]} ${v}</option>`).join('')}</select>`)}
      ${field('Nombre', `<input name="name" required maxlength="40" placeholder="Ej. Visa Banco X, préstamo del carro" value="${esc(d?.name || '')}" data-autofocus>`)}
      ${field('¿Cuánto debes hoy?', amountInput('balance', info ? info.balance : '', 'required'))}
      <p class="hint" data-dep="kind" data-for="tarjeta" style="margin:-8px 0 14px">El saldo total que aparece hoy en la app de tu banco. De aquí en adelante, registra tus compras con esta tarjeta.</p>
      <div class="grid-2" data-dep="kind" data-for="tarjeta">
        ${field('Límite de crédito', numInput('creditLimit', d?.creditLimit, 'Ej. 5000'))}
        ${field('Día de corte', dayInput('cutDay', d?.cutDay))}
      </div>
      <div class="grid-2">
        ${field('Día límite de pago', dayInput('dueDay', d?.dueDay))}
        ${field('Interés anual (%)', numInput('rate', d?.rate, 'Ej. 36'))}
      </div>
      ${field('Pago mínimo mensual', numInput('minPayment', d?.minPayment, '0'))}
      <p class="hint">Todo esto aparece en tu estado de cuenta. Con estos datos calculo cuánto pagar y cuándo terminas.</p>`,
    onSubmit: (data) => {
      const name = (data.name || '').trim();
      if (!name) return fail('Ponle un nombre');
      const balance = parseAmount(data.balance);
      if (!Number.isFinite(balance)) return fail('Escribe cuánto debes hoy');
      const fields = {
        name, kind: data.kind,
        rate: Math.max(0, optAmount(data.rate) || 0),
        minPayment: Math.max(0, optAmount(data.minPayment) || 0),
        dueDay: toDay(data.dueDay)
      };
      if (data.kind === 'tarjeta') { fields.creditLimit = Math.max(0, optAmount(data.creditLimit) || 0); fields.cutDay = toDay(data.cutDay); }
      if (d) {
        const i = debtInfo(d);
        Object.assign(d, fields);
        if (data.kind !== 'tarjeta') { delete d.creditLimit; delete d.cutDay; }
        const charges = d.kind === 'tarjeta' ? i.charges : 0;
        d.startBalance = round2(balance - charges + i.paid);
      } else {
        state.debts.push({ id: uid(), createdAt: Date.now(), startBalance: balance, ...fields });
        if (data.kind === 'tarjeta' && (!state.settings.lastMethod || state.settings.lastMethod === 'cash')) state.settings.lastMethod = state.debts[state.debts.length - 1].id;
      }
      return data.kind === 'tarjeta' ? 'Tarjeta guardada' : 'Deuda guardada';
    },
    onDelete: d ? () => {
      if (!confirm(`¿Eliminar "${d.name}"? Los pagos y compras que registraste se conservarán como movimientos.`)) return false;
      state.debts = state.debts.filter((x) => x.id !== d.id);
      for (const t of state.transactions) {
        if (t.debtId === d.id) { delete t.debtId; if (t.type === 'pago') { t.type = 'gasto'; t.category = 'Deudas'; } }
        if (t.cardId === d.id) delete t.cardId;
      }
      for (const r of state.recurring) if (r.cardId === d.id) delete r.cardId;
      return 'Eliminada';
    } : null
  });
}

function payDebtForm(d, tx = null) {
  const isCard = d ? d.kind === 'tarjeta' : true;
  const info = d ? debtInfo(d) : null;
  const suggested = tx ? tx.amount : isCard ? (info.toPay || d.minPayment || '') : (d.minPayment ? Math.min(d.minPayment, info.owed) : '');
  const fills = info ? (isCard
    ? [['Mínimo', d.minPayment ? Math.min(d.minPayment, info.owed) : 0], ['Para no pagar intereses', info.toPay], ['Todo', info.owed]]
    : [['Mínimo', d.minPayment ? Math.min(d.minPayment, info.owed) : 0], ['Todo', info.owed]]) : [];
  openSheet({
    title: (tx ? 'Editar pago: ' : 'Pago: ') + (d ? d.name : 'tarjeta'),
    submitLabel: tx ? 'Guardar' : 'Registrar pago',
    body: `${info ? `<p class="small">Debes: <b>${money(info.owed)}</b>${isCard && info.lastCut ? ` · Al corte: <b>${money(info.statement)}</b>` : ''}</p>` : ''}
      ${field('Monto pagado', amountInput('amount', suggested, 'data-autofocus required'))}
      ${quickFill(fills)}
      ${field('Fecha', `<input type="date" name="date" required value="${tx?.date || todayISO()}">`)}
      ${field('Nota (opcional)', `<input name="note" maxlength="80" placeholder="Ej. Desde la app del banco" value="${esc(tx?.note || '')}">`)}
      <p class="hint">${isCard ? 'El pago baja la deuda de la tarjeta. No cuenta como gasto porque las compras ya se contaron cuando las hiciste.' : 'Se registra como un gasto en la categoría “Deudas” y baja el saldo.'}</p>`,
    onSubmit: (data) => {
      const amount = parseAmount(data.amount);
      if (!(amount > 0)) return fail('Escribe un monto mayor que cero');
      if (!data.date) return fail('Elige una fecha');
      const t = tx || { id: uid(), createdAt: Date.now() };
      Object.assign(t, { amount, date: data.date, note: (data.note || '').trim() });
      if (!tx) {
        Object.assign(t, isCard ? { type: 'pago', category: 'Pago de tarjeta', debtId: d.id } : { type: 'gasto', category: 'Deudas', debtId: d.id });
        state.transactions.push(t);
      }
      if (d && debtInfo(d).owed <= 0 && !isCard) return `¡Felicidades! Saldaste “${d.name}” 🎉`;
      return tx ? 'Pago actualizado' : 'Pago registrado';
    },
    onDelete: tx ? () => { if (!confirm('¿Eliminar este pago?')) return false; deleteTx(tx); return 'Pago eliminado'; } : null
  });
}

/* --- Pagos fijos --- */
function recForm(r, kindPreset = 'factura') {
  const kind = r?.kind || kindPreset;
  const cat = r?.category || REC_DEFAULT_CAT[kind];
  const months = Array.from({ length: 12 }, (_, i) => [i + 1, parseISO(`2000-${String(i + 1).padStart(2, '0')}-01`).toLocaleDateString(LOCALE, { month: 'long' })]);
  const placeholder = { factura: 'Ej. Luz, agua, internet, teléfono, renta', suscripcion: 'Ej. Netflix, Spotify, gimnasio, iCloud', pension: 'Ej. Pensión de mi hijo/a', otro: 'Ej. Seguro del carro' };
  openSheet({
    title: r ? 'Editar pago fijo' : 'Nuevo ' + REC_KIND_ONE[kind].toLowerCase(),
    body: `
      ${field('Tipo', `<select name="kind">${Object.entries(REC_KIND_ONE).map(([k, v]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${REC_EMOJI[k]} ${v}</option>`).join('')}</select>`)}
      ${field('Nombre', `<input name="name" required maxlength="40" placeholder="${placeholder[kind]}" value="${esc(r?.name || (kind === 'pension' ? 'Pensión alimenticia' : ''))}" data-autofocus>`)}
      ${field('Monto', amountInput('amount', r?.amount ?? '', 'required'))}
      ${checkbox('variable', 'El monto cambia cada mes (ej. luz o agua)', r?.variable)}
      ${field('Frecuencia', `<select name="frequency">${Object.entries(FREQ).map(([k, v]) => `<option value="${k}" ${k === (r?.frequency || 'mensual') ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
      <div class="grid-2" data-dep="frequency" data-for="mensual anual">
        ${field('Día que llega la factura', dayInput('arriveDay', r?.arriveDay))}
        ${field('Día límite para pagar', dayInput('dueDay', r?.dueDay, 'required'))}
      </div>
      <div class="grid-2" data-dep="frequency" data-for="quincenal">
        ${field('1er pago: día', dayInput('dueDayQ1', r?.dueDay || 15))}
        ${field('2do pago: día', dayInput('dueDay2', r?.dueDay2 || 30))}
      </div>
      ${field('Mes en que se paga', `<select name="month">${months.map(([n, name]) => `<option value="${n}" ${n === Number(r?.month || new Date().getMonth() + 1) ? 'selected' : ''}>${name}</option>`).join('')}</select>`, 'data-dep="frequency" data-for="anual"')}
      ${field('Categoría', `<select name="category">${options(state.categories.gasto, cat)}</select>`)}
      ${field('¿Con qué lo pagas?', `<select name="cardId">${methodOptions(r ? r.cardId : validCard(state.settings.lastMethod))}</select>`)}
      ${checkbox('autopay', 'Se cobra solo (domiciliado): regístralo automáticamente el día de pago', r ? r.autopay : kind === 'suscripcion')}
      ${r ? checkbox('paused', 'Pausado (ya no lo pago por ahora)', r.active === false) : ''}
      <p class="hint">Si no sabes el día en que llega la factura, déjalo vacío.</p>`,
    onChange: (e, form) => {
      if (e.target.name === 'kind') {
        const k = e.target.value;
        if (form.elements.category && state.categories.gasto.includes(REC_DEFAULT_CAT[k])) form.elements.category.value = REC_DEFAULT_CAT[k];
        form.elements.name.placeholder = placeholder[k];
        if (k === 'suscripcion') form.elements.autopay.checked = true;
      }
    },
    onSubmit: (data) => {
      const name = (data.name || '').trim();
      if (!name) return fail('Ponle un nombre');
      const amount = parseAmount(data.amount);
      if (!(amount >= 0)) return fail('Escribe el monto (aproximado si cambia)');
      const frequency = data.frequency;
      const dueDay = toDay(frequency === 'quincenal' ? data.dueDayQ1 : data.dueDay);
      if (!dueDay) return fail('Escribe el día límite para pagar');
      const fields = {
        name, kind: data.kind, amount, variable: !!data.variable, frequency, dueDay,
        arriveDay: frequency === 'quincenal' ? null : toDay(data.arriveDay),
        dueDay2: frequency === 'quincenal' ? toDay(data.dueDay2) || 30 : null,
        month: frequency === 'anual' ? Number(data.month) : null,
        category: data.category, cardId: validCard(data.cardId) || null,
        autopay: !!data.autopay && !data.variable
      };
      if (data.autopay && data.variable) toast('Los pagos con monto variable no se registran solos');
      if (r) { Object.assign(r, fields); r.active = !data.paused; }
      else state.recurring.push({ id: uid(), createdAt: Date.now(), startMonth: monthOf(todayISO()), active: true, skip: [], ...fields });
      if (!r && fields.autopay) setTimeout(() => { if (runAutomations()) render(); }, 0);
      return 'Pago fijo guardado';
    },
    onDelete: r ? () => {
      if (!confirm(`¿Eliminar "${r.name}"? Los pagos que ya registraste se conservan como gastos.`)) return false;
      state.recurring = state.recurring.filter((x) => x.id !== r.id);
      for (const t of state.transactions) if (t.recurringId === r.id) { delete t.recurringId; delete t.period; }
      return 'Pago fijo eliminado';
    } : null
  });
}

function payRecForm(o) {
  const r = o.r;
  const lastTx = sortTx(state.transactions.filter((t) => t.recurringId === r.id))[0];
  const s = occStatus(o);
  openSheet({
    title: 'Pagar: ' + r.name,
    submitLabel: 'Registrar pago',
    deleteLabel: 'Omitir este mes',
    body: `<p class="small">${o.arrive ? `Llega el <b>${longDate(o.arrive)}</b> · ` : ''}Vence el <b>${longDate(o.due)}</b> ${occBadge(s)}</p>
      ${field('Monto', amountInput('amount', r.variable ? (lastTx?.amount || r.amount || '') : r.amount, 'data-autofocus required'))}
      ${r.variable ? '<p class="hint" style="margin:-8px 0 14px">Escribe lo que dice la factura de este mes.</p>' : ''}
      ${field('¿Con qué pagaste?', `<select name="cardId">${methodOptions(r.cardId || '')}</select>`)}
      ${field('Fecha de pago', `<input type="date" name="date" required value="${todayISO()}">`)}
      ${field('Nota (opcional)', `<input name="note" maxlength="80" value="${esc(r.name)}">`)}`,
    onSubmit: (data) => {
      const amount = parseAmount(data.amount);
      if (!(amount > 0)) return fail('Escribe un monto mayor que cero');
      const tx = { id: uid(), createdAt: Date.now(), type: 'gasto', amount, category: r.category, date: data.date, note: (data.note || '').trim(), recurringId: r.id, period: o.period };
      if (validCard(data.cardId)) tx.cardId = data.cardId;
      state.transactions.push(tx);
      r.skip = (r.skip || []).filter((p) => p !== o.period);
      return `${r.name}: pagado ✓`;
    },
    onDelete: () => {
      r.skip = [...new Set([...(r.skip || []), o.period])].slice(-24);
      return 'Omitido este mes';
    }
  });
}

/* --- Clientes y facturas --- */
function clientForm(c) {
  openSheet({
    title: c ? 'Editar cliente' : 'Nuevo cliente',
    body: `
      ${field('Nombre del cliente', `<input name="name" required maxlength="50" placeholder="Nombre o empresa" value="${esc(c?.name || '')}" data-autofocus>`)}
      ${field('¿Cada cuánto te paga?', `<select name="frequency">${Object.entries(CLIENT_FREQ).map(([k, v]) => `<option value="${k}" ${k === (c?.frequency || 'mensual') ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
      ${field('¿Cuánto te paga cada vez?', amountInput('amount', c?.amount ?? ''))}
      <div class="grid-2" data-dep="frequency" data-for="mensual quincenal">
        ${field('Día que le facturas', dayInput('billingDay', c?.billingDay || 1))}
        ${field('2da factura: día', dayInput('billingDay2', c?.billingDay2 || 16), 'data-dep="frequency" data-for="quincenal"')}
      </div>
      ${field('Días que tarda en pagarte', `<input name="terms" type="number" inputmode="numeric" min="0" max="180" placeholder="Ej. 15 (0 si paga al momento)" value="${c?.terms ?? ''}">`)}
      ${field('Contacto (opcional)', `<input name="contact" maxlength="80" placeholder="Teléfono o correo" value="${esc(c?.contact || '')}">`)}
      ${field('Notas (opcional)', `<input name="note" maxlength="120" placeholder="Ej. Paga por transferencia" value="${esc(c?.note || '')}">`)}
      ${c ? checkbox('inactive', 'Ya no es mi cliente (inactivo)', c.active === false) : ''}
      <p class="hint">Con “días que tarda en pagarte” calculo la fecha de vencimiento de cada factura. Si te paga al momento, pon 0.</p>`,
    onSubmit: (data) => {
      const name = (data.name || '').trim();
      if (!name) return fail('Escribe el nombre del cliente');
      const amount = optAmount(data.amount);
      if (!(amount >= 0)) return fail('Revisa el monto');
      const fields = {
        name, frequency: data.frequency, amount,
        billingDay: toDay(data.billingDay), billingDay2: toDay(data.billingDay2),
        terms: data.terms ? clamp(parseInt(data.terms, 10) || 0, 0, 365) : 0,
        contact: (data.contact || '').trim(), note: (data.note || '').trim()
      };
      if (c) { Object.assign(c, fields); c.active = !data.inactive; return 'Cliente guardado'; }
      const nc = { id: uid(), createdAt: Date.now(), active: true, ...fields };
      state.clients.push(nc);
      ui.clientId = nc.id; ui.tab = 'cliente';
      return 'Cliente agregado. Ahora agrega las facturas que te debe.';
    },
    onDelete: c ? () => {
      const n = state.invoices.filter((i) => i.clientId === c.id).length;
      if (!confirm(`¿Eliminar a "${c.name}"?${n ? ` También se borrarán sus ${n} facturas (los cobros ya registrados se quedan como ingresos).` : ''}`)) return false;
      state.clients = state.clients.filter((x) => x.id !== c.id);
      const ids = new Set(state.invoices.filter((i) => i.clientId === c.id).map((i) => i.id));
      state.invoices = state.invoices.filter((i) => !ids.has(i.id));
      for (const t of state.transactions) if (ids.has(t.invoiceId)) delete t.invoiceId;
      ui.tab = 'clientes';
      return 'Cliente eliminado';
    } : null
  });
}

function invoiceForm(inv, clientId) {
  const c = findClient(inv ? inv.clientId : clientId);
  if (!c) return;
  const issue = inv?.issueDate || todayISO();
  openSheet({
    title: inv ? 'Factura de ' + c.name : 'Nueva factura · ' + c.name,
    body: `
      ${field('Monto', amountInput('amount', inv ? inv.amount : (c.amount || ''), 'data-autofocus required'))}
      <div class="grid-2">
        ${field('Número (opcional)', `<input name="number" maxlength="20" placeholder="Ej. ${nextInvoiceNumber()}" value="${esc(inv?.number || '')}">`)}
        ${field('Fecha de la factura', `<input type="date" name="issueDate" required value="${issue}">`)}
      </div>
      ${field('Fecha en que debe pagarte', `<input type="date" name="dueDate" value="${inv?.dueDate || addDays(issue, Number(c.terms) || 0)}">`)}
      ${field('Nota (opcional)', `<input name="note" maxlength="80" placeholder="Ej. Servicio de octubre" value="${esc(inv?.note || '')}">`)}
      ${inv?.paidDate ? `<div class="alert good"><span class="ico">✅</span><span>Pagada el ${longDate(inv.paidDate)}${inv.paidAmount != null && inv.paidAmount !== inv.amount ? ` (${money(inv.paidAmount)})` : ''}. ${'<button type="button" class="link" data-action-sheet="unpay">Marcar como no pagada</button>'}</span></div>` : ''}
      <p class="hint">Si ya te debía facturas de meses anteriores, agrégalas con su fecha original para saber cuántas están atrasadas.</p>`,
    onChange: (e, form) => {
      if (e.target.name === 'issueDate' && !inv && e.target.value) form.elements.dueDate.value = addDays(e.target.value, Number(c.terms) || 0);
    },
    onSubmit: (data) => {
      const amount = parseAmount(data.amount);
      if (!(amount > 0)) return fail('Escribe el monto de la factura');
      if (!data.issueDate) return fail('Elige la fecha de la factura');
      const fields = { amount, number: (data.number || '').trim(), issueDate: data.issueDate, dueDate: data.dueDate || data.issueDate, note: (data.note || '').trim() };
      if (inv) Object.assign(inv, fields);
      else state.invoices.push({ id: uid(), createdAt: Date.now(), clientId: c.id, paidDate: null, ...fields });
      return 'Factura guardada';
    },
    onDelete: inv ? () => {
      if (!confirm('¿Eliminar esta factura?' + (inv.txId ? ' El ingreso que registraste por ella se conserva.' : ''))) return false;
      state.invoices = state.invoices.filter((x) => x.id !== inv.id);
      for (const t of state.transactions) if (t.invoiceId === inv.id) delete t.invoiceId;
      return 'Factura eliminada';
    } : null
  });
  const unpay = sheetForm.querySelector('[data-action-sheet="unpay"]');
  if (unpay) unpay.addEventListener('click', () => {
    if (!confirm('¿Marcar como no pagada? Se borrará el ingreso que se registró por este cobro.')) return;
    const tx = state.transactions.find((t) => t.invoiceId === inv.id);
    if (tx) state.transactions = state.transactions.filter((t) => t !== tx);
    inv.paidDate = null; delete inv.paidAmount; delete inv.txId;
    closeSheet();
    afterChange('Factura marcada como pendiente');
  });
}

function collectForm(inv) {
  const c = findClient(inv.clientId);
  openSheet({
    title: 'Cobrar a ' + (c?.name || 'cliente'),
    submitLabel: 'Registrar cobro',
    body: `<p class="small">${inv.number ? `Factura #${esc(inv.number)} · ` : ''}${money(inv.amount)} · emitida ${shortDate(inv.issueDate)}</p>
      ${field('¿Cuánto recibiste?', amountInput('amount', inv.amount, 'data-autofocus required'))}
      ${field('Fecha en que te pagó', `<input type="date" name="date" required value="${todayISO()}">`)}
      <p class="hint">Se registra como ingreso en la categoría “Clientes”.</p>`,
    onSubmit: (data) => {
      const amount = parseAmount(data.amount);
      if (!(amount > 0)) return fail('Escribe un monto mayor que cero');
      if (!data.date) return fail('Elige la fecha');
      const tx = { id: uid(), createdAt: Date.now(), type: 'ingreso', amount, category: 'Clientes', date: data.date, note: `${c?.name || 'Cliente'}${inv.number ? ' · Factura #' + inv.number : ''}`, invoiceId: inv.id };
      state.transactions.push(tx);
      Object.assign(inv, { paidDate: data.date, paidAmount: amount, txId: tx.id });
      return 'Cobro registrado 💰';
    }
  });
}

/* --- Metas --- */
function goalForm(g, preset = {}) {
  const info = g ? goalInfo(g) : null;
  const kind = g?.kind || preset.kind || 'ahorro';
  openSheet({
    title: g ? 'Editar meta' : 'Nueva meta',
    body: `
      ${field('Nombre', `<input name="name" required maxlength="40" placeholder="Ej. Viaje, carro, fondo de retiro" value="${esc(g?.name || preset.name || '')}" data-autofocus>`)}
      ${field('Tipo', `<select name="kind">${Object.entries(GOAL_KINDS).map(([k, v]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${GOAL_EMOJI[k]} ${v}</option>`).join('')}</select>`)}
      ${field('¿Cuánto quieres juntar?', amountInput('target', g ? g.target : (preset.target || ''), 'required'))}
      ${field('¿Cuánto tienes ya?', numInput('saved', info ? info.saved : '', '0'))}
      ${field('Valor actual de la inversión (opcional)', numInput('currentValue', g && Number.isFinite(g.currentValue) ? g.currentValue : '', 'Lo que dice tu app de inversión hoy'), 'data-dep="kind" data-for="inversion"')}
      ${field('Fecha objetivo (opcional)', `<input type="date" name="deadline" value="${esc(g?.deadline || '')}">`)}`,
    onSubmit: (data) => {
      const name = (data.name || '').trim();
      if (!name) return fail('Ponle un nombre a la meta');
      const target = parseAmount(data.target);
      if (!(target > 0)) return fail('Escribe cuánto quieres juntar');
      const saved = optAmount(data.saved);
      if (!(saved >= 0)) return fail('Revisa cuánto tienes ya');
      const cv = data.kind === 'inversion' && data.currentValue ? parseAmount(data.currentValue) : NaN;
      const fields = { name, kind: data.kind, target, deadline: data.deadline || null };
      if (Number.isFinite(cv)) fields.currentValue = cv;
      if (g) {
        Object.assign(g, fields, { initial: round2(saved - goalContrib(g)) });
        if (!Number.isFinite(cv)) delete g.currentValue;
      } else state.goals.push({ id: uid(), createdAt: Date.now(), initial: saved, ...fields });
      return 'Meta guardada';
    },
    onDelete: g ? () => {
      const n = state.transactions.filter((t) => t.goalId === g.id).length;
      if (!confirm(`¿Eliminar la meta "${g.name}"?${n ? ` También se borrarán sus ${n} aportes/retiros.` : ''}`)) return false;
      state.goals = state.goals.filter((x) => x.id !== g.id);
      state.transactions = state.transactions.filter((t) => t.goalId !== g.id);
      return 'Meta eliminada';
    } : null
  });
}

/* --- Presupuesto --- */
function limitForm(cat) {
  openSheet({
    title: cat,
    body: `
      ${field('Límite mensual', amountInput('limit', state.limits[cat] || '', 'data-autofocus'))}
      <p class="hint" style="margin-top:-8px;margin-bottom:14px">Déjalo vacío para no tener límite.</p>
      ${field('¿Qué tipo de gasto es?', `<select name="group"><option value="needs" ${groupOf(cat) === 'needs' ? 'selected' : ''}>Necesidad (lo indispensable)</option><option value="wants" ${groupOf(cat) === 'wants' ? 'selected' : ''}>Deseo (lo que podrías recortar)</option></select>`)}`,
    onSubmit: (data) => {
      const v = optAmount(data.limit);
      if (!(v >= 0)) return fail('Revisa el monto');
      if (v > 0) state.limits[cat] = v; else delete state.limits[cat];
      state.catGroup[cat] = data.group;
      return 'Presupuesto actualizado';
    }
  });
}

function splitForm() {
  const S = state.split;
  openSheet({
    title: 'Distribución del ingreso',
    body: `<p class="small muted">¿Qué porcentaje de tu ingreso quieres destinar a cada parte? Debe sumar 100%.</p>
      <div class="grid-3">
        ${field('Necesidades', `<input name="needs" type="number" inputmode="numeric" min="0" max="100" value="${S.needs}">`)}
        ${field('Deseos', `<input name="wants" type="number" inputmode="numeric" min="0" max="100" value="${S.wants}">`)}
        ${field('Ahorro', `<input name="savings" type="number" inputmode="numeric" min="0" max="100" value="${S.savings}">`)}
      </div>
      <button type="button" class="btn sm" onclick="this.form.needs.value=50;this.form.wants.value=30;this.form.savings.value=20">Usar 50/30/20</button>`,
    onSubmit: (data) => {
      const n = Number(data.needs), w = Number(data.wants), s = Number(data.savings);
      if (![n, w, s].every((x) => Number.isFinite(x) && x >= 0)) return fail('Revisa los porcentajes');
      if (Math.round(n + w + s) !== 100) return fail(`Los porcentajes suman ${n + w + s}%, deben sumar 100%`);
      state.split = { needs: n, wants: w, savings: s };
      return 'Distribución guardada';
    }
  });
}

function incomeForm() {
  openSheet({
    title: 'Ingreso mensual esperado',
    body: `${field('¿Cuánto ganas normalmente al mes?', amountInput('income', state.settings.expectedIncome || '', 'data-autofocus'))}
      <p class="hint">Se usa para tu presupuesto cuando todavía no has registrado los ingresos del mes.</p>`,
    onSubmit: (data) => {
      const v = optAmount(data.income);
      if (!(v >= 0)) return fail('Revisa el monto');
      state.settings.expectedIncome = v;
      return 'Guardado';
    }
  });
}

/* =========================================================
   Respaldo
   ========================================================= */
function backupBlob() {
  const payload = { app: 'misfinanzas', version: 2, exportedAt: new Date().toISOString(), data: state };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function markBackup() { state.settings.lastBackup = Date.now(); afterChange('Respaldo listo ✓'); }
async function shareBackup() {
  const name = `misfinanzas-respaldo-${todayISO()}.json`;
  const blob = backupBlob();
  let file = null;
  try { file = new File([blob], name, { type: 'application/json' }); } catch (_) { }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Respaldo Mis Finanzas' }); return markBackup(); }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  downloadBlob(blob, name);
  markBackup();
}
function downloadBackup() { downloadBlob(backupBlob(), `misfinanzas-respaldo-${todayISO()}.json`); markBackup(); }

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let obj;
    try { obj = JSON.parse(reader.result); } catch (_) { return fail('Ese archivo no es un respaldo válido'); }
    const data = obj && obj.data ? obj.data : obj;
    if (!data || !Array.isArray(data.transactions)) return fail('Ese archivo no es un respaldo de Mis Finanzas');
    const when = obj.exportedAt ? ` del ${new Date(obj.exportedAt).toLocaleString(LOCALE)}` : '';
    const msg = `Respaldo${when}:\n• ${data.transactions.length} movimientos\n• ${(data.debts || []).length} deudas/tarjetas\n• ${(data.recurring || []).length} pagos fijos\n• ${(data.clients || []).length} clientes\n• ${(data.goals || []).length} metas\n\nReemplazará los datos actuales${syncState.email ? ' (también en tus otros dispositivos)' : ''}. ¿Continuar?`;
    if (!confirm(msg)) return;
    try { localStorage.setItem('misfinanzas:antes-de-importar', JSON.stringify(state)); } catch (_) { }
    state = normalize(data);
    applyTheme();
    afterChange('Respaldo importado ✓');
  };
  reader.onerror = () => fail('No se pudo leer el archivo');
  reader.readAsText(file);
}

function exportCSV() {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Fecha', 'Tipo', 'Categoría', 'Detalle', 'Método', 'Monto', 'Nota']];
  for (const t of sortTx(state.transactions).reverse()) {
    const sign = t.type === 'ingreso' || t.type === 'ahorro' ? 1 : -1;
    rows.push([t.date, TYPE_LABEL[t.type], t.category, txTitle(t), t.type === 'gasto' ? methodLabel(t.cardId).replace(/^\S+ /, '') : '', sign * t.amount, t.note || '']);
  }
  const csv = '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `misfinanzas-movimientos-${todayISO()}.csv`);
  toast('Archivo descargado');
}

/* =========================================================
   Sincronización: acciones de la pantalla
   ========================================================= */
const AUTH_ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No existe una cuenta con ese correo. Toca “Crear cuenta”.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Toca “Entrar”.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/network-request-failed': 'Sin conexión a internet.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/missing-password': 'Escribe tu contraseña.'
};
const authMsg = (e) => AUTH_ERRORS[e && e.code] || (e && e.message) || 'Algo salió mal';
function loginValues() {
  const f = $('#loginForm');
  return f ? { email: f.email.value.trim(), password: f.password.value } : {};
}
async function doAuth(kind) {
  if (!window.Sync) return fail('La sincronización aún se está cargando');
  const { email, password } = loginValues();
  if (!email) return fail('Escribe tu correo');
  try {
    if (kind === 'reset') { await window.Sync.reset(email); toast('Te enviamos un correo para cambiar tu contraseña'); return; }
    if (!password || password.length < 6) return fail('La contraseña debe tener al menos 6 caracteres');
    syncState.message = '';
    if (kind === 'up') await window.Sync.signUp(email, password);
    else await window.Sync.signIn(email, password);
    toast('¡Listo! Tus datos se sincronizarán solos');
  } catch (e) {
    syncState.message = authMsg(e);
    document.activeElement && document.activeElement.blur();
    refreshSyncUi();
  }
}

/* =========================================================
   Acciones (clics)
   ========================================================= */
function occFrom(el) {
  const r = findRec(el.dataset.id);
  if (!r) return null;
  return occurrences(r, el.dataset.month).find((o) => o.period === el.dataset.period) || null;
}

const ACTIONS = {
  'goto': (id) => go(id),
  'new-tx': (id) => txForm(null, id || 'gasto'),
  'edit-tx': (id) => { const t = state.transactions.find((x) => x.id === id); if (t) txForm(t); },
  'filter': (id) => { ui.txFilter = id; render(); },
  'pay-filter': (id) => { ui.payFilter = id; render(); },
  'new-debt': () => debtForm(null, 'prestamo'),
  'new-card': () => debtForm(null, 'tarjeta'),
  'edit-debt': (id) => { const d = findDebt(id); if (d) debtForm(d); },
  'pay-debt': (id) => { const d = findDebt(id); if (d) payDebtForm(d); },
  'card-purchase': (id) => txForm(null, 'gasto', { cardId: id, title: 'Compra con ' + findDebt(id)?.name }),
  'strategy': (id) => { ui.debtStrategy = id; render(); },
  'new-rec': (id) => recForm(null, id || 'factura'),
  'edit-rec': (id) => { const r = findRec(id); if (r) recForm(r); },
  'occ': (_, el) => {
    const o = occFrom(el);
    if (!o) return;
    const s = occStatus(o);
    if (s.code === 'pagada') return txForm(s.tx);
    if (s.code === 'omitida') {
      if (confirm(`¿Volver a marcar "${o.r.name}" como pendiente este mes?`)) { o.r.skip = (o.r.skip || []).filter((p) => p !== o.period); afterChange('Marcado como pendiente'); }
      return;
    }
    payRecForm(o);
  },
  'new-client': () => clientForm(null),
  'open-client': (id) => { ui.showPaidInv = false; go('cliente', { clientId: id }); },
  'edit-client': (id) => { const c = findClient(id); if (c) clientForm(c); },
  'new-invoice': (id) => invoiceForm(null, id),
  'edit-invoice': (id) => { const inv = state.invoices.find((x) => x.id === id); if (inv) invoiceForm(inv); },
  'collect-invoice': (id) => { const inv = state.invoices.find((x) => x.id === id); if (inv) collectForm(inv); },
  'show-paid': () => { ui.showPaidInv = true; render(); },
  'gen-invoices': () => {
    const list = missingInvoices(monthOf(todayISO()));
    if (!list.length) return;
    let n = nextInvoiceNumber() | 0;
    for (const inv of list) inv.number = String(n++).padStart(3, '0');
    state.invoices.push(...list);
    afterChange(`${plural(list.length, 'factura creada', 'facturas creadas')}`);
  },
  'new-goal': () => goalForm(null),
  'new-emergency': () => { const avg = avgMonthlyExpense(); goalForm(null, { kind: 'emergencia', name: 'Fondo de emergencia', target: avg ? round2(avg * 3) : '' }); },
  'edit-goal': (id) => { const g = findGoal(id); if (g) goalForm(g); },
  'contrib-goal': (id) => txForm(null, 'ahorro', { goalId: id }),
  'withdraw-goal': (id) => txForm(null, 'ahorro', { goalId: id, dir: 'out' }),
  'edit-limit': (id) => limitForm(id),
  'edit-split': () => splitForm(),
  'edit-income': () => incomeForm(),
  'share-backup': () => shareBackup(),
  'download-backup': () => downloadBackup(),
  'import': () => { const inp = $('#importFile'); inp.value = ''; inp.click(); },
  'csv': () => exportCSV(),
  'sign-up': () => doAuth('up'),
  'reset-pw': () => doAuth('reset'),
  'sign-out': async () => {
    if (!confirm('¿Cerrar sesión? Tus datos se quedan en este dispositivo, pero dejarán de sincronizarse.')) return;
    try { await window.Sync.signOut(); toast('Sesión cerrada'); } catch (e) { fail(authMsg(e)); }
  },
  'sync-now': () => { if (window.Sync) { window.App.markAllPending(); window.Sync.flush(); toast('Sincronizando…'); refreshSyncUi(); } },
  'add-cat': (_, el) => {
    const type = el.dataset.type;
    const input = $('#newcat-' + type);
    const name = (input.value || '').trim().replace(/\s+/g, ' ');
    if (!name) return fail('Escribe el nombre de la categoría');
    if (state.categories[type].some((c) => normText(c) === normText(name))) return fail('Esa categoría ya existe');
    state.categories[type].push(name);
    if (type === 'gasto' && !state.catGroup[name]) state.catGroup[name] = 'wants';
    afterChange('Categoría agregada');
  },
  'del-cat': (id, el) => {
    const type = el.dataset.type;
    if (state.categories[type].length <= 1) return fail('Debe quedar al menos una categoría');
    if (!confirm(`¿Quitar la categoría "${id}"? Los movimientos que ya la usan no se borran.`)) return;
    state.categories[type] = state.categories[type].filter((c) => c !== id);
    afterChange('Categoría quitada');
  },
  'reset': () => {
    const where = syncState.email ? ' de este dispositivo y de tu cuenta (en todos tus dispositivos)' : ' de este dispositivo';
    if (!confirm(`¿Seguro? Se borrarán TODOS tus movimientos, deudas, pagos fijos, clientes y metas${where}.`)) return;
    if (!confirm('Esta acción no se puede deshacer. ¿Borrar todo?')) return;
    const keep = { currency: state.settings.currency, theme: state.settings.theme };
    state = defaultState();
    Object.assign(state.settings, keep);
    afterChange('Datos borrados');
  }
};

view.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !view.contains(el)) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el.dataset.id, el);
});
view.addEventListener('submit', (e) => {
  if (e.target.id === 'loginForm') { e.preventDefault(); doAuth('in'); }
});
view.addEventListener('input', (e) => {
  if (e.target.dataset.input === 'search') {
    ui.search = e.target.value;
    const list = $('#txList');
    if (list) list.innerHTML = renderTxList();
  }
});
view.addEventListener('change', (e) => {
  const key = e.target.dataset.setting;
  if (!key) return;
  state.settings[key] = e.target.value;
  if (key === 'theme') applyTheme();
  afterChange('Ajuste guardado');
});
view.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('newcat-')) { e.preventDefault(); e.target.nextElementSibling.click(); }
});
view.addEventListener('focusout', () => {
  setTimeout(() => { if (renderQueued && !sheet.open && !view.contains(document.activeElement)) { renderQueued = false; render(); } }, 0);
});

$('#importFile').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importBackup(f); });
document.querySelector('.tabbar').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
$('#settingsBtn').addEventListener('click', () => go(ui.tab === 'ajustes' ? 'inicio' : 'ajustes'));
$('#backBtn').addEventListener('click', () => go(BACK_TO[ui.tab] || 'inicio'));
$('#prevMonth').addEventListener('click', () => { ui.month = shiftMonth(ui.month, -1); render(); });
$('#nextMonth').addEventListener('click', () => { ui.month = shiftMonth(ui.month, 1); render(); });
$('#monthLabel').addEventListener('click', () => { ui.month = monthOf(todayISO()); render(); });
$('#fab').addEventListener('click', () => {
  if (ui.tab === 'deudas') debtForm(null, cards().length ? 'prestamo' : 'tarjeta');
  else if (ui.tab === 'metas') goalForm(null);
  else if (ui.tab === 'pagos') recForm(null, ui.payFilter === 'todos' ? 'factura' : ui.payFilter);
  else if (ui.tab === 'clientes') clientForm(null);
  else if (ui.tab === 'cliente') invoiceForm(null, ui.clientId);
  else txForm(null, 'gasto');
});

/* =========================================================
   Tema, avisos y arranque
   ========================================================= */
function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#0b1115' : '#0f766e');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

let toastTimer = null;
function toast(msg, kind = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = kind; }, 2800);
}

// Otra pestaña de este mismo dispositivo cambió los datos
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) { state = loadState(); snapshotTracked(); applyTheme(); safeRender(); }
});
window.addEventListener('online', refreshSyncUi);
window.addEventListener('offline', refreshSyncUi);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (runAutomations()) safeRender(); }
});

snapshotTracked();
applyTheme();
runAutomations();
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW:', err)));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
