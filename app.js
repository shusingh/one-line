'use strict';

/* Today page. Uses the store, moods, and date helpers from shared.js. */

let store = loadStore();
let todayKey = ymd(new Date());

const $ = (id) => document.getElementById(id);
const entryEl = $('entry');
const hintEl = $('hint');
const counterEl = $('counter');
const moodsEl = $('moods');
const saveBtn = $('save-btn');
const todaySavedEl = $('today-saved');
const todaySavedWhenEl = $('today-saved-when');
const todaySavedTextEl = $('today-saved-text');

const HINT_NEEDS_LINE = 'write today’s line, then pick a mood';
const HINT_NEEDS_MOOD = 'pick a mood to save today';
const HINT_READY = 'press enter or save';

let selectedMood = null;
let saveTimer = null;
let hintTimer = null;

/* ---------- Today's entry ---------- */

function todayEntry() {
  return store.entries[todayKey] || null;
}

function persistToday({ announce = false, clearComposer = false } = {}) {
  const text = entryEl.value.trim();
  const mood = selectedMood;
  if (!text) {
    updateSaveState();
    if (announce) flashHint('write your line first');
    return false;
  }
  if (!mood) {
    updateSaveState();
    if (announce) flashHint('pick a mood first');
    return false;
  }
  store.entries[todayKey] = { text, mood };
  saveStore(store);
  renderAll();
  if (clearComposer) clearTodayComposer();
  else updateSaveState();
  if (announce) flashHint('set down in ink ✓');
  return true;
}

function debouncedPersist() {
  clearTimeout(saveTimer);
  updateSaveState();
  saveTimer = setTimeout(() => persistToday(), 400);
}

function flashHint(message) {
  clearTimeout(hintTimer);
  hintEl.textContent = message;
  hintEl.classList.add('saved');
  hintTimer = setTimeout(() => {
    hintEl.classList.remove('saved');
    updateSaveState();
  }, 2200);
}

function updateSaveState() {
  const hasText = Boolean(entryEl.value.trim());
  saveBtn.disabled = !hasText || !selectedMood;
  if (!hintEl.classList.contains('saved')) {
    hintEl.textContent = !hasText ? HINT_NEEDS_LINE : !selectedMood ? HINT_NEEDS_MOOD : HINT_READY;
  }
  const len = entryEl.value.length;
  counterEl.textContent = `${len} / 240`;
  counterEl.classList.toggle('show', len >= 200);
  counterEl.classList.toggle('near', len >= 230);
  renderTodaySaved();
}

function clearTodayComposer() {
  entryEl.value = '';
  selectedMood = null;
  syncMoodSelection();
  updateSaveState();
}

function renderTodaySaved() {
  const entry = todayEntry();
  const mood = entry ? MOODS[entry.mood] : null;
  const hasDraft = Boolean(entryEl.value.trim() || selectedMood);
  if (!entry || !entry.text || hasDraft) {
    todaySavedEl.hidden = true;
    return;
  }
  // Legacy entries may lack a mood; still show the saved line.
  todaySavedWhenEl.innerHTML = mood
    ? `${moodBlobSvg(entry.mood)} saved today · ${mood.jp} ${mood.en}`
    : 'saved today';
  todaySavedTextEl.textContent = entry.text;
  todaySavedEl.hidden = false;
}

entryEl.addEventListener('input', debouncedPersist);
entryEl.addEventListener('blur', () => {
  clearTimeout(saveTimer);
  persistToday();
});
entryEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    entryEl.blur();
    persistToday({ announce: true, clearComposer: true });
  }
});
saveBtn.addEventListener('click', () => {
  clearTimeout(saveTimer);
  persistToday({ announce: true, clearComposer: true });
});
$('edit-today-btn').addEventListener('click', () => {
  const entry = todayEntry();
  if (!entry || !entry.text) return;
  entryEl.value = entry.text;
  selectedMood = MOODS[entry.mood] ? entry.mood : null;
  syncMoodSelection();
  renderTodaySaved();
  entryEl.focus();
});
$('remove-today-btn').addEventListener('click', () => {
  delete store.entries[todayKey];
  saveStore(store);
  clearTodayComposer();
  renderAll();
  flashHint('today’s line removed');
});

/* ---------- Mood picker ---------- */

