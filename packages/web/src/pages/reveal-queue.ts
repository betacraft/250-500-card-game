/** One partner the table has just seen play a called card. */
export interface RevealNotice {
  playerId: string;
  text: string;
}

/** The toast on screen, then the ones waiting behind it. */
export interface RevealQueue {
  current: RevealNotice | null;
  pending: RevealNotice[];
  until: number;
}

/** How long one partner toast stays up before the next. */
export const REVEAL_TOAST_MS = 1500;

/** No toast and nothing waiting. */
export const EMPTY_REVEAL_QUEUE: RevealQueue = { current: null, pending: [], until: 0 };

/**
 * Partners who became public since the last look.
 * Anyone absent from `revealedIds` stays silent, including a partner the bidder called but nobody has played.
 */
export function revealNotices(
  previousIds: readonly string[],
  revealedIds: readonly string[],
  names: Readonly<Record<string, string>>,
  selfId: string,
): RevealNotice[] {
  const seen = new Set(previousIds);
  const notices: RevealNotice[] = [];
  for (const playerId of revealedIds) {
    if (playerId.length === 0 || seen.has(playerId)) continue;
    seen.add(playerId);
    const name = names[playerId] ?? playerId;
    notices.push({
      playerId,
      text: playerId === selfId ? "You're a partner!" : `${name} is a partner!`,
    });
  }
  return notices;
}

/**
 * Add notices behind the one already showing.
 * A second call with the same player does not stack a duplicate.
 */
export function pushReveals(queue: RevealQueue, notices: readonly RevealNotice[], now: number): RevealQueue {
  const known = new Set<string>([
    ...(queue.current ? [queue.current.playerId] : []),
    ...queue.pending.map((notice) => notice.playerId),
  ]);
  const fresh = notices.filter((notice) => !known.has(notice.playerId));
  if (fresh.length === 0) return queue;
  return startIfIdle({ ...queue, pending: [...queue.pending, ...fresh] }, now);
}

/** Move to the next notice once the current one has been up for {@link REVEAL_TOAST_MS}. */
export function tickReveal(queue: RevealQueue, now: number): RevealQueue {
  if (!queue.current) return startIfIdle(queue, now);
  if (now < queue.until) return queue;
  const [next, ...rest] = queue.pending;
  if (!next) return EMPTY_REVEAL_QUEUE;
  return { current: next, pending: rest, until: now + REVEAL_TOAST_MS };
}

function startIfIdle(queue: RevealQueue, now: number): RevealQueue {
  if (queue.current || queue.pending.length === 0) return queue;
  const [next, ...rest] = queue.pending;
  if (!next) return queue;
  return { current: next, pending: rest, until: now + REVEAL_TOAST_MS };
}
