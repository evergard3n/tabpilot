# TabPilot — Agent Quick-Start

## Must-Know

- **Package manager**: `pnpm` (10.28.0). Do not use npm/yarn.
- **Product**: Chrome Manifest V3 extension. Load `dist/` as an unpacked extension in `chrome://extensions` (Developer Mode).
- **Build tool**: Vite + `@crxjs/vite-plugin`. `manifest.json` is the source of truth for extension config.

## Commands

```bash
pnpm install          # install deps
pnpm dev              # dev server with HMR
pnpm build            # production build → dist/
pnpm test             # run tests (vitest run)
pnpm test:watch       # watch mode
pnpm typecheck        # vue-tsc --noEmit (alias: pnpm lint)
```

## Architecture

| Directory | Role |
|-----------|------|
| `src/background/index.ts` | Service worker entrypoint. Handles messages, tab history, search overlay toggle. |
| `src/content/search-overlay.ts` | Content script injected on all URLs. Builds a Shadow-DOM spotlight search UI. |
| `src/popup/` | Vue 3 popup (`main.ts` → `App.vue`). |
| `src/shared/` | Types, constants, utils, i18n. |
| `tests/` | Vitest tests (node env, globals enabled). |

- Path alias: `@/` → `src/`
- Tailwind uses CSS-variable-based theme (`--bg-primary`, etc.) with `darkMode: 'class'`.

## Critical Gotchas

### Broken tests / missing source files
`tests/classifier.test.ts` and `tests/rules.test.ts` import `src/background/classifier.ts` and `src/shared/rules.ts`, but those files were deleted per `milestone.md` (strip plan). This means:

- `pnpm test` fails on 2 of 3 test suites.
- `pnpm typecheck` fails because of the missing imports.
- `pnpm build` still succeeds (it only compiles reachable source).

**Do not try to "fix" the build by recreating the deleted modules unless the task explicitly asks for it.** If you need passing tests/typecheck, delete or skip the orphaned test files first.

### Content-script ↔ background communication
The content script uses a **closed Shadow DOM** and exposes two globals on `window`:
- `__ATM_SEARCH_LOADED__` — guard against double-injection.
- `__ATM_TOGGLE_SEARCH__` — background calls this via `scripting.executeScript` to show/hide the overlay.

Background also sends `TOGGLE_SEARCH_OVERLAY` messages as a fallback. If you change the overlay lifecycle, update both paths in `src/background/index.ts`.

### Release / packaging
- **GitHub Release**: `.github/workflows/release.yml` triggers on `v*` tags. Runs `typecheck → test → build`, then zips `dist/` (excludes `.DS_Store` and `.vite/*`).
- **Chrome Web Store**: `scripts/build-store.sh` does the same zip packaging locally.

## Style Conventions

- Conventional Commits.
- TypeScript strict mode. Avoid `any`; comment if unavoidable.
- Naming: files `kebab-case.ts`, types `PascalCase`, vars `camelCase`, consts `UPPER_SNAKE_CASE`.
- Vue: extract complex template expressions into `computed`, avoid nested ternaries.
- Keep functions short (~40 lines), single responsibility.
- Remove unused imports/vars before committing.
