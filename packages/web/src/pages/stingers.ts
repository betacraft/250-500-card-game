/** Lazy bid stingers. Ogg first, mp3 if the browser cannot play ogg. Silent when muted. */
export function playStinger(kind: 'made' | 'sunk', muted: boolean): void {
  if (muted || typeof Audio === 'undefined') return;
  void sources(kind).then((files) => {
    const audio = new Audio();
    const ogg = audio.canPlayType('audio/ogg') !== '';
    audio.src = ogg ? files.ogg : files.mp3;
    audio.play().catch(() => undefined);
  }).catch(() => undefined);
}

function sources(kind: 'made' | 'sunk'): Promise<{ ogg: string; mp3: string }> {
  if (kind === 'made') {
    return Promise.all([import('../assets/stingers/bid-made.ogg'), import('../assets/stingers/bid-made.mp3')]).then(([ogg, mp3]) => ({
      ogg: ogg.default,
      mp3: mp3.default,
    }));
  }
  return Promise.all([import('../assets/stingers/bid-sunk.ogg'), import('../assets/stingers/bid-sunk.mp3')]).then(([ogg, mp3]) => ({
    ogg: ogg.default,
    mp3: mp3.default,
  }));
}
