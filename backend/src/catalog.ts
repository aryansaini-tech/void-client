import type { PublicProduct } from '@void/shared/commerce';
import { getDatabase } from './database';
import { serviceState } from './env';
import { localMediaPath } from '@void/shared/urls';

export async function getCatalog(): Promise<{products:PublicProduct[];status:'ready'|'unconfigured'|'unavailable'}> {
  if(!serviceState().database)return {products:[],status:'unconfigured'};
  try {
    const products=await getDatabase().product.findMany({where:{published:true},include:{category:true},orderBy:[{featured:'desc'},{createdAt:'desc'}],take:200});
    return {status:'ready',products:products.map(product=>({id:product.id,slug:product.slug,name:product.name,description:product.description,price:product.price,currency:product.currency,images:product.images.filter(localMediaPath),available:product.available,category:{id:product.category.id,slug:product.category.slug,name:product.category.name}}))};
  } catch { return {products:[],status:'unavailable'}; }
}
export async function getProduct(slug: string) {
  const result=await getCatalog(); return {...result,product:result.products.find(product=>product.slug===slug)??null};
}
