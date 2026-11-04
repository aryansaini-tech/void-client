import { z } from 'zod';
import { site } from '@void/shared/config';
import { getDatabase } from '@void/backend/database';
import { assertOrigin,errorResponse,HttpError,rateLimit,readJson,requireSession } from '@void/backend/security';
export async function DELETE(request:Request){try{assertOrigin(request,site.urls.account);const session=await requireSession(request);await rateLimit('sessions',session.user.id,10,60);const {id}=await readJson(request,z.object({id:z.string().min(1).max(100)}).strict());if(id===session.session.id)throw new HttpError(400,'Use Sign out to close your current session.');const result=await getDatabase().session.deleteMany({where:{id,userId:session.user.id}});if(!result.count)throw new HttpError(404,'Session not found.');await getDatabase().auditEvent.create({data:{userId:session.user.id,action:'Signed out another device'}});return Response.json({revoked:true},{headers:{'Cache-Control':'no-store'}});}catch(error){return errorResponse(error);}}
