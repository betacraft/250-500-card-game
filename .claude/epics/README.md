# Epic Roadmap — 250 & 500 Mobile Card Game

## Build Order

```
PHASE 1 — Scorekeeper PWA (no backend)
─────────────────────────────────────────
E01: Mobile PWA Setup           ─┐
E02: Game State Persistence     ─┤  Foundation
E03: Bidding Flow                ─┤
E04: Trump + Partner Picker     ─┤  In-person scoring app
E05: Hand Result + Scoring      ─┤
E06: PWA Polish + Deploy         ─┘  ◄── Ship: Scorekeeper PWA on phone

PHASE 2 — Online Multiplayer (adds backend)
─────────────────────────────────────────
E07: Backend + Rooms             ─┐  Restructure to monorepo
E08: Online Game Engine          ─┤  Server-authoritative game
E09: Online Frontend             ─┤  Card slider, trick area, opponents
E10: Online Polish + Deploy      ─┘  ◄── Ship: full multiplayer on Railway
```

## Epic Index

| ID  | Title                          | Phase | Depends On | Sessions | Status      |
|-----|--------------------------------|-------|------------|----------|-------------|
| E01 | Mobile PWA Setup               | 1     | —          | 1–2      | Not Started |
| E02 | Game State Persistence         | 1     | E01        | 1        | Not Started |
| E03 | Bidding Flow                   | 1     | E02        | 1–2      | Not Started |
| E04 | Trump + Partner Picker         | 1     | E03        | 1        | Not Started |
| E05 | Hand Result + Scoring          | 1     | E04        | 2        | Not Started |
| E06 | PWA Polish + Deploy            | 1     | E05        | 1        | Not Started |
| E07 | Backend + Rooms                | 2     | E06        | 2–3      | Not Started |
| E08 | Online Game Engine             | 2     | E07        | 3–4      | Not Started |
| E09 | Online Frontend                | 2     | E08        | 3        | Not Started |
| E10 | Online Polish + Deploy         | 2     | E09        | 2        | Not Started |

**Phase 1 total: 7–9 sessions** (ship a useful PWA).
**Phase 2 total: 10–12 sessions** (add multiplayer).
**Full project: 17–21 sessions.**

## Why This Order

Phase 1 ships a usable product fast — friends can use the Scorekeeper PWA at any in-person game night within 1–2 weeks of agent work. It validates the scoring engine, bidding UI, partner picker, mobile UX patterns, and accessibility — all the pieces Phase 2 will reuse.

Phase 2 adds the multiplayer layer on top of validated UX. The bidding flow, trump picker, partner picker, scoring engine, and component library all carry over. Phase 2 contributes: backend (Node + Socket.io), card dealing, trick-taking enforcement, hand privacy, real-time sync, and the new mobile UI elements (card slider, trick area, opponents row).

## Architectural Migration in E07

E07 begins with a structural refactor: single React app → npm-workspaces monorepo with `packages/{shared, api, web}`. The current `src/` becomes `packages/web/src/`. Pure-logic modules (`src/lib/games/`, `src/lib/cards/`, scoring schemas) extract into `packages/shared/`. New `packages/api/` is a fresh Node + Express + Socket.io project.

This refactor is mechanical and tracked as the first part of E07.

## Per-Epic Workflow

Every epic follows the workflow defined in CLAUDE.md:
1. tech-lead reads epic + CLAUDE.md + RULES.md + MOBILE-DESIGN-LANGUAGE.md → plans
2. qa-engineer writes failing tests (TDD red)
3. frontend-dev (and backend-dev in Phase 2) implements
4. tech-lead integrates and runs typecheck/lint
5. qa-engineer runs full suite, audits coverage
6. code-reviewer audits — must return PASS
7. docs-updater updates CLAUDE.md
8. tech-lead commits with conventional message

No skips. TDD is the discipline.
