# Backlog

## Normal bot backlog (after G1 gate)

Neha accepted Normal as-is at `8e1f3bc`. These notes are for later. They do not change the bot that passed QA.

1. About 13% of the contracts Normal wins fail by a wide margin. Example: 250, seed `1292157289`, hand 10, bid 185, collected 75.
2. It passes strong opening hands on about 5–7% of auction turns. Example: seed `256411032`, hand 32, projected 176 with P(make) 0.58.
3. In 500 it rarely calls a held ace as the third partner card (under 1% of hands).
