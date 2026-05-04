# CLAUDE.md — 250 & 500 Card Game Project Bible

> **You (Claude Code) are the sole builder and maintainer of this product.**
> There are no human engineers. There are no human code reviews.
> Your safety net is: a strict 5–6 agent team with TDD, dedicated code review, and SOLID-enforced quality gates.
> Read this file at the start of every session.

---

## Project Overview

**250 & 500 Card Game** — A mobile web app for the Indian trick-taking bidding card games "250" (6 players) and "500" (8 players). Two modes:

- **Scorekeeper Mode** (in-person play): Friends play with physical cards at a table; the app records bids, partner-calls, and computes scores per the canonical rules. No multiplayer, no card display, no trick tracking. Pure local PWA — installable on phone home screen, works offline.
- **Online Mode** (remote play): Full multiplayer game with server-authoritative card dealing, real-time bidding, trick play, and partner-reveal mechanics. Requires backend.

**Mobile-only.** Designed for portrait phone screens (~360px wide). No desktop layout. No tablet layout. iOS Safari + Android Chrome are the only target browsers.

**Phase 1 = Scorekeeper PWA.** Phase 2 = Online multiplayer added on top.

**Game rules source of truth:** `RULES.md` at project root. If implementation diverges from RULES.md, RULES.md wins until updated.

**Visual design source of truth:** `docs/MOBILE-DESIGN-LANGUAGE.md`. All UI work references this.

---

## Architecture Summary

### Phase 1 — Scorekeeper PWA (no backend)

```
┌─────────────────────────────────────────┐
│           Mobile browser (PWA)          │
│  ┌──────────────────────────────────┐   │
│  │  React + Vite SPA                │   │
│  │  - Zustand stores                │   │
│  │  - localStorage persistence      │   │
│  │  - Tailwind mobile-first         │   │
│  │  - Service worker (offline)      │   │
│  │  - Install to home screen        │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
                 │
        Hosted on Vercel/Netlify (free)
        Single static site, no server
```

No accounts, no network calls (after install). The app is a calculator that knows the rules.

### Phase 2 — Online Mode (added on top)

```
┌─────────────────────────────────────────────────┐
│              Railway (single host)              │
│  ┌─────────────────┐    ┌─────────────────┐     │
│  │ React (the same │◄──►│ Node + Express  │     │
│  │ scorekeeper UI  │ WS │ + Socket.io     │     │
│  │ extended w/ card│    │ Authoritative   │     │
│  │ slider + trick  │    │ in-memory state │     │
│  │ area)           │    │ Pino logging    │     │
│  └─────────────────┘    └─────────────────┘     │
│           ▲                       ▲             │
│           └─ packages/shared (Zod) ┘            │
└─────────────────────────────────────────────────┘
        ▲                                ▲
   8 phones (mobile portrait)      8 phones
```

**Server-authoritative.** Hand privacy paramount. Every action validated server-side.

### Mode Switching

The app's home screen shows two buttons: "Score in-person game" (Scorekeeper) and "Play online" (Online). The bidding flow, partner-call UI, and scoring logic are SHARED COMPONENTS used by both modes. Online mode wraps them with card dealing, trick-taking, and Socket.io sync.

---

## Agent Team

This project is built by a multi-agent team. **There are no humans writing code.** TDD is mandatory. SOLID is enforced. Every commit goes through a code review gate.

### Phase 1 Team (5 agents — no backend)

| Agent | Model | Owns |
|-------|-------|------|
| **tech-lead** | Opus | Orchestration, planning, integration, quality gates, commits, CLAUDE.md updates |
| **frontend-dev** | Sonnet | React components, pages, Zustand stores, Tailwind styling, scoring engine, localStorage |
| **qa-engineer** | Sonnet | Vitest unit + component tests, Playwright E2E (mobile viewport), PWA tests |
| **code-reviewer** | Opus | Security, SOLID, performance, mobile UX correctness, accessibility, RULES.md cross-check |
| **docs-updater** | Haiku | CLAUDE.md, epic status, JSDoc, design language doc updates |

### Phase 2 Team (6 agents — adds backend)

Same as Phase 1 plus:

| Agent | Model | Owns |
|-------|-------|------|
| **backend-dev** | Sonnet | Node + Express + Socket.io, game state machine, Zod schemas in shared package, in-memory store |

