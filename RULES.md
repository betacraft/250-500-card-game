# 250 & 500 — Card Game Rules

> A trick-taking, partner-calling, hidden-team bidding game for 6 or 8 players.
> Two related variants: **250** (6 players, single deck) and **500** (8 players, double deck).
> This document is the canonical rulebook used as the basis for the digital implementation.

---

## Table of Contents

1. [Family & Origin](#family--origin)
2. [Game 1: 250 (6 players)](#game-1-250-6-players)
3. [Game 2: 500 (8 players)](#game-2-500-8-players)
4. [Strategy Notes](#strategy-notes)
5. [Glossary](#glossary)

---

## Family & Origin

250 is a trick-taking bidding game in the Indian card game family (relatives include 28, 29, 56, 304, Court Piece, and Mendikot). Its defining feature is that the highest bidder calls partners by naming specific cards — and the partners' identities stay hidden, revealed only as the called cards are played.

500 is a custom 8-player invention built on top of 250. It introduces a second deck, three called partners instead of two, and a critical new mechanic: because every called card now has two copies in play, holders can *choose* whether to come out as partner or stay anonymous.

Both games are zero-sum from the bidding team's perspective — the opposing side never scores, only the bidding team can win or lose points.

---

## Game 1: 250 (6 players)

### Setup

- **Players:** 6, seated in a circle.
- **Deck:** Standard 52-card deck with the four 2s removed → **48 cards.**
- **Deal:** All 48 cards dealt out, **8 cards per player.**

### Card Point Values

| Card | Points | Count in Deck | Subtotal |
|---|---|---|---|
| Ace, King, Queen, Jack, Ten (each) | 10 | 5 ranks × 4 suits = 20 cards | 200 |
| 5 (each) | 5 | 4 cards | 20 |
| 3 of Spades | 30 | 1 card | 30 |
| All other cards (3♣, 3♦, 3♥, 4s, 6s, 7s, 8s, 9s) | 0 | 23 cards | 0 |
| **Total** | | **48 cards** | **250** |

### Bidding

- Bidding determines who will lead the hand and how many points their team commits to scoring.
- **Opening floor:** conventionally **160–170** (no hard rule, but groups bid competitively to keep the game interesting).
- **Increment:** **5 points.** (160, 165, 170, …)
- **Maximum bid:** **250** (the whole pot).
- Players take turns bidding higher or passing. Once a player passes, they're out of the auction. The last remaining bidder wins.

### Declaration

The winning bidder must immediately and openly:

1. **Declare the trump suit.**
2. **Call two specific cards** by name (e.g., "Ace of Hearts and King of Clubs"). Whoever holds those cards is secretly the bidder's partner.

### Partnerships

- **3 vs 3** is the default — bidder + 2 partners against the other 3 players.
- **2 vs 4** if both called cards happen to be in the same player's hand. Bidder + 1 partner against 4 opponents. (This makes the bidding side smaller but each player carries the partner's full payout.)
- The bidder *may* legally call a card from their own hand, but doing so shrinks their team and is generally a poor strategic move.
- **Partners are not announced.** They are revealed naturally during play: when a called card hits the table, everyone learns who that partner was.

### Play

- The **bidder leads the first trick.**
- Standard trick-taking rules apply:
  - Players must **follow suit** if they can.
  - If void in the led suit, a player may play any card (including trump).
  - Highest **trump** played wins the trick. If no trump is played, the highest card of the **led suit** wins.
  - Winner of each trick leads the next.
- The 3♠ has **no special play mechanic** — it is simply a 30-point card. It must follow normal suit-following rules like any other spade.

### Scoring

Only the bidding team scores or loses. The opposing team always scores 0, regardless of how many points they collected.

| Outcome | Bidder's score | Each Partner's score |
|---|---|---|
| **Made the bid** (collected ≥ bid) | +bid +100 | +bid |
| **Failed the bid** (collected < bid) | −bid −100 | −bid |

**Examples:**
- Bid 200, made it → bidder +300, each partner +200.
- Bid 200, failed it → bidder −300, each partner −200.
- Bid 170, made it → bidder +270, each partner +170.

The +100/−100 swing is the price the bidder pays for leading the hand. Partners share the team's fate but without the leadership premium/penalty.

### End Conditions

Each hand is its own settlement; the game can be played as a single hand or accumulated across many hands toward a target total (e.g., first to 1,000) — choose by group convention.

---

## Game 2: 500 (8 players)

### Overview of Differences from 250

| Aspect | 250 | 500 |
|---|---|---|
| Players | 6 | 8 |
| Deck | 1 deck (48 cards) | 2 decks (96 cards) |
| Cards per player | 8 | 12 |
| Total points | 250 | 500 |
| Premium card(s) | 3♠ = 30 | First 3♠ played = 30; first 3♥ played = 30 |
| Number of called partners | 2 | 3 |
| Opening bid floor | 160–170 | 300 |
| Bidder bonus | ±100 | ±200 |
| Partnership reveal | Forced (when called card is played) | **Optional** — partners may choose to stay hidden by holding the card |
| Default partner rule | N/A | Closest-clockwise holder if hand ends mathematically before reveal |

### Setup

- **Players:** 8, seated in a circle.
- **Deck:** Two standard decks combined, with all eight 2s removed → **96 cards.**
- **Deal:** All 96 cards dealt out, **12 cards per player.**

### Card Point Values

| Card | Points | Count in Two Decks | Subtotal |
|---|---|---|---|
| Ace, King, Queen, Jack, Ten (each) | 10 | 5 ranks × 4 suits × 2 decks = 40 cards | 400 |
| 5 (each) | 5 | 4 × 2 = 8 cards | 40 |
| **First** 3♠ played to a trick | 30 | 1 of 2 copies counts | 30 |
| **First** 3♥ played to a trick | 30 | 1 of 2 copies counts | 30 |
| Second copy of 3♠ and 3♥ (after first is played) | 0 | 2 cards | 0 |
| All other cards | 0 | 45 cards | 0 |
| **Total** | | **96 cards** | **500** |

> **Important:** When the first 3♠ is played to a trick, it is worth 30 points. The second copy of 3♠ played later in the hand is worth 0. Same rule for 3♥. This is what keeps the total at exactly 500.

### Bidding

- **Opening floor:** **300.**
- **Increment:** **5 points.**
- **Maximum bid:** **500.**
- Bids of 410–420 are seen occasionally; higher is rare but legal.

### Declaration

The winning bidder must:

1. **Declare the trump suit openly.**
2. **Call three specific cards** by name. Each called card identifies a potential partner.

### Partnerships — The Core Mechanic

Because two decks are in play, every called card has **two copies**. This creates the central strategic twist of 500: a holder of a called card may *choose* whether to come out as partner.

#### Partner slots

Each of the 3 called cards represents one **partner slot.** A slot is filled when a **non-bidder** player plays a copy of that called card to a trick for the first time. Once filled, the slot cannot be re-filled.

- If the first non-bidder to play a copy of the called card is **not already a partner**, they become a new partner and the team grows by one.
- If the first non-bidder to play a copy is **already a partner** (via a different called card they previously played), the slot is still consumed by them — but it is effectively **wasted**, because no new player joins the team.
- **The bidder is exempt.** If the bidder plays a copy of one of their called cards (first or otherwise), it does *not* consume the partner slot. The slot remains open and can still be filled by whichever non-bidder eventually plays a copy first.

#### How partnership reveal works

- **A potential partner cannot voluntarily lead the called card to declare themselves.** They can only play the called card (and thus reveal partnership) when forced to *follow suit* on someone else's lead.
- **Exception:** on the very last trick of the hand, a holder may have no choice but to play the card.
- The **first non-bidder** to play a copy of a called card locks in the partner slot. The **second copy** played later by anyone else (and any bidder play, regardless of timing) does not produce another partner.

#### Strategic consequence: holding back called cards (non-bidders)

If you are **not the bidder** and you hold **multiple called cards**, and you have already come out as partner via one of them, you should generally try to **avoid playing the others as long as possible.** The duplicate copies of those other called cards are held by other players — if one of them is forced to play their copy first, that player becomes a new partner and your team grows. If you're forced to play your second called card before the duplicate-holder plays theirs, you've burned the partner slot for no gain.

This creates the central human element of 500: timing, deception, and the willingness to absorb risk to grow your team.

#### Default partner (clockwise rule)

If the hand ends — either by playing all 12 tricks or because the bidding team's outcome is mathematically decided — and a called card has not yet been played by either non-bidder holder, the **closest-clockwise non-bidder holder of that card from the bidder** becomes partner by default. They absorb the team's loss (or share the team's win) for that called card.

The **bidder is skipped** in this rule, consistent with the bidder-exemption above. Only non-bidder holders are eligible to fill the partner slot, whether voluntarily during play or by the clockwise default at hand-end.

#### Partner slots can remain empty

During play, a partner slot can remain unfilled for many tricks — both non-bidder holders may deliberately hold back their copy of the called card, each hoping the other will play first and absorb the partner role. The hand simply continues with that slot empty until either someone plays the card or the hand ends.

If the hand ends and **no non-bidder holder** of the called card exists (e.g., the bidder happens to hold both copies of the called card themselves), the slot stays permanently empty. No partner is assigned for that slot. The bidder still collects cards normally, the bid is still measured against the team's collected points, but the team has one fewer scoring partner. This is an unusual edge case, but the rules permit it.

#### Resulting team sizes

The bidding team's final size depends on how the called cards are distributed:

- **4 vs 4** — three different people come out, one per called card. (Most common.)
- **3 vs 5** — one person holds and reveals two of the three called cards.
- **2 vs 6** — one person holds and reveals all three called cards.

### Play

- The **bidder leads the first trick.**
- Standard trick-taking rules:
  - Must follow suit if able.
  - If void, may play any card.
  - Highest trump wins; otherwise highest of led suit wins.
  - Trick winner leads the next.
- Neither 3♠ nor 3♥ has any special play rule. They are normal cards that just happen to carry 30 points (when first played).
- A potential partner may **not** lead a called card to self-reveal. They must wait until forced.

### Scoring

Only the bidding team scores or loses. Opponents always score 0.

| Outcome | Bidder's score | Each Partner's score |
|---|---|---|
| **Made the bid** (collected ≥ bid) | +bid +200 | +bid |
| **Failed the bid** (collected < bid) | −bid −200 | −bid |

**Examples:**
- Bid 350, made it → bidder +550, each partner +350.
- Bid 350, failed it → bidder −550, each partner −350.
- Bid 420, failed it → bidder −620, each partner −420.

A defaulted partner (one who never voluntarily came out and was assigned by the clockwise rule) is scored exactly the same as a voluntary partner. The "penalty" of being a defaulted partner is simply that they had no say in the matter.

### End Conditions

By group convention, a hand may either:
- Play out all 12 tricks (full count), or
- End the moment the outcome is mathematically decided (i.e., the bidding team has secured ≥ bid, or it has become impossible for them to reach the bid). The default-clockwise rule for unrevealed partners is most relevant in this mode.

Hands accumulate toward a total of the group's choosing.

---

## Strategy Notes

### Bidding

- **In 250**, opening around 160–170 is competitive but safe; 200+ is aggressive and usually only attempted with a very strong hand and a clear partner-call plan.
- **In 500**, the dynamic shifts significantly because partners can refuse to come out. Bidding aggressively is risky if your called cards are easy for opponents to "starve" (by not leading those suits).
- The bidder bonus (±100 in 250, ±200 in 500) means the bidder always has the largest swing. Bid only if you genuinely think you can make it.

### Partner-call selection (250)

- Call cards you don't have and which point to players who likely have strong hands of their own.
- Aces of off-trump suits are common picks — they give your partner a guaranteed trick-winner and signal which suit to lead.

### Partner-call selection (500)

- The voluntary-reveal mechanic means you should call cards whose holders will *want* to come out — typically because the hand looks winnable.
- If your bid is borderline, expect partners to stay hidden and force the clockwise default. Plan accordingly.
- **Avoid calling cards from your own hand.** Every called card you don't hold gives you a potential new partner. Calling cards you already hold (especially both copies) shrinks your team's maximum size and is almost always strategically worse — only justified if you're confident you can make the bid with a smaller team.

### Defensive play (opposing team)

- **In 250**, watch which suits the bidder leads and which cards they hold back. Use that information to deduce who their partners are.
- **In 500**, suit-leading is a weapon. Lead suits where you suspect the called cards lie — you can force a reveal early (good if you want to coordinate against the partner) or starve a suit (good if you want to push the partner into the clockwise-default trap).

### Hidden-partner play (potential partners in 500)

- Coming out early helps coordinate with the bidder but tells opponents who to target.
- Staying hidden preserves deception but risks the clockwise-default penalty if the hand ends without you having played the card.
- Watch the bidder's play — if they appear to be losing, you may want to *not* come out and let the default-clockwise rule fall on someone else.

### Holding multiple called cards (500 only)

- If you're a **non-bidder** dealt two or more called cards, you have a critical decision to manage across the hand. Once you come out via the first one, do not play the second one unless absolutely forced.
- Holding back the second called card gives the duplicate-holder (some other player) a chance to play their copy first and join the team as a new partner. This grows the team from 3 to 4, or 2 to 3 — meaningfully improving your odds.
- Playing your second called card before the duplicate-holder plays theirs **burns the partner slot.** No new partner is added; the slot is consumed by you, who is already on the team.
- **The bidder is the one player exempt from this trap** — playing a called card from their own hand never consumes the partner slot. The bidder can play their copies freely; the slot remains open for whichever non-bidder eventually plays first.

---

## Glossary

- **Bid** — the number of points a player commits to scoring with their team.
- **Bidder** — the player who won the auction; leads the first trick and absorbs the largest scoring swing.
- **Called card** — a specific card named by the bidder; whoever holds it is (or may become) a partner.
- **Clockwise default** — in 500, the rule that assigns partnership to the closest-clockwise holder of an unrevealed called card if the hand ends without it being played.
- **Come out** — when a partner reveals themselves by playing a called card to a trick.
- **Follow suit** — playing a card of the same suit that was led to a trick. Mandatory if able.
- **Partner** — a player on the bidding team, identified via a called card.
- **Trick** — one round of play in which each player plays one card; the highest-ranked card wins all the cards in that round.
- **Trump** — the suit declared by the bidder; trump cards beat all non-trump cards.
- **Void** — having no cards of a particular suit; allows the player to play any other card (including trump) when that suit is led.

---

*This document is the source of truth for game rules. If implementation details in the webapp diverge from this document, this document wins until updated.*
