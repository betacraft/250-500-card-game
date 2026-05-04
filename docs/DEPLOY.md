# Deploy runbook

## Phase 1 — Scorekeeper PWA (static SPA)

### Pre-deploy checklist

- [ ] All quality gates pass: `npm run typecheck && npm run lint && npm run test && npm run build`
- [ ] PWA icons generated: `node scripts/generate-icons.mjs` (commit the PNGs)
- [ ] `vercel.json` (or `netlify.toml`) present at project root
- [ ] `manifest.webmanifest` references real icon paths
- [ ] Service worker generated at build time (verify `dist/sw.js` exists)

### Vercel

1. `git push origin main`
2. Visit https://vercel.com/new and import the GitHub repo.
3. Vercel detects `vercel.json` automatically. No manual config needed.
4. Deploy. Visit the URL on your phone:
   - iOS Safari: tap Share → Add to Home Screen
   - Android Chrome: install banner appears, or menu → Install app
5. Verify offline: airplane mode, reload the installed app — should still work.

### Lighthouse audit

Run from Chrome DevTools or CLI:

```bash
npx lighthouse https://your-url.vercel.app --view
```

Target scores:
- PWA ≥ 95
- Accessibility ≥ 95
- Performance ≥ 90
- Best Practices ≥ 95

If any score drops below threshold, file an issue and fix before claiming E06 complete.

### Rollback

Vercel keeps every deployment. To roll back:

1. Visit the project's deployments page.
2. Find the last good deployment.
3. "Promote to Production".

## Phase 2 — Online multiplayer (Node + Socket.io)

### Pre-deploy checklist

- [ ] All Phase 1 quality gates still pass
- [ ] `packages/api/` has tests passing
- [ ] Integration tests verify hand privacy
- [ ] `railway.toml` configured

### Railway

1. `git push origin main`
2. New project at https://railway.app/new from your GitHub repo.
3. Railway auto-detects Node. Set:
   - Root directory: `packages/api`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. Environment variables:
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - `PORT` is set automatically by Railway
5. Deploy. Connect your domain (optional).

### Frontend pointing to backend

Update `packages/web/src/lib/socket-client.ts` config to point to the Railway URL in production.

### Real-device QA

Open the deployed URL on:
- 1× iPhone (Safari)
- 1× Android (Chrome)

Verify a full game flow works end-to-end with friends.
