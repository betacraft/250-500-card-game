import type { RevealNotice } from './reveal-queue';
import { TOAST_BACKGROUND, TOAST_TEXT } from './toast-contrast';

/**
 * One partner announcement, in the felt header above the card faces.
 * The layer ignores taps, so a card underneath still receives the play.
 */
export function PartnerToast({ notice, reduced }: { notice: RevealNotice | null; reduced: boolean }): JSX.Element {
  const motion = reduced ? 'partner-toast-fade' : 'partner-toast-pop';
  return (
    <div
      aria-live="polite"
      data-testid="partner-toast"
      data-motion={reduced ? 'fade' : 'scale'}
      className="pointer-events-none absolute left-1/2 top-0.5 z-20 -translate-x-1/2"
    >
      {notice && (
        <p
          key={notice.playerId}
          data-testid="partner-toast-pill"
          className={`pointer-events-none whitespace-nowrap rounded-full px-3 py-0 text-sm shadow-md ${motion}`}
          style={{ backgroundColor: TOAST_BACKGROUND, color: TOAST_TEXT, fontSize: 16, fontWeight: 600 }}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
