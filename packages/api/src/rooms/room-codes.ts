const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a 6-character base32 room code (avoids ambiguous chars 0/1/I/O). */
export function generateRoomCode(): string {
  let out = '';
  const bytes = new Uint8Array(6);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 6; i++) {
    const byte = bytes[i] ?? 0;
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

/** Generate a code that doesn't collide with the provided existing set. */
export function generateUniqueRoomCode(existing: ReadonlySet<string>): string {
  for (let attempts = 0; attempts < 50; attempts++) {
    const code = generateRoomCode();
    if (!existing.has(code)) return code;
  }
  throw new Error('Unable to generate unique room code after 50 attempts');
}
