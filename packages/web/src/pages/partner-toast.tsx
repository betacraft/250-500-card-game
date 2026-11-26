import type { RevealNotice } from './reveal-queue';
import { TOAST_BACKGROUND, TOAST_TEXT } from './toast-contrast';

interface PlayStatusProps {
  /** The turn or winner line. Hidden while a partner toast is up. */
  text: string;
  notice: RevealNotice | null;
  reduced: boolean;
  testId: 'play-status' | 'trick-status';
  className?: string;
}

/** The status row under the felt. The toast replaces its words and keeps the row's height. */
export function PlayStatus({ text, notice, reduced, testId, className = '' }: PlayStatusProps): JSX.Element {
  const motion = reduced ? 'partner-toast-fade' : 'partner-toast-pop';
  return (
    <p data-testid={testId} className={`relative h-5 shrink-0 overflow-hidden text-center text-sm leading-5 ${className}`}>
      <span className={notice ? 'text-transparent' : undefined}>{text}</span>
      <span data-testid="partner-toast" data-motion={reduced ? 'fade' : 'scale'} className={notice ? 'absolute inset-0 flex items-center justify-center' : 'hidden'}>
        {notice ? (
          <span key={notice.playerId} data-testid="partner-toast-pill" className={`whitespace-nowrap rounded-full px-3 font-semibold ${motion}`} style={{ backgroundColor: TOAST_BACKGROUND, color: TOAST_TEXT }}>
            {notice.text}
          </span>
        ) : null}
      </span>
    </p>
  );
}
