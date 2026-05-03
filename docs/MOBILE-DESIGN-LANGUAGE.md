# Mobile Design Language — 250 & 500 Card Game

> **Read this before building or reviewing any UI.** This is the visual contract for the entire app. Every component honors it. Deviations require a Decisions Log entry.

This project is **mobile-only**. There is no desktop layout, no tablet layout, no responsive scale-up. iPhone SE (375×667) is the smallest supported screen. iPhone 14 Pro / Pixel 7 (~390–393×844) is the canonical target.

---

## Brand Palette

```
Primary green (table felt, primary CTA)     #1A6E4A
Primary green dark (CTA hover/pressed)      #155539
Brand gold (bidder, selected states)        #F5C41E
Brand gold dark (text on gold backgrounds)  #4A3000
Brand gold border                           #8A6700
Surface warm (page background)              #F5F1E8
Surface white (cards, inputs)               #FFFFFF
Suit red (hearts, diamonds)                 #B53132
Suit black (spades, clubs)                  #222222
Text primary                                #1A1A1A
Text secondary                              #5F5E5A
Text tertiary                               #8B8A85
Border light                                #E5E1D7
Success accent                              #1A6E4A
Warning accent                              #BA7517
Error accent                                #A32D2D
```

In `tailwind.config.ts`, extend the theme:

```ts
extend: {
  colors: {
    felt: { DEFAULT: '#1A6E4A', dark: '#155539' },
    gold: { DEFAULT: '#F5C41E', dark: '#4A3000', border: '#8A6700' },
    surface: { warm: '#F5F1E8', white: '#FFFFFF' },
    suit: { red: '#B53132', black: '#222222' },
  },
}
```

**Never use off-palette colors** in production code. If a need arises, propose a palette extension via a Decisions Log entry.

---

## Typography

- **Font stack:** system font stack (`font-sans` from Tailwind defaults). No webfonts — they hurt PWA load time.
- **Sizes:**
  - Display (page titles): 22px / weight 500
  - Section headings: 16px / weight 500
  - Body: 14px / weight 400
  - Compact body / labels: 12px / weight 400
  - Tiny / hints: 10–11px / weight 400
- **Weights:** 400 (regular) and 500 (medium) only. No 600/700 — too heavy on mobile.
- **Line height:** 1.5 for body, 1.2 for headings.
- **Tabular numerals** for card ranks and scores: `font-variant-numeric: tabular-nums`.

---

## Spacing Scale

Use Tailwind's default scale. Never `w-[123px]` arbitrary values.

- **Micro:** `gap-1` / `p-1` (4px) — between adjacent icons
- **Tight:** `gap-2` / `p-2` (8px) — adjacent cards in a slider
- **Default:** `gap-3` / `p-3` (12px) — card padding interiors
- **Comfortable:** `gap-4` / `p-4` (16px) — section padding
- **Roomy:** `gap-6` / `p-6` (24px) — page margins on top/bottom

---

## Tap Targets

- **Minimum 44×44px** for any interactive element.
- **Minimum 8px spacing** between adjacent tap targets.
- **Card tap targets minimum 60×84px** (large enough to play accurately on a moving train).
- **Action buttons** are 48–56px tall, full-width minus 12px side margins.

---

## Card Visual

A playing card in the app:

- **Shape:** rounded rectangle, `border-radius: 8px`, `border: 0.5px solid #888`.
- **Background:** white (`bg-surface-white`).
- **Layout:** rank number/letter at top, suit icon below, both centered.
- **Hand-card size:** 60–72px wide × 84–100px tall.
- **Trick-area card size:** 44–50px wide × 60–70px tall (smaller, since multiple are shown).
- **Suit color:** red (`#B53132`) for hearts/diamonds, black (`#222222`) for spades/clubs.
- **Rank typography:** 16px bold (medium), tabular numerals for 10s.
- **Suit icons:** SVG paths — never Unicode characters (which render inconsistently as emoji on some platforms).

### Card Back (face-down)

Solid `#155539` (dark green) background with a subtle pattern (small dots or chevrons) in `#0E3D29`. Same dimensions as face-up cards.

