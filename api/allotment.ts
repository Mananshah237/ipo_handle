import { adapters, mockAdapters } from '../lib/allotment/adapters';
import { handleCheck } from '../lib/allotment/handler';

// Stateless Vercel function (pinned to bom1 via vercel.json) beside the static
// export. The PAN passes through to the official registrar only; it is never
// logged, stored, or included in any response.
interface NodeRequest { method?: string; body?: unknown }
interface NodeResponse { setHeader(name: string, value: string): unknown; status(code: number): NodeResponse; json(payload: unknown): void }

export default async function handler(request: NodeRequest, response: NodeResponse) {
  response.setHeader('cache-control', 'no-store');
  if (request.method !== 'POST') { response.status(405).json({ status: 'error', message: 'POST only.' }); return; }
  const table = process.env.ALLOTMENT_MOCK === '1' ? mockAdapters : adapters;
  const { code, response: body } = await handleCheck(request.body, table);
  response.status(code).json(body);
}
