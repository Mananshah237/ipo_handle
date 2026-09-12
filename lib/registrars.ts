import type { IPO } from './types';
import { safeUrl } from './data';

// Upstream registrar names drift between snapshots ("KFin" vs "Kfin"), so all
// matching happens on a normalized id, never on the display name.
export type RegistrarId = 'kfintech' | 'mufg' | 'bigshare' | 'maashitla' | 'integrated' | 'unknown';
export const registrarIds: RegistrarId[] = ['kfintech', 'mufg', 'bigshare', 'maashitla', 'integrated', 'unknown'];

const patterns: [RegistrarId, RegExp][] = [
  ['kfintech', /kfin/i],
  ['mufg', /mufg|link\s*intime|intime/i],
  ['bigshare', /bigshare/i],
  ['maashitla', /maashitla/i],
  ['integrated', /integrated/i],
];

export function registrarId(name?: string): RegistrarId {
  const match = patterns.find(([, pattern]) => pattern.test(name ?? ''));
  return match ? match[0] : 'unknown';
}

// Registrars the /api/allotment function can query automatically. Everything
// else keeps the deep link + Copy PAN fallback. Bigshare joins after its
// captcha relay ships; MUFG and KFin activate with Ticket 10 captures.
export const autoCheckable = new Set<RegistrarId>(['mufg', 'kfintech']);

export const registrarLink = (ipo: IPO) => safeUrl(ipo.registrar?.url);