function renderMoodButtons() {
  moodsEl.innerHTML = '';
  for (const [value, mood] of Object.entries(MOODS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.mood = value;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', `${mood.en} (${mood.jp})`);
    btn.innerHTML =
      `${moodBlobSvg(value, 34)}<span class="jp-name">${mood.jp}</span><span class="name">${mood.en}</span>`;
    btn.addEventListener('click', () => {
      selectedMood = selectedMood === Number(value) ? null : Number(value);
      syncMoodSelection();
      if (selectedMood) {
        btn.classList.add('bloom');
        setTimeout(() => btn.classList.remove('bloom'), 500);
      }
      clearTimeout(saveTimer);
      persistToday({ announce: Boolean(entryEl.value.trim()) });
    });
    moodsEl.appendChild(btn);
  }
}

function syncMoodSelection() {
  for (const btn of moodsEl.children) {
    const active = Number(btn.dataset.mood) === selectedMood;
    btn.classList.toggle('sel', active);
    btn.setAttribute('aria-checked', String(active));
  }
  updateSaveState();
}

/* ---------- Margin notes ---------- */

function lastSevenDays() {
  const today = fromYmd(todayKey);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    const key = ymd(date);
    days.push({ key, date, entry: store.entries[key] || null });
  }
  return days;
}

function renderWeek() {
  const week = $('week');
  week.innerHTML = '';
  for (const day of lastSevenDays()) {
    const dot = document.createElement('i');
    const moodClass = day.entry && MOODS[day.entry.mood] ? `m${day.entry.mood}` : '';
    dot.className = `${moodClass}${day.key === todayKey ? ' today' : ''}`.trim();
    dot.title = `${SHORT_DATE.format(day.date)}${day.entry ? ` · “${day.entry.text}”` : ' · no entry'}`;
    week.appendChild(dot);
  }
}

function renderFlashbacks() {
  const list = $('flashes');
  const today = fromYmd(todayKey);
  const lookbacks = [
    ['one week ago', addDays(today, -7)],
    ['one month ago', shiftClamped(today, { months: 1 })],
    ['one year ago', shiftClamped(today, { years: 1 })],
  ];

  list.innerHTML = '';
  let shown = 0;
  for (const [label, date] of lookbacks) {
    const entry = store.entries[ymd(date)];
    if (!entry || !entry.text) continue;
    const item = document.createElement('div');
    item.className = 'm-entry';
    const face = MOODS[entry.mood] ? moodBlobSvg(entry.mood) : '';
    item.innerHTML =
      `<p class="quote">“${escapeHtml(entry.text)}”</p>` +
      `<div class="m-when">${face} ${label}</div>`;
    list.appendChild(item);
    shown++;
  }

  if (shown === 0) {
    const note = document.createElement('p');
    note.className = 'm-empty';
    note.textContent = 'Memories surface here as the ink accumulates: what you wrote a week, a month, a year ago today.';
    list.appendChild(note);
  }
}

function renderBalance() {
  const year = todayKey.slice(0, 4);
  $('balance-title').innerHTML = `Mood balance · ${year}`;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const [key, entry] of Object.entries(store.entries)) {
    if (key.startsWith(year) && counts[entry.mood] !== undefined) counts[entry.mood]++;
  }
  $('balance').innerHTML = Object.entries(MOODS)
    .map(([n, m]) => `<span title="${m.jp} ${m.en}">${moodBlobSvg(n, 19)}${counts[n]}</span>`)
    .join('');
}

/* ---------- Stats ---------- */

