import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { getDatabase } from './database';
import { serverEnv, serviceState } from './env';

type Email = { to: string; subject: string; text: string };
function encryptionKey() { const secret = serverEnv().BETTER_AUTH_SECRET; if (!secret) throw new Error('Email encryption key unavailable.'); return createHash('sha256').update(`void-email-outbox:${secret}`).digest(); }
export function encryptEmail(value: Email) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),encrypted].map(item => item.toString('base64url')).join('.');
}
export function decryptEmail(value: string): Email {
  const [iv,tag,payload] = value.split('.'); if (!iv || !tag || !payload) throw new Error('Invalid mail payload.');
  const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv,'base64url')); cipher.setAuthTag(Buffer.from(tag,'base64url'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(payload,'base64url')),cipher.final()]).toString('utf8')) as Email;
}
/** Persist before returning from auth. Delivery is independent of request lifetime. */
export async function queueEmail(email: Email) {
  if (!serviceState().email) throw new Error('EMAIL_NOT_CONFIGURED');
  await getDatabase().emailOutbox.create({ data: { payload: encryptEmail(email) } });
}
export async function deliverNextEmail(jobId?: string) {
  if (!serviceState().email) return false;
  const db = getDatabase(); const env = serverEnv(); const now = new Date();
  await db.emailOutbox.updateMany({ where: { status:'PROCESSING',lockedAt:{lt:new Date(Date.now()-10*60*1000)},attempts:{gte:5} },data:{status:'FAILED',lockedAt:null} });
  await db.emailOutbox.updateMany({ where: { status:'PROCESSING',lockedAt:{lt:new Date(Date.now()-10*60*1000)},attempts:{lt:5} },data:{status:'PENDING',lockedAt:null} });
  const job = await db.emailOutbox.findFirst({ where:{status:'PENDING',availableAt:{lte:now},attempts:{lt:5},...(jobId?{id:jobId}:{})},orderBy:{createdAt:'asc'} });
  if (!job) return false;
  const claimed = await db.emailOutbox.updateMany({where:{id:job.id,status:'PENDING'},data:{status:'PROCESSING',lockedAt:now,attempts:{increment:1}}});
  if (!claimed.count) return false;
  const transport = nodemailer.createTransport({host:env.SMTP_HOST,port:env.SMTP_PORT,secure:env.SMTP_SECURE === 'true',requireTLS:!['localhost','127.0.0.1'].includes(env.SMTP_HOST ?? ''),auth:env.SMTP_USER ? {user:env.SMTP_USER,pass:env.SMTP_PASSWORD} : undefined,connectionTimeout:10000,socketTimeout:15000});
  try {
    await transport.sendMail({from:env.EMAIL_FROM,...decryptEmail(job.payload),messageId:`<${job.id}@${new URL(env.BETTER_AUTH_URL ?? 'http://localhost:3001').hostname}>`});
    await db.emailOutbox.update({where:{id:job.id},data:{status:'SENT',sentAt:new Date(),payload:'',lockedAt:null}});
  } catch {
    await db.emailOutbox.update({where:{id:job.id},data:{status:job.attempts+1>=5?'FAILED':'PENDING',lockedAt:null,availableAt:new Date(Date.now()+Math.min(3600,30*2**job.attempts)*1000)}});
    console.error('Email delivery failed; retry status persisted. No recipient or token logged.');
  } finally { transport.close(); }
  return true;
}
