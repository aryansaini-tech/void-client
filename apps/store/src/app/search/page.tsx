import { PageIntro } from '@void/ui/components';
import { ProductGrid } from '@/components/products';
import { getCatalog } from '@/lib/data';
export const metadata={title:'Search',robots:{index:false,follow:true}};
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){const [catalog,params]=await Promise.all([getCatalog(),searchParams]);return <main id="main"><PageIntro title="Something in mind?" description="Search the official collection by name, category, or description."/><section className="container content-body" aria-label="Product search"><ProductGrid {...catalog} initialSearch={(params.q??'').slice(0,120)}/></section></main>;}
