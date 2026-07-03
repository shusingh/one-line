'use strict';

/* Memory Archive page. Uses the store, moods, and date helpers from shared.js. */

const store = loadStore();

/* Flatten the date-keyed map into a newest-first array once; everything else
   filters and slices this. */
const entries = Object.entries(store.entries)
  .filter(([key, entry]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && entry && entry.text)
  .map(([key, entry]) => {
    const date = fromYmd(key);
    return {
      key, date,
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      weekday: WEEKDAY_SHORT[date.getDay()],
      mood: MOODS[entry.mood] ? entry.mood : null,
      text: entry.text,
    };
  })
  .sort((a, b) => (a.key < b.key ? 1 : -1));

const PAGE_SIZE = 8;
const $ = (id) => document.getElementById(id);

const years = [...new Set(entries.map((e) => e.year))].sort((a, b) => b - a);
const state = {
  year: years[0] ?? new Date().getFullYear(),
  month: null,          // null = all months
  mood: 'all',
  query: '',
  page: 0,
};
let selected = entries[0] || null;

/* ---------- Empty journal ---------- */

if (!entries.length) {
  $('journal-empty').hidden = false;
  $('archive').hidden = true;
}

/* ---------- Filtering + stream ---------- */

function filtered() {
  return entries.filter((e) =>
    e.year === state.year &&
    (state.month === null || e.month === state.month) &&
    (state.mood === 'all' || e.mood === Number(state.mood)) &&
    (!state.query || e.text.toLowerCase().includes(state.query)));
}

function renderStream() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages - 1);
  const slice = list.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);

  const stream = $('memory-stream');
  stream.innerHTML = '';
  let lastMonth = -1;
  for (const e of slice) {
    if (e.month !== lastMonth) {
      lastMonth = e.month;
      const heading = document.createElement('div');
      heading.className = 'month-heading';
      const count = list.filter((x) => x.month === e.month).length;
      heading.innerHTML =
        `<h2>${MONTH_NAMES[e.month]} ${e.year}</h2>` +
        `<span>${count} ${count === 1 ? 'memory' : 'memories'}</span>`;
      stream.appendChild(heading);
    }
    const mood = MOODS[e.mood];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'memory-card' + (selected && e.key === selected.key ? ' active' : '');
    card.innerHTML = `
      <span class="date-block"><span class="big-day">${e.day}</span><span class="weekday">${e.weekday}</span></span>
      <span class="memory-copy">
        <span class="memory-meta">${e.mood ? moodBlobSvg(e.mood) : ''}${mood ? `${mood.jp} ${mood.en}` : 'no mood'}</span>
        <span class="memory-text">${escapeHtml(e.text)}</span>
      </span>`;
    card.addEventListener('click', () => select(e));
    stream.appendChild(card);
  }

  if (!slice.length) {
    stream.innerHTML = '<div class="archive-empty">no memories match — loosen the filters</div>';
  }

  const pager = $('pager');
  pager.hidden = pages <= 1;
  $('page-label').innerHTML =
    `page ${state.page + 1} of ${pages} <span class="leaf">・</span> ${list.length} ${list.length === 1 ? 'memory' : 'memories'}`;
  $('newer').disabled = state.page === 0;
  $('older').disabled = state.page >= pages - 1;
}

function select(entry) {
  selected = entry;
  renderStream();
  renderDetail();
}

/* ---------- Detail panel ---------- */

function renderDetail() {
  const detail = $('detail');
  if (!selected) {
    detail.hidden = true;
    return;
  }
  detail.hidden = false;
  const mood = MOODS[selected.mood];
  $('detail-date').textContent = SHORT_DATE.format(selected.date);
  $('detail-line').textContent = selected.text;
  $('detail-mood').innerHTML = mood
    ? `${moodBlobSvg(selected.mood)}${mood.jp} ${mood.en}`
    : 'no mood recorded';
  renderCalendar();
  renderInsights();
}

