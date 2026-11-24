/** Short build id. Set `VITE_BUILD_HASH` for a release build; local and tests stay `dev`. */
export const BUILD_HASH: string = import.meta.env.VITE_BUILD_HASH ?? 'dev';

/** Phone below the app's wide cutoff, otherwise desktop. */
export function viewportClass(width: number): string {
  return width < 720 ? 'phone' : 'desktop';
}
