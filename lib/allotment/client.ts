import type { CheckRequest, CheckResponse } from './types';
import { allotmentStatuses } from './types';

const failure: CheckResponse = { status: 'error', message: 'Couldn’t check automatically. Use the registrar page.' };

export async function requestCheck(input: CheckRequest): Promise<CheckResponse> {
  try {
    const response = await fetch('/api/allotment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json() as CheckResponse;
    if (!data || !allotmentStatuses.includes(data.status)) return failure;
    return {
      status: data.status,
      ...(typeof data.shares === 'number' ? { shares: data.shares } : {}),
      ...(typeof data.message === 'string' ? { message: data.message.slice(0, 300) } : {}),
    };
  } catch { return failure; }
}

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
