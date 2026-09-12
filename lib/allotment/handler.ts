import { validPan } from '../family';
import { registrarIds, type RegistrarId } from '../registrars';
import type { AdapterTable } from './adapters';
import type { CheckResponse } from './types';
import { allotmentStatuses } from './types';

// Stateless request handler, separated from the Vercel function so tests can
// drive it with an injected adapter table. Responses never echo the request,
// so a PAN cannot leak through an error message.
const invalid: CheckResponse = { status: 'error', message: 'Invalid request.' };
const unreachable: CheckResponse = { status: 'error', message: 'Could not reach the registrar. Use the registrar page instead.' };

function sanitize(result: CheckResponse): CheckResponse {
  if (!result || !allotmentStatuses.includes(result.status)) return unreachable;
  return {
    status: result.status,
    ...(result.status === 'allotted' && typeof result.shares === 'number' && Number.isInteger(result.shares) && result.shares >= 0 ? { shares: result.shares } : {}),
    ...(typeof result.message === 'string' && result.message ? { message: result.message.slice(0, 300) } : {}),
  };
}

export async function handleCheck(body: unknown, table: AdapterTable, timeoutMs = 12000): Promise<{ code: number; response: CheckResponse }> {
  if (!body || typeof body !== 'object') return { code: 400, response: invalid };
  const { slug, registrarId, pan } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug)) return { code: 400, response: invalid };
  if (typeof registrarId !== 'string' || !registrarIds.includes(registrarId as RegistrarId)) return { code: 400, response: invalid };
  if (typeof pan !== 'string' || !validPan(pan.trim().toUpperCase())) return { code: 400, response: { status: 'error', message: 'PAN must be 5 letters, 4 digits and a letter.' } };
  const adapter = table[registrarId as RegistrarId];
  if (!adapter) return { code: 200, response: { status: 'error', message: 'No automatic checker for this registrar yet. Use the registrar page.' } };
  try {
    const result = await Promise.race([
      adapter({ slug, pan: pan.trim().toUpperCase() }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return { code: 200, response: sanitize(result) };
  } catch { return { code: 200, response: unreachable }; }
}
