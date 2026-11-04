import { PrismaClient } from '@prisma/client';
import { faqs, partners } from '@void/shared/content';

const db = new PrismaClient();
try {
  // Editorial draft seeds only: no users, passwords, modules, products, payments or orders.
  for (const [index,faq] of faqs.entries()) await db.fAQEntry.upsert({where:{id:faq.id},create:{...faq,published:false,sortOrder:index},update:{}});
  for (const partner of partners) await db.partner.upsert({where:{id:partner.id},create:{id:partner.id,name:partner.name,description:partner.description,logo:partner.logo,website:partner.website,discord:partner.discord,serverAddress:partner.serverAddress,published:false},update:{}});
  console.log('Draft FAQ and partner records prepared. No commercial or authentication demo data created.');
} finally { await db.$disconnect(); }