function computeStreak() {
  let streak = 0;
  let cursor = fromYmd(todayKey);
  // Today still counts as pending until written; start from yesterday if so.
  if (!store.entries[ymd(cursor)]) cursor = addDays(cursor, -1);
  while (store.entries[ymd(cursor)]) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function renderStats() {
  const year = todayKey.slice(0, 4);
  const count = Object.keys(store.entries).filter((k) => k.startsWith(year)).length;
  $('stat-entries').textContent = `${count} ${count === 1 ? 'entry' : 'entries'} · ${year}`;
  const streak = computeStreak();
  $('stat-streak').textContent =
    streak > 1 ? `${streak}-day streak 〜` : streak === 1 ? 'the first drop 〜' : 'begin today 〜';
}

/* ---------- The year, marbled ---------- */

const WEEKS = 53;

function renderHeatmap() {
  const map = $('heatmap');
  const monthRow = $('month-row');
  map.innerHTML = '';
  monthRow.innerHTML = '';

  const today = fromYmd(todayKey);
  // Trailing 53 week-columns, ending with the current week (Sunday-start).
  const start = addDays(today, -(today.getDay() + (WEEKS - 1) * 7));

  let prevMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const weekStart = addDays(start, w * 7);
    const label = document.createElement('span');
    if (weekStart.getMonth() !== prevMonth && weekStart.getDate() <= 14) {
      label.textContent = weekStart.toLocaleString('en-US', { month: 'short' });
    }
    prevMonth = weekStart.getMonth();
    monthRow.appendChild(label);

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const key = ymd(date);
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (date > today) {
        cell.classList.add('future');
      } else {
        const entry = store.entries[key];
        if (entry) {
          const mood = MOODS[entry.mood];
          if (mood) cell.classList.add(`m${entry.mood}`);
          cell.classList.add('filled');
          const moodName = mood ? `${mood.jp} ${mood.en}` : 'no mood';
          const snippet = entry.text ? ` · “${entry.text.slice(0, 60)}${entry.text.length > 60 ? '…' : ''}”` : '';
          cell.title = `${SHORT_DATE.format(date)} · ${moodName}${snippet}`;
          cell.addEventListener('click', () => showDayDetail(key));
        } else {
          cell.title = `${SHORT_DATE.format(date)} · no entry`;
        }
        if (key === todayKey) cell.classList.add('today');
      }
      map.appendChild(cell);
    }
  }

  // Keep the present moment in view.
  const scroll = $('heatmap-scroll');
  scroll.scrollLeft = scroll.scrollWidth;
}

function renderLegend() {
  $('legend').innerHTML = Object.entries(MOODS)
    .map(([n, m]) => `<span><i class="m${n}"></i>${m.jp} ${m.en}</span>`)
    .join('');
}

function showDayDetail(key) {
  const entry = store.entries[key];
  if (!entry) return;
  const detail = $('day-detail');
  const date = fromYmd(key);
  const mood = MOODS[entry.mood];
  const face = mood ? `${moodBlobSvg(entry.mood)} ${mood.jp} ${mood.en} · ` : '';
  $('detail-when').innerHTML = `${face}${SHORT_DATE.format(date)}`;
  $('detail-text').textContent = entry.text || '(mood only, no words that day)';
  detail.hidden = false;
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('detail-close').addEventListener('click', () => { $('day-detail').hidden = true; });

/* ---------- Export / import ---------- */

$('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `one-line-${todayKey}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  flashHint('ink exported ✓');
});

$('import-btn').addEventListener('click', () => $('import-file').click());

$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const entries = parsed && typeof parsed.entries === 'object' ? parsed.entries : null;
    if (!entries) throw new Error('not a One Line export');
    let imported = 0;
    for (const [key, entry] of Object.entries(entries)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !entry || typeof entry !== 'object') continue;
      const clean = { text: typeof entry.text === 'string' ? entry.text.trim().slice(0, 240) : '' };
      const mood = Number(entry.mood);
      if (mood >= 1 && mood <= 5) clean.mood = mood;
      // Older exports allowed a line without a mood; keep those on restore.
      if (!clean.text) continue;
      store.entries[key] = clean; // an import is a restore: the file wins
      imported++;
    }
    saveStore(store);
    initToday();
    renderAll();
    flashHint(`imported ${imported} ${imported === 1 ? 'entry' : 'entries'} ✓`);
  } catch {
    flashHint('could not read that file');
  }
});

/* ---------- Init ---------- */

function initToday() {
  todayKey = ymd(new Date());
  $('today-date').textContent = LONG_DATE.format(fromYmd(todayKey));
  const entry = todayEntry();
  // Only drop truly empty records; legacy text-only entries stay.
  if (entry && !entry.text && !MOODS[entry.mood]) {
    delete store.entries[todayKey];
    saveStore(store);
  }
  entryEl.value = '';
  selectedMood = null;
  syncMoodSelection();
  updateSaveState();
  renderTodaySaved();
}

function renderAll() {
  renderTodaySaved();
  renderWeek();
  renderFlashbacks();
  renderBalance();
  renderStats();
  renderHeatmap();
  renderLegend();
}

// If the tab lives past midnight, roll gracefully into the new day,
// carrying any unsaved draft along rather than wiping it.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ymd(new Date()) !== todayKey) {
    const draftText = entryEl.value;
    const draftMood = selectedMood;
    initToday();
    if (draftText.trim() || draftMood) {
      entryEl.value = draftText;
      selectedMood = draftMood;
      syncMoodSelection();
    }
    renderAll();
  }
});

renderMoodButtons();
initToday();
renderAll();
entryEl.focus();