`backend-dev.md` exists in `.claude/agents/` from day one but is dormant during Phase 1. tech-lead does NOT delegate to it before E07.

### Build Session Workflow

1. **tech-lead** reads CLAUDE.md → reads RULES.md → reads epic file → breaks into shared/frontend/backend tasks → notes dependencies
2. **qa-engineer** writes failing tests for the new behavior (TDD red phase)
3. **frontend-dev** (and backend-dev in Phase 2) execute in parallel where possible
4. **tech-lead** integrates, runs `npm run typecheck`, `npm run lint`
5. **qa-engineer** runs full suite, audits coverage, returns PASS/FAIL
6. **code-reviewer** audits security + SOLID + mobile UX + accessibility, returns PASS/FAIL
7. **docs-updater** updates CLAUDE.md (Current State, Decisions Log), JSDoc
8. **tech-lead** commits with conventional message

### TDD Protocol (Non-Negotiable)

Every feature follows red-green-refactor. No code merges without tests written first. The code-reviewer FAILS any PR that has untested code.

### Pre-commit Gate (Non-Negotiable)

**The tech-lead may NEVER commit without all of these passing in this exact order:**

1. **TDD red phase verified** — qa-engineer wrote failing tests BEFORE implementation. Tests file must exist with at least one assertion before any production code is written.
2. **All quality gates green** — `npm run typecheck && npm run lint && npm run test && npm run build` (and `npm run test:e2e` after every UI epic).
3. **qa-engineer subagent returns PASS** — independent review of test coverage, edge cases hunted, test pyramid honored.
4. **code-reviewer subagent returns PASS** — independent audit against the full code-reviewer.md checklist, including:
   - Convention compliance (file size, naming, types)
   - Mobile UX (no `md:`/`lg:` breakpoints, ≥44×44px tap targets, action button at bottom)
   - Security (hand privacy, server authority, Zod validation, CORS via env)
   - Game logic vs RULES.md (cross-checked rule by rule)
   - SOLID, performance, error handling, accessibility
5. **docs-updater subagent runs** — CLAUDE.md Current State table updated, Decisions Log entry added if architectural decision was made, JSDoc on every newly exported function/component.

If the tech-lead skips any of these and commits, the next session's first action is to revert and replay this process. **No "I'll fix it in the next commit" exceptions.** This is what your safety net depends on.

The first close of this project skipped steps 3–5 and shipped 11 critical bugs (scoring math wrong, clockwise-default rule disabled, reconnection broken, CORS wide-open, tap targets below 44px, no test for the 500 first-3♠/3♥ rule, no hand-privacy network test). All caught by the closing audit. None had been caught by the implementation pass alone. **The audit is the safety net. Skipping it removes the safety net.**

---

## File Structure

### Phase 1 (Scorekeeper PWA only)

