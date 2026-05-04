# E01 — Mobile PWA Setup (monorepo from day one)

**Phase:** 1
**Status:** Complete
**Owner:** tech-lead
**Estimated sessions:** 1–2

## Overview

Scaffold a pnpm monorepo with `packages/{shared, web, api}`. Phase 1 only writes code in `packages/web` and a small amount in `packages/shared`. `packages/api` is initialized as an empty stub from day one so Phase 2 can fill it in without restructuring (Option B from the architecture decisions).

The web package is a React + Vite SPA configured as a PWA, mobile-first, with all tooling in place.

## Repo Structure (created by this epic)

```
250-500-card-game/
├── package.json                       # workspace root
├── pnpm-workspace.yaml                # packages/*
├── tsconfig.base.json                 # shared TS config
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── packages/
│   ├── shared/                        # types, schemas, scoring engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── placeholder.ts         # filled in E02+
│   │   ├── package.json               # @250-500/shared
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── web/                           # React PWA
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/HomePage.tsx
│   │   │   ├── pages/ScorekeeperSetupPage.tsx (placeholder)
│   │   │   ├── pages/ScorekeeperHandPage.tsx (placeholder)
│   │   │   ├── pages/ScorekeeperHistoryPage.tsx (placeholder)
│   │   │   ├── components/ui/         # shadcn/ui
│   │   │   ├── styles/globals.css
│   │   │   └── tests/e2e/smoke.spec.ts
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── icons/
│   │   ├── index.html
│   │   ├── vite.config.ts             # vite + PWA plugin
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── playwright.config.ts       # mobile viewport default
│   │   ├── vitest.config.ts
│   │   ├── package.json               # @250-500/web
│   │   └── tsconfig.json
│   └── api/                           # backend (empty stub)
│       ├── src/.gitkeep
│       ├── package.json               # @250-500/api (no scripts yet)
│       └── tsconfig.json
```

## Acceptance Criteria

- [ ] pnpm workspace configured; `pnpm install` from root works
- [ ] All three packages typecheck (even though api is empty)
- [ ] Web package: `pnpm --filter @250-500/web dev` starts Vite on port 5173
- [ ] Web package: `pnpm --filter @250-500/web build` succeeds and emits PWA assets (manifest + service worker)
- [ ] Web package: one Vitest unit test passes
- [ ] Web package: one Playwright E2E test passes (in mobile viewport, headless Chromium)
- [ ] Shared package: one Vitest test passes (placeholder Zod schema)
- [ ] HomePage renders: "250 & 500 Card Game" + "Score in-person game" button + "Play online (coming in Phase 2)" disabled button
- [ ] ESLint configured; `pnpm lint` passes with zero warnings
- [ ] Conventional commit: `chore(setup): scaffold monorepo (E01)`

## Done When

All quality gates pass:
```
pnpm install
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm --filter @250-500/web test:e2e
pnpm --filter @250-500/web build
```

CLAUDE.md updated; E01 marked Complete.
