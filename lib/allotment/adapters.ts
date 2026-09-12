import type { RegistrarId } from '../registrars';
import type { CheckResponse } from './types';

export interface AdapterInput { slug: string; pan: string }
export type Adapter = (input: AdapterInput) => Promise<CheckResponse>;
export type AdapterTable = Partial<Record<RegistrarId, Adapter>>;

// Real MUFG Intime and KFin adapters land with Ticket 10's sanitised DevTools
// captures (session cookie + token flow, then the PAN search). Until then the
// stub reports an error so the UI falls back to the registrar link + Copy PAN.
const unavailable: Adapter = async () => ({ status: 'error', message: 'Automatic checking for this registrar is coming soon.' });

export const adapters: AdapterTable = { mufg: unavailable, kfintech: unavailable };

// Deterministic stand-in keyed off the PAN's last digit so the whole flow can
// be exercised end to end (ALLOTMENT_MOCK=1) before real adapters exist.
export const mockAdapter: Adapter = async ({ pan }) => {
  const digit = Number(pan[8]);
  if (digit === 0) return { status: 'pending', message: 'Allotment not finalised yet.' };
  return digit % 2 ? { status: 'not_allotted' } : { status: 'allotted', shares: digit * 13 };
};

export const mockAdapters: AdapterTable = { kfintech: mockAdapter, mufg: mockAdapter, bigshare: mockAdapter, maashitla: mockAdapter, integrated: mockAdapter };