```
250-500-card-game/
├── CLAUDE.md
├── RULES.md
├── README.md
├── package.json
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── vite.config.ts                  # Vite + PWA plugin
├── tailwind.config.ts              # Mobile-first
├── postcss.config.js
├── playwright.config.ts            # Mobile viewport (iPhone 12 Pro)
├── vitest.config.ts
├── index.html
├── public/
│   ├── manifest.json               # PWA manifest
│   └── icons/                      # PWA icons (multiple sizes)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── HomePage.tsx            # Mode picker: Scorekeeper or Online
│   │   ├── ScorekeeperSetupPage.tsx
│   │   ├── ScorekeeperHandPage.tsx
│   │   └── ScorekeeperHistoryPage.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (mobile-tuned)
│   │   ├── shared/                 # SHARED across both modes (used by Phase 2 too)
│   │   │   ├── BiddingFlow.tsx
│   │   │   ├── TrumpPicker.tsx
│   │   │   ├── PartnerPicker.tsx
│   │   │   ├── HandResultEntry.tsx
│   │   │   ├── ScoreBoard.tsx
│   │   │   └── BidderBadge.tsx
│   │   ├── scorekeeper/            # SCOREKEEPER-MODE-SPECIFIC
│   │   │   ├── PlayerSetup.tsx
│   │   │   └── HandSummary.tsx
│   │   └── common/
│   │       ├── ErrorBoundary.tsx
│   │       └── PageHeader.tsx
│   ├── hooks/
│   │   ├── useScoreKeeper.ts
│   │   └── usePersistedStore.ts
│   ├── stores/
│   │   ├── scorekeeper-store.ts    # Zustand + persist middleware
│   │   └── settings-store.ts
│   ├── lib/
│   │   ├── games/
│   │   │   ├── 250.ts              # Constants for 250
│   │   │   ├── 500.ts              # Constants for 500
│   │   │   └── shared.ts           # Common types
│   │   ├── scoring/
│   │   │   ├── score-hand.ts       # The scoring formula (pure function)
│   │   │   └── score-hand.test.ts  # Co-located unit tests
│   │   ├── cards/
│   │   │   ├── card-types.ts       # Card, Suit, Rank
│   │   │   └── card-utils.ts       # cardId, suit/rank helpers
│   │   └── pwa/
│   │       └── register-sw.ts
│   ├── styles/
│   │   └── globals.css
│   └── tests/
│       └── e2e/
│           ├── scorekeeper-flow.spec.ts
│           └── pwa-install.spec.ts
└── .claude/
    ├── agents/
    │   ├── tech-lead.md
    │   ├── frontend-dev.md
    │   ├── qa-engineer.md
    │   ├── code-reviewer.md
    │   ├── docs-updater.md
    │   └── backend-dev.md          # Dormant until Phase 2
    └── epics/
        ├── README.md
        ├── E01-mobile-pwa-setup.md
        ├── E02-game-state-persistence.md
        ├── E03-bidding-flow.md
        ├── E04-trump-and-partner-picker.md
        ├── E05-hand-result-and-scoring.md
        ├── E06-pwa-polish-and-deploy.md
        ├── E07-backend-and-rooms.md       # Phase 2
        ├── E08-online-game-engine.md      # Phase 2
        ├── E09-online-frontend.md         # Phase 2
        └── E10-online-polish-and-deploy.md # Phase 2
```

### Phase 2 (adds backend; restructures to monorepo)

When E07 begins, restructure to npm workspaces:

```
250-500-card-game/
├── packages/
│   ├── shared/                     # Zod schemas — extracted from src/lib/games + src/lib/cards
│   ├── api/                        # New: Node + Express + Socket.io
│   └── web/                        # The current src/ becomes this
└── ...
```

The migration is mechanical — move files, add `@250-500/shared` import paths. Tracked in E07.

---

## Conventions — FOLLOW THESE EXACTLY

### Mobile-First, Mobile-Only

- **Target viewport:** 360px–414px wide, portrait orientation. iPhone SE (375×667) is the smallest supported.
- **Tap targets:** minimum 44×44px. Card tap targets minimum 60×84px.
- **No hover states** as primary interaction (touch devices have no hover). Use `:active` and `:focus-visible`.
- **Safe area insets:** respect `env(safe-area-inset-top/bottom)` for notch/home-indicator phones.
- **Action buttons** live at the BOTTOM of the screen, within thumb reach.
- **One screen does one thing.** Don't cram multiple concerns into a single page. Use full-screen flows for picking cards, declaring trump, etc.
- **Bottom sheets** for modals (slide up from bottom), not center-screen dialogs.
- **No horizontal scrolling** EXCEPT the card slider (which is intentional and snap-scrolled).
- **Test on real phones** during E06 polish. Browser dev tools are not enough.

### File Rules

- One responsibility per file. Max 300 lines per file (400 for cohesive pure-logic).
- Max 50 lines per function.
- Tests co-located: `foo.ts` next to `foo.test.ts`.
- E2E tests in `src/tests/e2e/`.

### Naming

- Files: `kebab-case.ts` except React components (`PascalCase.tsx`).
- Variables/functions: `camelCase`.
- Types/Zod schemas: `PascalCase` for types, `camelCase` with `Schema` suffix.
- Constants: `SCREAMING_SNAKE_CASE`.
- Test files: `foo.test.ts` (unit), `flow-name.spec.ts` (Playwright).

### TypeScript Rules

- Strict mode in every package — `strict: true`, `noUncheckedIndexedAccess: true`.
- No `any` — use `unknown` and Zod parsing.
- No `@ts-ignore` / `@ts-expect-error` — fix the actual type issue.
- No non-null assertions (`!`) without `// SAFETY:` comment.
- All exported functions have explicit return types.

