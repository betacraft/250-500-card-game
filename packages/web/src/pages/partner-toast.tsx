import type { RevealNotice } from './reveal-queue';
import { TOAST_BACKGROUND, TOAST_TEXT } from './toast-contrast';

/**
 * One partner announcement, on the notes just above the felt.
 * The layer ignores taps, so a card underneath still receives the play.
 */
export function PartnerToast({ notice, reduced }: { notice: RevealNotice | null; reduced: boolean }): JSX.Element {
  const motion = reduced ? 'partner-toast-fade' : 'partner-toast-pop';
  return (
    <div aria-live="polite" className="pointer-events-none relative z-20 h-0">
      <div data-testid="partner-toast" data-motion={reduced ? 'fade' : 'scale'} className={notice ? 'pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center' : 'hidden'}>
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
    </div>
  );
}