### Card States

- **Default:** as above.
- **Selected (in slider):** `transform: translateY(-10px)` + `box-shadow: 0 0 0 2px #F5C41E` (gold ring). No scale change.
- **Disabled (illegal play):** `opacity: 0.4` + `cursor: not-allowed` + tooltip via `aria-describedby` explaining why.
- **Played (in trick area):** as default; positioned offset toward the player who played.

---

## Card Slider (Hand Display)

The defining mobile pattern. Every player's hand is displayed as a horizontal carousel.

```
┌────────────────────────────────────────┐
│  [A♠] [J♠] [Q♥] [7♥] [9♣] ...    ›    │
└────────────────────────────────────────┘
```

- Container: `display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory;`
- Each card: `scroll-snap-align: start; flex-shrink: 0;`
- Padding-right of last card to allow snapping: ensure the last card can snap to start position.
- Subtle "swipe ›" hint in the top-right corner of the slider container.
- Selected card lifts up (`translateY(-10px)`) and shows the gold ring.
- Tap a non-selected card → it becomes selected, replacing the previously-selected card.
- Action button below shows the action with the selected card: "Play Q ♥".
- "Always confirm" setting (default: ON for new players, OFF after 5 hands played):
  - ON: tap selects, then tap action button to play.
  - OFF: tap card plays directly.

---

## Action Button Pattern

Primary action ALWAYS lives at the bottom of the screen, within thumb reach.

- Position: `padding: 12px; padding-bottom: calc(12px + env(safe-area-inset-bottom));`
- Color: `bg-felt` (primary green) for primary CTA, white outlined for secondary.
- Size: full-width minus 24px (12px side margins), 48–56px tall.
- Text: 14–15px medium weight, white on green.
- Pressed state: `active:scale-95` + `bg-felt-dark`.
- Disabled state: `bg-gray-300 text-gray-500 cursor-not-allowed`.

Single primary action per screen. Secondary actions stack inline above the primary.

---

## Bottom Sheet Pattern

Modals appear as bottom sheets, not center-screen dialogs.

- Container: full-width, slides up from bottom.
- Max height: 80vh; internal scrolling if content overflows.
- Top edge: rounded `border-radius: 16px 16px 0 0`.
- Drag handle bar: small `w-10 h-1 bg-gray-300 rounded-full` centered at top.
- Backdrop: `bg-black/50`; tap dismisses.
- Padding: `p-4`, with `pb-safe` for the safe area.
- Use shadcn/ui's Sheet primitive (set to `side="bottom"`).

---

## Iconography

- **Library:** lucide-react.
- **Default size:** 16px for inline; 20–24px for buttons; 32px for empty states.
- **Stroke:** default (`strokeWidth={2}`).
- **Color:** `text-secondary` for decorative; semantic colors for status.
- **Common icons:**
  - `Crown` — bidder indicator, gold color
  - `Eye` / `EyeOff` — partner reveal toggle
  - `Wifi` / `WifiOff` — connection status
  - `Copy` — copy room code
  - `ChevronLeft` / `ChevronRight` — navigation
  - `Plus` / `Minus` — bid amount adjustment
  - `Check` — confirm
  - `X` — cancel / close

For suit symbols, use **inline SVG paths**, NOT Unicode characters or emoji — defined once in `src/lib/cards/suit-icons.tsx` and exported as `<SuitIcon suit="spade" size={16} />`.

---

## Animation Language

- **Duration:** 150–250ms for most transitions; 400–600ms for celebrations (partner reveal).
- **Easing:** `ease-out` for entries, `ease-in` for exits, `ease-in-out` for state changes.
- **Properties:** `transform` and `opacity` only. NEVER animate `width`, `height`, `top`, `left` (causes reflow).
- **Card slide-to-trick:** `transform: translate(-x, -y)` from hand position to trick area.
- **Trick clear:** all 6 cards in trick translate to winner's seat.
- **Partner reveal:** revealed player's avatar gets a 600ms gold pulse: `box-shadow` from 0 to gold, then back.
- **Selected card lift:** `transition: transform 150ms ease-out`.
- **Toast:** slide up from below, fade in 200ms; slide down + fade out 200ms after 3s timeout.
- **Respect `prefers-reduced-motion`:** all animations either skip entirely or use `transition: none` when set.

