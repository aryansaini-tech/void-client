import { createCheckout } from '@void/backend/commerce';
import { errorResponse } from '@void/backend/security';
export const runtime='nodejs';
export async function POST(request:Request){try{return Response.json(await createCheckout(request),{headers:{'Cache-Control':'no-store'}});}catch(error){return errorResponse(error);}}
