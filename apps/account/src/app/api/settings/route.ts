import { site } from '@void/shared/config';
import { settingsSchema } from '@void/shared/schemas';
import { getDatabase } from '@void/backend/database';
import { assertOrigin,errorResponse,rateLimit,readJson,requireSession } from '@void/backend/security';
export async function PATCH(request:Request){try{assertOrigin(request,site.urls.account);const session=await requireSession(request);await rateLimit('settings',session.user.id,10,60);const data=await readJson(request,settingsSchema);await getDatabase().accountProfile.upsert({where:{userId:session.user.id},create:{userId:session.user.id,...data},update:data});return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});}catch(error){return errorResponse(error);}}
