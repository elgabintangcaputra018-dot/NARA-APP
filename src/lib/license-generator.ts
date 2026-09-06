/**
 * License Code Generator for Nara App
 * Generates unique formatted codes: NARA-XXXX-XXXX-XXXX
 * Uses unambiguous characters: avoids 0, O, 1, I, L
 */

const SAFE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateChunk(length: number = 4): string {
  let chunk = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARSET.length);
    chunk += SAFE_CHARSET[randomIndex];
  }
  return chunk;
}

export function generateLicenseCode(): string {
  const c1 = generateChunk(4);
  const c2 = generateChunk(4);
  const c3 = generateChunk(4);
  return `NARA-${c1}-${c2}-${c3}`;
}

export function isValidLicenseFormat(code: string): boolean {
  if (!code) return false;
  const normalized = code.trim().toUpperCase();
  const regex = /^NARA-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
  return regex.test(normalized);
}
