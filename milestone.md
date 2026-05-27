# NewTabX — Milestone

## What We Found (tabpilot codebase)

Cloned [florianlanx/tabpilot](https://github.com/florianlanx/tabpilot) as the base.
Stack: TypeScript + Vue 3 + Vite + Tailwind + @crxjs/vite-plugin, Manifest V3.

### What tabpilot already has that we need

| Asset | Location | Status |
|---|---|---|
| Floating spotlight search overlay | `src/content/search-overlay.ts` + `.css` | **Keep as-is** |
| Shadow DOM, dark mode, keyboard nav | `src/content/search-overlay.css` | **Keep as-is** |
| Shortcut → inject + toggle overlay | `src/background/index.ts` → `toggleSearchOverlay()` | **Keep, trim** |
| Tab + history search scorer | `src/background/searcher.ts` | **Keep as-is** |
| Closed-tab history (500 entries) | `src/background/storage.ts` | **Keep as-is** |
| Shared types + constants | `src/shared/types.ts`, `constants.ts`, `utils.ts` | **Keep, trim** |

### What to strip (tab-grouping machine, not our feature)

| Asset | Location | Reason |
|---|---|---|
| Chrome Tab Groups manager | `src/background/tab-manager.ts` (768 lines) | Group/ungroup/collapse/badge/cache — zero overlap |
| Tab classifier (rule engine) | `src/background/classifier.ts` | Classifies tabs into work/dev/social — not needed |
| 155+ domain rules | `src/shared/rules.ts` | Feeds classifier — dead weight |
| AI client (OpenAI/Claude/Gemini) | `src/shared/ai-client.ts` | AI tab grouping — not in scope |
| Tab grouping popup UI | `src/popup/App.vue` + all `components/` | Entire popup is a group manager |
| 9 group message handlers | `src/background/index.ts` (partial) | GROUP_TABS, UNGROUP_ALL, CLOSE_GROUP, etc. |

---

## Hard Constraint: Ctrl+T Cannot Be Intercepted

Chrome reserves `Ctrl+T` in `kAcceleratorMap` — no extension can override it.

**Workaround (two-part):**
1. `chrome_url_overrides: { newtab: "newtab.html" }` — Ctrl+T opens your custom page
2. `chrome.commands` shortcut (`Ctrl+Shift+F`, already in tabpilot) — floating overlay on existing pages

---

## New Target

When user presses **Ctrl+T** or **Ctrl+Shift+F**:

1. A floating search bar appears (centered modal, dark backdrop)
2. As user types, results merge from:
   - **Open tabs** — switch to existing tab (no duplicate)
   - **Google Suggest** — `suggestqueries.google.com/complete/search?client=chrome&q=...`
3. **Enter with no selection** → open `google.com/search?q=<query>` in new tab
4. **Enter on open tab result** → switch to that tab
5. **Enter on Google suggestion** → open search in new tab
6. **Esc** → close overlay

---

## Plan

### Phase 1 — Strip

- Delete `src/background/tab-manager.ts`
- Delete `src/background/classifier.ts`
- Delete `src/shared/rules.ts`
- Delete `src/shared/ai-client.ts`
- Delete `src/popup/components/GroupList.vue`, `GroupItem.vue`, `TabItem.vue`, `SettingsView.vue`
- Replace `src/popup/App.vue` with a minimal popup (just a "Open Search" button)
- Remove the 9 group-related message handlers from `src/background/index.ts`
- Trim `src/shared/types.ts` and `constants.ts` to only what's used

### Phase 2 — Add Google Suggest

In `src/content/search-overlay.ts`, inside `doSearch()`:
- Fetch Google Suggest in parallel with `SEARCH_TABS` message
- Merge: open tabs first → Google suggestions after
- Add a `google` result type with distinct icon (🔍) and badge `GOOGLE`
- `activateResult()` for Google type → `OPEN_URL` with `google.com/search?q=...`

### Phase 3 — New Tab Override

- Add `newtab.html` + `newtab.js` to root
- Register in `manifest.json`: `"chrome_url_overrides": { "newtab": "newtab.html" }`
- `newtab.html` renders the same search overlay UI but as a full page (not injected)
- Has direct access to `chrome.tabs.query` (extension context, no messaging needed)
- Same keyboard nav, same Google Suggest fetch

### Phase 4 — Enter Fallback

- If user hits Enter with empty results or no selection → `chrome.tabs.create({ url: 'https://google.com/search?q=<query>' })`
- If query looks like a URL (`example.com`) → navigate directly instead

---

## File State After Phase 1

```
src/
  background/
    index.ts        ← trimmed: only toggleSearchOverlay + SEARCH_TABS/SWITCH_TAB/OPEN_URL/GET_SETTINGS/SAVE_SETTINGS
    searcher.ts     ← untouched
    storage.ts      ← untouched
  content/
    search-overlay.ts   ← Phase 2: add Google Suggest
    search-overlay.css  ← untouched
  popup/
    index.html      ← minimal
    main.ts         ← untouched
    App.vue         ← replace with simple "Open Search" button
  shared/
    types.ts        ← trimmed
    constants.ts    ← trimmed
    utils.ts        ← untouched
    i18n.ts         ← untouched
newtab.html         ← Phase 3: new file
newtab.js           ← Phase 3: new file
manifest.json       ← Phase 3: add chrome_url_overrides
```
