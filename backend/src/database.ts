import { PrismaClient } from '@prisma/client';
import { serviceState } from './env';
const singleton = globalThis as unknown as { voidPrisma?: PrismaClient };
export function getDatabase() {
  if (!serviceState().database) throw new Error('DATABASE_NOT_CONFIGURED');
  singleton.voidPrisma ??= new PrismaClient();
  return singleton.voidPrisma;
}