---

## Page Layout Templates

### Phase 1 — Scorekeeper Page

```
┌──────────────────────────────────┐
│  [PageHeader: Hand 4]           │
├──────────────────────────────────┤
│                                  │
│  [BidSummaryCard]               │
│                                  │
│  [HandResultEntry]              │
│   • Made / Failed buttons        │
│   • Partner pills                │
│                                  │
│  [ScorePreviewCard]             │
│                                  │
│  ╱                               │
│                                  │
├──────────────────────────────────┤
│  [Apply scores · next hand]     │ ← bottom action
└──────────────────────────────────┘
```

### Phase 2 — Online Game Page

```
┌──────────────────────────────────┐
│  [TopStateStrip]                │ ← 56px
├──────────────────────────────────┤
│  [OpponentsRow]                 │ ← 80px
├──────────────────────────────────┤
│                                  │
│       [TrickArea]               │ ← 150px
│        (cards in center)         │
│                                  │
├──────────────────────────────────┤
│  [HandSlider]  ← scroll →        │ ← 120px
├──────────────────────────────────┤
│  [Action: Play Q ♥]             │ ← 64px + safe area
└──────────────────────────────────┘
```

---

## Accessibility

- **Color contrast** ≥ 4.5:1 for text. Verified for every fill+text combination in the palette (gold-on-dark-gold passes; green-on-white passes).
- **Focus indicators:** `focus-visible:ring-2 focus-visible:ring-gold` on all interactive elements.
- **Live regions** for game state changes:
  ```html
  <div role="status" aria-live="polite" className="sr-only">
    Mayuresh played Queen of Hearts. Trick led by Priya.
  </div>
  ```
- **Semantic HTML:** `<button>`, `<nav>`, `<main>`, `<section>`. No `<div onClick>`.
- **ARIA labels** on icon-only buttons: `<button aria-label="Copy room code">`.
- **Keyboard navigation:** every action reachable via Tab. Enter/Space activate buttons. Card slider keyboard-navigable via Arrow keys.
- **Reduced motion:** all animations gated on `@media (prefers-reduced-motion: no-preference)` or use Framer/CSS to disable transforms.
- **Screen reader test** with VoiceOver (iOS) and TalkBack (Android) before any UI epic completes.

---

## Loading & Error States

- **Loading skeleton** for initial page load: gray rectangles with subtle pulse animation matching final layout.
- **Empty state:** centered icon + headline + body + CTA button.
  - "No hands played yet. Tap Bid to start the first hand."
- **Error toast:** slides up from bottom, red icon + message, auto-dismisses 3s, manual dismiss with X.
- **Fatal error (caught by ErrorBoundary):** full-screen friendly UI with "Reload" button and "Report bug" link (no-op for MVP).
- **No raw error objects shown to users.** All error UI uses pre-mapped friendly strings.

---

## Settings (User Preferences)

Stored in `settings-store` (Zustand + localStorage):

- **Always confirm card play** (boolean, default ON for first 5 hands then OFF prompt)
- **Sound effects** (boolean, default OFF)
- **Haptic feedback** (boolean, default ON where supported)
- **Reduced motion override** (auto / always reduce / never reduce)

Accessible via a gear icon in the page header on Home and Game pages.

---

## What This Doc Does NOT Cover

- Implementation specifics (those live in `frontend-dev.md`).
- Game rules (those live in `RULES.md`).
- Project conventions (those live in `CLAUDE.md`).

If you need to know HOW to build a button (lint config, file location, test pattern), see CLAUDE.md and frontend-dev.md.
If you need to know WHAT a button looks like and behaves like, this is the doc.

---

**Living document.** When new patterns are introduced (e.g., a chat overlay in Phase 2 polish), they get added here. docs-updater maintains this file alongside CLAUDE.md.