function renderCalendar() {
  const grid = $('calendar-grid');
  $('cal-title').textContent = `${MONTH_NAMES[selected.month]} map`;
  grid.innerHTML = '';
  const monthEntries = new Map(
    entries.filter((e) => e.year === selected.year && e.month === selected.month)
      .map((e) => [e.day, e]));
  const daysInMonth = new Date(selected.year, selected.month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('button');
    const e = monthEntries.get(day);
    cell.type = 'button';
    cell.className = 'calendar-day' +
      (e ? ' has' : '') +
      (e && e.key === selected.key ? ' sel' : '') +
      (e && e.mood ? ` m${e.mood}` : '');
    cell.setAttribute('aria-label', `${MONTH_NAMES[selected.month]} ${day}`);
    cell.title = e ? `${MONTH_NAMES[selected.month]} ${day} · “${e.text.slice(0, 60)}”` : `${MONTH_NAMES[selected.month]} ${day}`;
    if (e) cell.addEventListener('click', () => select(e));
    else cell.disabled = true;
    grid.appendChild(cell);
  }
}

function bestStreakInMonth(year, month) {
  const days = new Set(
    entries.filter((e) => e.year === year && e.month === month).map((e) => e.day));
  let best = 0;
  let run = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    run = days.has(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function renderInsights() {
  const monthEntries = entries.filter(
    (e) => e.year === selected.year && e.month === selected.month);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const e of monthEntries) if (e.mood) counts[e.mood]++;
  const top = Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a));
  const hasMoods = counts[top] > 0;
  $('insights').innerHTML = `
    <div class="insight"><b>${monthEntries.length}</b><span>entries</span></div>
    <div class="insight"><b class="jp-big">${hasMoods ? MOODS[top].jp : '—'}</b><span>top mood</span></div>
    <div class="insight"><b>${bestStreakInMonth(selected.year, selected.month)}</b><span>best streak</span></div>`;
}

/* ---------- Rail: years and months ---------- */

function renderYears() {
  const stack = $('year-stack');
  stack.innerHTML = '';
  for (const year of years) {
    const count = entries.filter((e) => e.year === year).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'year-btn' + (year === state.year ? ' active' : '');
    btn.innerHTML = `<span>${year}</span><span>${count}</span>`;
    btn.addEventListener('click', () => {
      state.year = year;
      state.month = null;
      state.page = 0;
      renderYears();
      renderMonths();
      renderStream();
    });
    stack.appendChild(btn);
  }
}

function renderMonths() {
  const list = $('month-list');
  list.innerHTML = '';
  for (let m = 0; m < 12; m++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'month-btn' + (state.month === m ? ' active' : '');
    btn.textContent = MONTH_NAMES[m].slice(0, 3);
    btn.disabled = !entries.some((e) => e.year === state.year && e.month === m);
    btn.addEventListener('click', () => {
      state.month = state.month === m ? null : m;   // click again for all months
      state.page = 0;
      renderMonths();
      renderStream();
    });
    list.appendChild(btn);
  }
}

/* ---------- Mood filter ---------- */

function renderMoodFilter() {
  const filter = $('mood-filter');
  filter.innerHTML = '';
  const options = [['all', '<span class="all">ALL</span>', 'All moods']]
    .concat(Object.entries(MOODS).map(([n, m]) => [n, moodBlobSvg(n), m.en]));
  for (const [value, html, label] of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mood-btn' + (state.mood === value ? ' active' : '');
    btn.dataset.mood = value;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = html;
    btn.addEventListener('click', () => {
      state.mood = value;
      state.page = 0;
      renderMoodFilter();
      renderStream();
    });
    filter.appendChild(btn);
  }
}

/* ---------- Wiring ---------- */

$('search').addEventListener('input', (e) => {
  state.query = e.target.value.trim().toLowerCase();
  state.page = 0;
  renderStream();
});
$('newer').addEventListener('click', () => { state.page--; renderStream(); });
$('older').addEventListener('click', () => { state.page++; renderStream(); });

if (entries.length) {
  renderYears();
  renderMonths();
  renderMoodFilter();
  renderStream();
  renderDetail();
}
