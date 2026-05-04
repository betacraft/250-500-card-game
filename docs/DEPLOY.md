# Deploy runbook

## Recommended path — single Railway service

Both the Online API (Socket.io) and the Scorekeeper PWA (static files) ship from one Railway deployment. One URL, one bill, one place to look at logs.

### Pre-deploy checklist

- [ ] All quality gates pass: `npm run typecheck && npm run lint && npm run test && npm run build`
- [ ] PWA icons generated: `node scripts/generate-icons.mjs` (commit the PNGs)
- [ ] `railway.toml` present at project root
- [ ] `manifest.webmanifest` references `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-512-maskable.png`
- [ ] Service worker generated at build time (verify `packages/web/dist/sw.js` after `npm run build`)

### Steps

1. `git push origin master` (already done — repo lives at github.com/betacraft/250-500-card-game).
2. Visit https://railway.app/new → "Deploy from GitHub repo" → pick `betacraft/250-500-card-game`.
3. Railway auto-detects Node and reads `railway.toml`. The `npm install && npm run build` step takes ~90s; api bundle takes <1s after that.
4. Environment variables — set in the Railway dashboard:
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - `PORT` is auto-injected by Railway, do not set manually.
5. After deploy succeeds, click the URL Railway provides. You'll see the home page with both mode buttons.
6. On your phone:
   - **iOS Safari:** Share → Add to Home Screen
   - **Android Chrome:** Install banner appears, or menu → Install app
7. Verify offline mode (Scorekeeper): airplane mode, reload — app still works.
8. Verify online mode: get 6 friends to open the URL, host creates a 250 game, others join with the room code.

### Production architecture

```
Railway (single Node service)
├── Express + Socket.io listening on $PORT
│   ├── HTTP routes:
│   │   ├── GET /health          → status JSON
│   │   ├── GET /static/*        → built React assets
│   │   └── GET /*               → SPA fallback to index.html
│   └── WebSockets:
│       ├── room:* events        → lobby management
│       └── game:* events        → online gameplay
└── In-memory state
    ├── Map<roomCode, Room>      → ~1B possible codes, no collision
    └── Map<roomCode, Game>      → per-room game engine state
```

The Express server reads the built frontend from `packages/web/dist` (set up automatically when `NODE_ENV=production`).

### Lighthouse audit

Run from Chrome DevTools Lighthouse panel or CLI:

```bash
npx lighthouse https://<your-railway-url> --view --form-factor=mobile
```

Target scores:
- PWA ≥ 95
- Accessibility ≥ 95
- Performance ≥ 90
- Best Practices ≥ 95

### Rollback

Railway keeps every deployment. Visit the project's deployments tab → find the last good one → "Redeploy."

---

## Alternative — Vercel (Phase 1 only)

Use this if you only want the in-person Scorekeeper and don't need online multiplayer. Vercel is a static host so the Online button won't connect.

1. `git push origin master`.
2. Visit https://vercel.com/new and import the GitHub repo.
3. Vercel reads `vercel.json` automatically — build command, output directory, SPA rewrites, cache headers.
4. Deploy. Visit the URL on your phone.

The Online button will appear but fail to connect (no backend). For full functionality, use Railway instead.

---

## Real-device QA checklist

After deploy, test from real devices (browser dev tools don't catch everything):

- [ ] iPhone Safari: home screen install works, offline reload works, all bidding/declaration/result flows tap-friendly
- [ ] Android Chrome: install banner works, all flows function
- [ ] 6 phones (250) play through one complete hand end-to-end
- [ ] 8 phones (500) play through one complete hand including the voluntary-reveal partner mechanic
- [ ] Disconnect mid-hand → reconnect within 60s → state restored
