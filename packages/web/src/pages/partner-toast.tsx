import type { RevealNotice } from './reveal-queue';
import { TOAST_BACKGROUND, TOAST_TEXT } from './toast-contrast';

/**
 * One partner announcement, centred on the trick.
 * The layer ignores taps, so a card underneath still receives the play.
 */
export function PartnerToast({ notice, reduced }: { notice: RevealNotice | null; reduced: boolean }): JSX.Element {
  const motion = reduced ? 'partner-toast-fade' : 'partner-toast-pop';
  return (
    <div
      aria-live="polite"
      data-testid="partner-toast"
      data-motion={reduced ? 'fade' : 'scale'}
      className="pointer-events-none absolute left-1/2 top-[18%] z-20 -translate-x-1/2"
    >
      {notice && (
        <p
          key={notice.playerId}
          data-testid="partner-toast-pill"
          className={`pointer-events-none rounded-full px-3 py-1 text-base shadow-md ${motion}`}
          style={{ backgroundColor: TOAST_BACKGROUND, color: TOAST_TEXT, fontSize: 16, fontWeight: 600 }}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
