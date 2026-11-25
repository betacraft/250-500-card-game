import type { RevealNotice } from './reveal-queue';

/**
 * One partner announcement over the trick.
 * The layer ignores taps, so a card underneath still receives the play.
 */
export function PartnerToast({ notice, reduced }: { notice: RevealNotice | null; reduced: boolean }): JSX.Element {
  const motion = reduced ? 'partner-toast-fade' : 'partner-toast-slide';
  return (
    <div
      aria-live="polite"
      data-testid="partner-toast"
      data-motion={reduced ? 'fade' : 'slide'}
      className="pointer-events-none absolute left-2 top-1 z-20"
    >
      {notice && (
        <p key={notice.playerId} className={`pointer-events-none rounded-full bg-[#1A1A1A]/90 px-3 py-1 text-sm font-medium text-white ${motion}`}>
          {notice.text}
        </p>
      )}
    </div>
  );
}
