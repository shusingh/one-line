# One Line · 一行日記

A local-first, one-sentence-a-day journal inspired by the Suminagashi visual
system from `shusingh.github.io`. One line, one mood, and a year that marbles
like ink on water as the entries accumulate.

## What It Does

- Saves one short journal entry per day in the browser: a line of text plus a
  mood, drawn as a hand-made ink-blob face (荒 rough · 曇 cloudy · 凪 calm ·
  晴 clear · 輝 radiant).
- Surfaces entries from one week, one month, and one year ago as quiet
  "margin notes" beside the sheet (fixed in the left margin on wide screens,
  flowing inline between composer and year map on narrow ones), alongside
  this week's moods and the year's mood balance. Nothing collapses; nothing
  is hidden behind a toggle.
- Shows the last 53 weeks as a marbled year map of mood-coloured droplets.
- Provides a Memory Archive page (`memories.html`) with year/month navigation,
  full-text search, mood filtering, pagination, a month map, and monthly
  insights.
- Exports and imports the whole journal as JSON.

All data lives in `localStorage` under `one-line-journal-v1` (UI preferences
under `one-line-ui-v1`). Nothing is sent to a server.

## Run Locally

This is a static site, so any local web server works:

```sh
python3 -m http.server 8642
```

Then open `http://localhost:8642/`.

## Project Shape

- `index.html` — the Today page: margin notes, composer, year map.
- `memories.html` — the Memory Archive.
- `styles.css` — the whole Suminagashi design system for both pages.
- `paper.js` — procedural washi paper, a render-once WebGL port of the
  portfolio's display shader (three octaves of value noise plus a deckled
  vignette). Without WebGL the page falls back to the plain paper colour.
- `shared.js` — mood palette and faces, store access, date helpers.
- `app.js` — Today page behaviour.
- `memories.js` — archive filtering, pagination, detail panel.
- `mocks/` — archived design steps, oldest to newest: first concepts,
  the suminagashi direction, codex's layout drafts, the mood-face study,
  and the approved v2 mocks.

## Design Notes

The visual language follows the portfolio palette and texture:

- `--paper`, `--sumi`, `--ai`, `--matsuba`, `--matcha`, and `--yamabuki`
- Mood colours run cool to warm and deliberately avoid alarm-red; shu
  vermillion appears only as the streak accent.
- Newsreader for display text, Hanken Grotesk for interface text,
  JetBrains Mono for metadata, and Shippori Mincho for the nine kanji the
  app uses, loaded as a Google Fonts `text=` subset.

## Manual Smoke Checks

1. Type a line, pick a mood, press Save: composer clears, saved-today card
   appears, week strip and year map gain today's droplet.
2. Reload: the saved card, streak, and stats persist.
3. Edit and remove from the saved card both work.
4. Margin notes: this week, on-this-day, and mood balance render beside the
   sheet on wide windows and flow inline below the composer when the window
   narrows (breakpoint 1150px).
5. Memory Archive: filters, search, pagination, month map, and insights all
   reflect real entries; empty journal shows the invitation state.
6. Export JSON, import it in a fresh profile, confirm entries restore.
7. Check mobile widths: rail overlays, composer breathes, archive stacks.

## Likely Next Improvements

- Backfill missed days from the year map.
- PWA manifest so the journal installs to a phone home screen.
- Optional encrypted sync target for multiple devices.
