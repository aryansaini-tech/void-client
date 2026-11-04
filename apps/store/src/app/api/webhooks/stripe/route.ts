import { processPaymentEvent,verifyPaymentEvent } from '@void/backend/commerce';
import { errorResponse,HttpError } from '@void/backend/security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{if(Number(request.headers.get('content-length')??0)>1048576)throw new HttpError(413,'Webhook is too large.');const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Missing webhook body.');const chunks:Uint8Array[]=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();throw new HttpError(413,'Webhook is too large.');}chunks.push(value);}const event=verifyPaymentEvent(Buffer.concat(chunks).toString('utf8'),request.headers.get('stripe-signature'));return Response.json(await processPaymentEvent(event));}catch(error){return errorResponse(error);}}
