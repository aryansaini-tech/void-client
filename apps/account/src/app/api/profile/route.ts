import { site } from '@void/shared/config';
import { profileSchema } from '@void/shared/schemas';
import { getDatabase } from '@void/backend/database';
import { assertOrigin,errorResponse,rateLimit,readJson,requireSession } from '@void/backend/security';
export async function PATCH(request:Request){try{assertOrigin(request,site.urls.account);const session=await requireSession(request);await rateLimit('profile',session.user.id,10,60);const data=await readJson(request,profileSchema);const db=getDatabase();await db.$transaction([db.user.update({where:{id:session.user.id},data:{name:data.name}}),db.accountProfile.upsert({where:{userId:session.user.id},create:{userId:session.user.id,bio:data.bio,minecraftName:data.minecraftName},update:{bio:data.bio,minecraftName:data.minecraftName}}),db.auditEvent.create({data:{userId:session.user.id,action:'Updated profile'}})]);return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});}catch(error){return errorResponse(error);}}
