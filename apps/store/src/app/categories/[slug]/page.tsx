import { notFound } from 'next/navigation';
import { PageIntro } from '@void/ui/components';
import { getCatalog } from '@/lib/data';
import { ProductGrid } from '@/components/products';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const catalog=await getCatalog();return {title:catalog.products.find(product=>product.category.slug===slug)?.category.name??'Category'};}
export default async function Category({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const catalog=await getCatalog();const products=catalog.products.filter(product=>product.category.slug===slug);if(!products.length)notFound();return <main id="main"><PageIntro title={products[0]!.category.name} description="Explore this part of the official Void collection."/><section className="container content-body"><ProductGrid products={products} status={catalog.status}/></section></main>;}
