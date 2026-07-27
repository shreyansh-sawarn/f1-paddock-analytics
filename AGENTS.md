# AGENTS.md

Instructions for AI coding agents working in this repository. This is the canonical, tool-agnostic instructions file — `CLAUDE.md` and any other tool-specific file (e.g. `GEMINI.md`) are thin pointers to this one, not separate copies. Update this file when guidance changes; there should be nothing tool-specific to maintain elsewhere.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start dev server (Next.js + Turbopack), http://localhost:3000
npm run build    # production build
npm start        # run the production build (run `npm run build` first)
npm run lint     # ESLint (flat config, eslint-config-next/core-web-vitals)
```

There is no test suite in this repo — no test runner is configured and there are no `*.test.js`/`*.spec.js` files. Don't assume one exists or invent test commands.

## Architecture

Next.js App Router (`app/` directory), no backend/database. It's a read-only dashboard over two public F1 data APIs:

- **Ergast-compatible API** at `https://api.jolpi.ca/ergast/f1/...` (a community-run mirror; the original Ergast API is retired) — schedule, results, qualifying, sprint, standings, historical archive. Responses are Ergast-shaped JSON (`MRData.RaceTable.Races`, etc.).
- **OpenF1 API** at `https://api.openf1.org/v1/...` — used only where Ergast can't help: ground-truth session-completion signals via race-control `CHEQUERED` flag events (see `lib/openf1.js`), and Sprint Qualifying lap times (Ergast has no results endpoint for that session).

**Data flow**: every page under `app/*/page.js` is a client component (`"use client"`) that calls this app's own internal routes under `app/api/**/route.js`, which fetch + reshape the external APIs server-side (with `next: { revalidate }` caching). Pages never call Ergast/OpenF1 directly. Follow this same shape for new features: an API route that fetches and reshapes, a client page/component that consumes it.

**Session-completion logic**: a race weekend's sessions don't finish on a predictable schedule (red flags, rain delays). Routes that need to know whether a session has genuinely ended check for real signals — Ergast actually having published results, or an OpenF1 chequered-flag event — instead of computing `start_time + typical_duration`. Preserve this pattern (see `lib/openf1.js` and `app/api/results/route.js`) if you touch anything in this area.

**Theming**: dark/light mode is a `data-theme` attribute on `<html>` (toggled by `components/ThemeToggle.js`, persisted to `localStorage`). Colors live as CSS custom properties in `app/globals.css` (`:root` = light, `[data-theme="dark"]` overrides). New component styles should reference `var(--text-main)`, `var(--card-bg)`, `var(--border-color)`, etc., not hardcoded colors, so both themes stay correct automatically.

**Styling**: plain CSS Modules per component (`Foo.js` + `Foo.module.css`) — no Tailwind, no CSS-in-JS. `@/*` resolves to the repo root (`jsconfig.json`).

## Keeping F1 data current

Parts of this app are hardcoded reference data and UI copy rather than live-fetched — regulations, team identities, and circuit trivia. Treat these the same as "current events": verify against a web search before trusting prior training knowledge or copying an existing entry's pattern forward, especially for anything from the last season or two. Getting this wrong is worse than saying nothing, since it's presented to users as fact.

**`lib/circuitData.js`** — one entry per circuit, keyed by Ergast `circuitId`, covering the full current calendar. Update when: a circuit joins/drops off the calendar (check current entries against whatever `/api/schedule` actually returns — a stale entry for a removed circuit is harmless, but a missing entry for a new one breaks lookups in `RaceCard.js`, `CircuitCard.js`, and `app/circuits/page.js`); a lap or qualifying record is broken (`record` / `qualiRecord`); or new fields are introduced (e.g. `firstGp`, `direction`). Every field is a factual claim rendered to users — verify it, don't infer it from the name or from neighboring entries.

**`lib/circuitMaps.js`** — maps `circuitId` → `/tracks/*.svg`; must stay in lockstep with `circuitData.js`'s keys, or a circuit with data but no map silently shows "Map Unavailable".

**`lib/teamColors.js` / `lib/constructorLogos.js`** — keyed by Ergast `constructorId`. Update on team entries, exits, renames, or rebrands. `constructorLogos.js` also has a fuzzy `NAME_TO_ID` map for archive data that only carries a display name — add new title-sponsor name variants there too (e.g. "Oracle Red Bull Racing").

**`app/circuits/CircuitCard.js` (`getSectorData`)** — per-circuit sector telemetry plus an "Overtake Mode" section describing the car's 2026 overtaking-aid mechanic:

- DRS was replaced by an "Active Aero" system starting in 2026, with two parts: driver-activated Straight Mode in FIA-defined zones (open to any driver — no 1-second-gap gate, a drag-reduction zone like old DRS), and a separate Overtake Mode that's the actual DRS-like overtaking *aid* (still gated behind a 1-second gap, one detection point per lap, +0.5MJ of extra deployable energy usable anywhere on the next lap).
- This app deliberately tracks only Overtake Mode, not Straight Mode. An earlier version tracked per-circuit Straight Mode zone counts, but that was the wrong data to hardcode: the FIA can add/shorten/drop a circuit's zones race to race, making it a maintenance treadmill (re-verify a number before every race weekend, forever). Overtake Mode's mechanic (`OVERTAKE_MODE_MECHANIC`) is fixed by the regulations and doesn't vary by circuit or week, so it's one static, always-correct line instead.
- The only per-circuit part is `flavor` text, deliberately based on stable circuit-layout facts (which straight is the long/famous one) rather than anything regulation-dependent. Circuits without a well-known signature straight (e.g. Albert Park, Villeneuve) intentionally have no entry and fall through to `OVERTAKE_FALLBACK_FLAVOR` rather than inventing one.
- If the rules change again, don't just rename fields — re-apply the test that motivated dropping Straight Mode: would keeping a fact accurate require re-checking a source before every race weekend indefinitely? If yes, make it generic/universal instead of per-circuit.

**General principle**: prefer facts that are stable by nature (circuit layout, geography) over facts that are stable only until the next race weekend (regulatory zone counts, rules still being tuned) — the former can be hardcoded once, the latter is a recurring maintenance cost in disguise. And when a fact is inherently unstable or unverifiable, prefer an honest generic hedge over a precise-sounding invented one.
