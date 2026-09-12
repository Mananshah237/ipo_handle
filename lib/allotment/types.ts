import type { RegistrarId } from '../registrars';

export type AllotmentStatus = 'allotted' | 'not_allotted' | 'pending' | 'error';
export const allotmentStatuses: AllotmentStatus[] = ['allotted', 'not_allotted', 'pending', 'error'];

export interface CheckRequest { slug: string; registrarId: RegistrarId; pan: string }
// The API returns only this shape: no PAN, no registrar payloads, nothing else.
export interface CheckResponse { status: AllotmentStatus; shares?: number; message?: string }
export interface StoredResult extends CheckResponse { checkedAt: string }
export interface AllotmentStore { version: 1; results: Record<string, Record<string, StoredResult>> }
