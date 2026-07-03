'use strict';

/* Shared between the Today page (app.js) and the Memory Archive (memories.js). */

const STORE_KEY = 'one-line-journal-v1';
const UI_KEY = 'one-line-ui-v1';

/* Mood palette v2: traditional pigments running cool to warm. Shu vermillion
   retired from moods (it read as danger at the happy end); it remains an
   accent for streaks. Radiant is yamabuki gold. */
const MOODS = {
  1: { en: 'rough',   jp: '荒', color: '#8d8a92' },
  2: { en: 'cloudy',  jp: '曇', color: '#16407a' },
  3: { en: 'calm',    jp: '凪', color: '#2e6e52' },
  4: { en: 'clear',   jp: '晴', color: '#567a26' },
  5: { en: 'radiant', jp: '輝', color: '#cf8d12' },
};

const PAPER = '#f7f3eb';

/* Kaomoji features for the ink-blob faces, drawn in paper colour. */
function moodFace(n) {
  const s = `stroke="${PAPER}" stroke-width="1.9" stroke-linecap="round" fill="none"`;
  switch (Number(n)) {
    case 1: return `<path d="M9.5,14.5 l4.4,2.1 -4.4,2.1" ${s}/><path d="M24.5,14.5 l-4.4,2.1 4.4,2.1" ${s}/><path d="M12.5,24.8 q2,-2.6 4,0 q2,2.6 4,0" ${s}/>`;
    case 2: return `<path d="M10,16.5 h4.6" ${s}/><path d="M19.4,16.5 h4.6" ${s}/><path d="M14.6,24.6 h4.8" ${s}/><path d="M26.2,12.2 q1.6,2.6 0,3.8 q-1.6,-1.2 0,-3.8" fill="${PAPER}" opacity=".85"/>`;
    case 3: return `<path d="M9.8,15.6 q2.6,3 5.2,0" ${s}/><path d="M19,15.6 q2.6,3 5.2,0" ${s}/><path d="M13.6,23.6 q3.4,2.9 6.8,0" ${s}/>`;
    case 4: return `<path d="M9.8,17 q2.6,-3.4 5.2,0" ${s}/><path d="M19,17 q2.6,-3.4 5.2,0" ${s}/><path d="M13,22.5 q4,4.8 8,0 z" fill="${PAPER}"/><circle cx="8.6" cy="20.6" r="1.7" fill="${PAPER}" opacity=".4"/><circle cx="25.4" cy="20.6" r="1.7" fill="${PAPER}" opacity=".4"/>`;
    case 5: return `<path d="M12.2,12.2 l1,2.7 2.7,1 -2.7,1 -1,2.7 -1,-2.7 -2.7,-1 2.7,-1 z" fill="${PAPER}"/><path d="M21.8,12.2 l1,2.7 2.7,1 -2.7,1 -1,2.7 -1,-2.7 -2.7,-1 2.7,-1 z" fill="${PAPER}"/><path d="M11.8,22 q5.2,6.2 10.4,0 z" fill="${PAPER}"/>`;
    default: return '';
  }
}

function moodBlobSvg(n, size) {
  const mood = MOODS[n];
  if (!mood) return '';
  const dim = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<svg viewBox="0 0 36 36"${dim} aria-hidden="true">` +
    `<ellipse cx="17" cy="19" rx="12.2" ry="11.2" fill="${mood.color}"/>` +
    `<circle cx="31" cy="7" r="2.7" fill="${mood.color}"/>${moodFace(n)}</svg>`;
}

/* ---------- Store ---------- */

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { version: 1, entries: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.entries !== 'object' || parsed.entries === null) {
      return { version: 1, entries: {} };
    }
    return { version: 1, entries: parsed.entries };
  } catch {
    return { version: 1, entries: {} };
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function loadUi() {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUi(ui) {
  localStorage.setItem(UI_KEY, JSON.stringify(ui));
}

/* ---------- Dates ---------- */

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromYmd(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/* Same day N months/years back, clamped to the target month's last day. */
function shiftClamped(d, { months = 0, years = 0 }) {
  const targetMonth = d.getMonth() - months;
  const target = new Date(d.getFullYear() - years, targetMonth, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target;
}

const LONG_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
