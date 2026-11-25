# Analytics

Local-only event log for playtest. It is **off by default**. Nothing is sent over the network, nothing is stored in a cookie, and the only identifier is a random UUID created in the browser.

## Turn it on

Any one of these is enough:

- Open a page with `?analytics=1`. That choice is saved as `localStorage.analytics_enabled = 1` and stays on after Home or any other navigation.
- Set `localStorage.analytics_enabled` to `1` yourself.
- Build with `VITE_ANALYTICS_DEFAULT_ON=true`. That is Mayuresh's deploy-time decision. The default build leaves it unset, so analytics stays off until someone opts in.

`?analytics=0` opts out. On the default build it clears the stored flag. On a build that defaults on, it stores `analytics_enabled = 0` so the opt-out survives the next page.

When it is off, `track()` returns immediately. No events are kept and no analytics keys are written. A build with the default flag records 0 events until opt-in. `export()` still reads a log that was stored on an earlier page, once the stored flag (or the build default) says analytics is on.

`?debug=1` adds an **Export analytics** button that downloads the JSON. The console also prints each event when `?debug=1` is set or the app is running in dev, but only if analytics is on.

## Read it back

After real taps, in the page console:

```js
window.__analytics.events()
window.__analytics.export()
window.__analytics.sessionId
window.__analytics.clear()
```

`export()` returns JSON `{ enabled, session_id, events }`. `clear()` drops the event ring. It does not delete the anonymous id or the visit count.

Storage keys, only while analytics is on:

| Key | What it is |
|---|---|
| `analytics_events` | Last 500 events |
| `analytics_anon_id` | Random UUID, not derived from the device or the player |
| `analytics_visit` | `{ count, last_ts }` for return visits |
| `analytics_first_hand` | `1` after the first finished hand |

## Fields on every event

| Field | Meaning |
|---|---|
| `name` | Event name |
| `ts` | `Date.now()` when it was recorded |
| `session_id` | Random UUID for this tab |
| `anon_player_id` | Random UUID kept in localStorage |
| `game` | `250`, `500`, or `null` before a table starts |
| `mode` | `local` at a bot table, otherwise `null` |
| `difficulty` | Bot strength (`easy` on this build), otherwise `null` |
| `build` | `VITE_BUILD_HASH`, or `dev` |
| `viewport` | `phone` under 720px wide, otherwise `desktop` |
| `props` | Event-specific values below |

## Events

`bid_placed` is the bid event. It is not also named `bid`.

| Event | When | Props |
|---|---|---|
| `session_start` | Analytics turns on for this tab | — |
| `return_visit` | `session_start` when a previous visit is stored | `days_since_last`, `visit_count` |
| `session_end` | `pagehide` only. Hiding the tab does not end the session | `session_length_ms` is visible time only, `hidden_count` |
| `tab_hidden` / `tab_visible` | The tab is hidden or shown | — |
| `pause` / `resume` | Same moments as hide and show | — |
| `game_start` | Deal the cards, or Play again | `replay` false on the first deal, true on Play again |
| `difficulty_selected` | A table starts (and when a difficulty control changes) | `value` |
| `hand_start` | A hand is dealt | — |
| `bid_placed` | A player bids or passes | `action` `bid` or `pass`, `amount` (null on a pass) |
| `auction_won` | The auction closes | `bidder` `human` or `bot`, `bid` |
| `cards_called` | Trump and the called cards are committed | `count` |
| `hand_complete` | The hand has a result | `made`, `bid`, `points`, `bidder_is_human` |
| `contract_failed` | That result did not make the bid | `bid`, `points` |
| `first_hand_finished` | The first finished hand for this anonymous id | — |
| `game_complete` | A player's running score reaches the target (1000, or `?target=` in dev) | `winner` `human`, `bot`, or `tie`, `human_score`, `hands_played` |
| `game_abandoned` | New game or Home before the target | `hands_played`, `human_score`, `reason` `new_game` or `home` |
| `new_game` | The player leaves the table | — |
| `settings_changed` | A preference setter runs | `key`, `value` |
| `ad_watched` | Stub. The UI never calls it. Free to play. | — |
| `purchase` | Stub. The UI never calls it. There is no store. | — |

## Verify with taps

1. Open `/play?analytics=1&debug=1`.
2. Deal 250, bid, declare, play the hand, then New game.
3. `window.__analytics.events().map((event) => event.name)` includes, in order: `session_start`, `game_start`, `hand_start`, `bid_placed`, `auction_won`, `cards_called`, `hand_complete`, `first_hand_finished`. Leaving with New game adds `game_abandoned` (`reason: 'new_game'`) and `new_game`, and does not add `game_complete`.
4. A finished match is first to 1000. In dev, `/play?analytics=1&target=1` ends when any score reaches 1, and that result emits `game_complete`. **Play again** deals the same game again, with no abandon confirm, and emits `game_start` with `replay: true`. It does not emit `new_game`.
5. Press **Export analytics**. It sits in its own row above the title, and the file matches `window.__analytics.export()`. Visible time example: 10s shown, 5s hidden, 7s shown, then the page closes, is `session_length_ms` 17000 and `hidden_count` 1.