### Zod Rules (Phase 1 — local schemas; Phase 2 — shared package)

- Zod schemas are the single source of truth for data shapes.
- Derive TypeScript types: `type X = z.infer<typeof xSchema>`.
- Validate at every external boundary (localStorage reads, network responses).
- Reject invalid input gracefully (Phase 1: log to console, fall back to default; Phase 2: log to Pino, ignore event).

### React Rules

- Functional components only.
- Props interface at top of file with JSDoc per prop.
- One component per file.
- Composition over inheritance.
- Memoize via `React.memo`, `useMemo`, `useCallback` only where measurements justify it.
- Pure presentation components separate from connected components.

### Zustand Rules

- One store per domain. Don't make a mega-store.
- Use selectors: `useScorekeeperStore((s) => s.currentBid)` — not `useScorekeeperStore()`.
- Persist via `zustand/middleware`'s `persist` to localStorage. Wrap in Zod parse on hydration.
- All state mutations via store actions.

### Tailwind Rules

- Tailwind utilities only. No custom CSS files except `globals.css` (which holds Tailwind directives + brand CSS variables).
- Brand color tokens in `tailwind.config.ts` — see MOBILE-DESIGN-LANGUAGE.md for the palette.
- Mobile-first defaults — no `md:` or `lg:` breakpoints in Phase 1 (we don't ship desktop).

### Git

- Conventional commits: `feat(scope): ...`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `chore(scope):`, `docs(scope):`.
- Phase 1 scopes: `setup`, `score`, `bid`, `partner`, `result`, `pwa`, `ui`, `infra`, `docs`.
- Phase 2 adds: `api`, `engine`, `socket`, `room`.
- One logical change per commit. No `--no-verify`.

### Logging Rules

- Phase 1: `console.error` for unexpected; `console.warn` for invalid persisted state. No `console.log` in production code (only in tests).
- Phase 2 backend: Pino structured JSON. Never log card hands.

---

## Quality Gate Commands

### Phase 1
```bash
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run test           # Vitest (unit + component)
npm run test:e2e       # Playwright (mobile viewport)
npm run build          # Vite build (verify PWA assets generated)
```

### Phase 2
Same as Phase 1 but at workspace root, runs across all packages.

---

## How to Add a New Feature

1. Read the relevant epic in `.claude/epics/`.
2. tech-lead plans the cut.
3. **Write the failing test first** (qa-engineer).
4. Implement until tests pass (frontend-dev, +backend-dev in Phase 2).
5. Run all quality gates.
6. code-reviewer audits — must return PASS.
7. docs-updater updates CLAUDE.md.
8. tech-lead commits.

---

## How to Fix a Bug

1. Write a failing test reproducing the bug.
2. Fix until test passes.
3. Run full suite — no regressions.
4. Commit: `fix(scope): description`.

---

## Current State

> **UPDATE THIS SECTION after every build session.**

### Phase 1 — Scorekeeper PWA

| Epic | Status | Notes |
|------|--------|-------|
| E01 — Mobile PWA Setup | Complete | npm workspaces, Vite + React + PWA, Tailwind, Vitest, Playwright (mobile viewport) |
| E02 — Game State Persistence | Complete | Card types, schemas, Zustand persist + Zod hydration, setup page |
| E03 — Bidding Flow | Complete | Round-robin bid entry; reused by Online too |
| E04 — Trump + Partner Picker | Complete | TrumpPicker (4 suits) + PartnerPicker (4×12 grid, ≥44px tap targets) |
| E05 — Hand Result + Scoring | Complete | Pure scoring engine, HandResultEntry, multi-hand, game-over screen |
| E06 — PWA Polish + Deploy | Complete | Real PWA icons, vercel.json, netlify.toml, README, deploy runbook |

### Phase 2 — Online Mode

| Epic | Status | Notes |
|------|--------|-------|
| E07 — Backend + Rooms | Complete | Express + Socket.io, RoomStore, rejoin tokens, validated CORS |
| E08 — Online Game Engine | Complete | Deck, trick, partners (with voluntary reveal + clockwise default), hand-privacy verified end-to-end |
| E09 — Online Frontend | Complete | HandSlider, TrickArea, OpponentsRow, TopStateStrip, ConnectionStatus, ReconnectionBanner |
| E10 — Online Polish + Deploy | Complete | Rate limiting, graceful shutdown, single-Railway deploy via esbuild bundle |

**Last updated:** 2026-05-04
**Known issues:** None — all 11 critical issues from the closing code-reviewer audit (2026-05-04) fixed and regression-tested.
**Current phase:** All 10 epics shipped. Repo at github.com/betacraft/250-500-card-game. Ready to deploy to Railway.

---

## Key Decisions Log

| # | Decision | Reasoning | Date |
|---|----------|-----------|------|
| 1 | 6-agent team (full pattern) | Medium-large project, real-time multiplayer in Phase 2, complex partner mechanics in 500 | 2026-05-03 |
| 2 | Server-authoritative architecture, in-memory state (Phase 2) | Card games require hand privacy and cheat resistance; clients can never be trusted with full state | 2026-05-03 |
| 3 | Socket.io over raw WebSockets (Phase 2) | Built-in room support, automatic reconnection, fallback to polling | 2026-05-03 |
| 4 | Monorepo with npm workspaces (Phase 2 only) | Phase 1 is single-package; restructure when backend lands. Avoid premature complexity. | 2026-05-03 |
| 5 | No database for MVP | Ephemeral games don't need persistence beyond localStorage in Phase 1 / in-memory in Phase 2 | 2026-05-03 |
| 6 | No user authentication | Just enter a name and a room code (Phase 2) or just play (Phase 1). Removes signup friction. | 2026-05-03 |
| 7 | Tailwind + shadcn/ui | Mobile-first responsive comes free. shadcn/ui gives us accessible primitives without lock-in. | 2026-05-03 |
| 8 | Zustand over Redux/Context | Lightweight, no providers, perfect for the small number of stores we need. | 2026-05-03 |
| 9 | Build 250 first, then 500 | 250 has simpler partner mechanics (no voluntary-reveal). | 2026-05-03 |
| 10 | **Mobile-only — no desktop** | Real-world play is on phones. Designing for desktop adds complexity with zero user benefit. | 2026-05-03 |
| 11 | **Dual-mode: Scorekeeper PWA first, then Online** | Scorekeeper is a useful product on its own and validates ~60% of the eventual online game's UX with no backend. Ship Phase 1 in 1–2 weeks; build Phase 2 on the validated foundation. | 2026-05-03 |
| 12 | **Phase 1 has no backend, no monorepo, no shared package** | Single React PWA. Move to monorepo + shared Zod package when Phase 2 begins (E07 includes the migration). | 2026-05-03 |
| 13 | **Card hand displayed as horizontal snap-scroll slider on mobile** | Phones are too narrow for fanned/grid hand layouts. Slider preserves visibility, allows large tap targets, and feels native to mobile. | 2026-05-03 |
| 14 | **Visual design language captured in `docs/MOBILE-DESIGN-LANGUAGE.md`** | Centralized reference so frontend-dev and code-reviewer have a single source of truth for visual decisions. | 2026-05-03 |
| 15 | **Single-service Railway deploy serves both API and built frontend** | Eliminates CORS complexity, removes the need for two deployments and two domains; one URL serves Scorekeeper PWA + Online multiplayer. The Express server serves `packages/web/dist` static files when `NODE_ENV=production`. | 2026-05-04 |
| 16 | **API server bundled with esbuild instead of plain `tsc` emit** | TypeScript ESM emit doesn't add `.js` extensions to relative imports, which Node refuses to resolve at runtime. Bundling produces a single self-contained `dist/server.js` (~40KB) with the workspace `@250-500/shared` package inlined and runtime npm packages (Express, Socket.io, Pino, Zod) declared external. | 2026-05-04 |
| 17 | **Stable rejoin token issued at seat-claim, used to reconnect across socket reconnects** | The original reconnection logic looked up the player by `socketId` — which changes on every reconnect — so it could never find the disconnected player. New `room:reconnect` event takes `{ code, rejoinToken }`, looks up by token, updates the socketId in-place, clears the 60s grace timer, re-emits the private hand. | 2026-05-04 |
| 18 | **Player-count Zod schema discriminated by gameType** | Original `min(6).max(8)` accepted invalid 7-player games. Refined to require exactly 6 for 250 and exactly 8 for 500. | 2026-05-04 |
| 19 | **Code-reviewer audit is mandatory and BLOCKS commit** | The first close of this project skipped the code-reviewer subagent and shipped 11 critical bugs (scoring math wrong, clockwise-default disabled, reconnection broken, CORS open, tap targets <44px, missing tests). Process now requires an independent subagent audit before every commit; tech-lead may not commit without it. | 2026-05-04 |
| 20 | **firstBidderId rotates per hand on the server, not just the FE** | Original bug: server.beginHand always reset firstBidderId to seatOrder[0]; the FE rotated it independently for display only. The auction order would always start with seat 1 in online play regardless of hand number. Fix: beginHand now sets firstBidderId = seatOrder[handsPlayed % seatOrder.length] so the auction rotates clockwise from the dealer position. | 2026-05-04 |
| 21 | **Production refuses to start with CORS_ORIGIN='*'** | Original bug: config.CORS_ORIGIN.default('*') silently allowed wide-open CORS in production deployments. Fix: loadConfig now throws when NODE_ENV='production' AND CORS_ORIGIN='*'. Operator must set explicit origin (or comma-separated allowlist; whitespace trimmed). | 2026-05-04 |
| 22 | **Reconnection requires both server-side AND client-side participation** | First close: server had room:reconnect handler + rejoinToken issuance, but the WEB CLIENT never captured the token from room:created/seat-claimed payloads, never persisted it, never emitted room:reconnect. Reconnection was end-to-end broken despite server appearing correct. Fix: online-room-store persists rejoinToken+code via Zustand persist (localStorage); OnlineHomePage + OnlineLobbyPage capture from server payloads; OnlineGamePage emits room:reconnect on socket-status transition (disconnected/error→connected) gated via useRef. | 2026-05-04 |
| 23 | **Multi-round audit until all subagents PASS** | Single audit pass is insufficient — the round-2 audit found 4 NEW critical issues introduced by fixes for round-1's 11 issues. Process clarified: re-spawn all three subagents (code-reviewer, qa-engineer, docs-updater) after EVERY round of fixes. Continue until all three return PASS with no new criticals. The first deploy-ready state required THREE rounds of audit. | 2026-05-04 |

---

## Game-Specific Reference

### 250 (6 players)
- 48 cards (standard deck minus 2s), 8 cards each.
- Card values: A/K/Q/J/10 = 10, 5s = 5, 3♠ = 30, others = 0. Total = 250.
- Bid floor 160–170, increments of 5, max 250.
- Bidder declares trump openly + calls 2 specific cards (partners).
- Scoring: bidder ±bid ±100; partners ±bid; opponents always 0.

### 500 (8 players)
- 96 cards (two decks minus 2s), 12 cards each.
- Card values: A/K/Q/J/10 = 10 (×2 = 400), 5s = 5 (40), first 3♠ played = 30, first 3♥ played = 30. Total = 500.
- Bid floor 300, increments of 5, max 500.
- Bidder declares trump openly + calls 3 specific cards.
- Voluntary reveal in Online mode; in Scorekeeper mode, the bidder records what they called and the players announce reveals at hand-end.
- Scoring: bidder ±bid ±200; partners ±bid; opponents always 0.

**Full rules:** see `RULES.md` at project root.

---

## Performance Requirements

### Phase 1
- **Initial load:** <2s on 4G after install (PWA cache).
- **Time-to-interactive:** <1s on mid-range Android.
- **Bundle:** <150KB gzipped (mobile-budget).
- **Lighthouse PWA score:** ≥ 95.
- **Lighthouse Accessibility:** ≥ 95.

### Phase 2 (additional)
- **Latency:** <100ms round-trip for game events.
- **Concurrency:** 50 concurrent rooms.
- **Reconnection:** 60s grace window.

---

## Security Requirements

### Phase 1
- localStorage data validated with Zod on hydration. Corrupted data → reset to defaults with warning.
- No PII stored. Player names only, no emails.

### Phase 2 (additional)
- Hand privacy: server emits hands only to the owning socket.
- Server-authoritative validation of every action.
- Rate limiting per socket.
- No secrets in code; env vars validated at startup.
