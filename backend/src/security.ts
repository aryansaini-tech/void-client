import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getDatabase } from './database';
import { getSession } from './auth';

export class HttpError extends Error { constructor(public status: number, message: string, public code = 'REQUEST_FAILED') { super(message); } }
export function assertOrigin(request: Request, expected: string) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(expected).origin) throw new HttpError(403,'This request could not be verified. Refresh the page and try again.','INVALID_ORIGIN');
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') throw new HttpError(403,'Cross-site requests are not accepted.','INVALID_ORIGIN');
}
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415,'Send JSON data.');
  if (Number(request.headers.get('content-length') ?? 0) > 16384) throw new HttpError(413,'Request is too large.');
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400,'Request body is required.');
  const chunks: Uint8Array[]=[]; let size=0;
  for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>16384){await reader.cancel();throw new HttpError(413,'Request is too large.');} chunks.push(value); }
  let parsed: unknown; try { parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400,'Invalid JSON.'); }
  const result=schema.safeParse(parsed); if(!result.success)throw new HttpError(400,result.error.issues[0]?.message ?? 'Invalid input.','VALIDATION_ERROR'); return result.data;
}
export async function requireSession(request: Request) {
  const session=await getSession(request.headers);
  if(!session)throw new HttpError(401,'Sign in to continue.','UNAUTHENTICATED');
  if(!session.user.emailVerified)throw new HttpError(403,'Verify your email to continue.','EMAIL_UNVERIFIED');
  return session;
}
/** Atomic shared PostgreSQL limiter, including concurrent requests across instances. */
export async function rateLimit(scope: string, identifier: string, max: number, windowSeconds: number) {
  const key=createHash('sha256').update(`${scope}:${identifier}`).digest('hex');
  const rows=await getDatabase().$queryRaw<{count:number;resetAt:Date}[]>`
    INSERT INTO "RateBucket" ("key", "count", "resetAt") VALUES (${key}, 1, NOW() + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateBucket"."resetAt" <= NOW() THEN 1 ELSE "RateBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateBucket"."resetAt" <= NOW() THEN NOW() + ${windowSeconds} * INTERVAL '1 second' ELSE "RateBucket"."resetAt" END
    RETURNING "count", "resetAt"`;
  if((rows[0]?.count ?? max+1)>max)throw new HttpError(429,'Too many attempts. Please try again shortly.','RATE_LIMITED');
}
export function errorResponse(error: unknown) {
  if(error instanceof HttpError)return Response.json({error:error.message,code:error.code},{status:error.status,headers:{'Cache-Control':'no-store',...(error.status===429?{'Retry-After':'60'}:{})}});
  console.error('Request failed.', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({error:'This service is temporarily unavailable. Please try again later.',code:'SERVICE_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
}
