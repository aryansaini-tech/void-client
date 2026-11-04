import { PageIntro } from '@void/ui/components';
import { site } from '@void/shared/config';
import { ProductGrid } from '@/components/products';
import { getCatalog } from '@/lib/data';
export const metadata={title:'Collection',alternates:{canonical:`${site.urls.store}/products`}};
export default async function Products(){const catalog=await getCatalog();return <main id="main"><PageIntro eyebrow="The Void collection" title="Find your next favorite." description="Explore official products as they become available. Search the collection and make it your own."/><section className="container content-body" aria-label="Product collection"><ProductGrid {...catalog}/></section></main>;}
