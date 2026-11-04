import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { site } from '@void/shared/config';
import { formatMoney } from '@void/shared/commerce';
import { Badge,Notice } from '@void/ui/components';
import { getCatalog } from '@/lib/data';
import { ProductImage,AddToCart } from '@/components/products';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await getCatalog();const product=products.find(item=>item.slug===slug);return {title:product?.name??'Product not found',description:product?.description,alternates:{canonical:`${site.urls.store}/products/${slug}`}};}
export default async function Product({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await getCatalog();const product=products.find(item=>item.slug===slug);if(!product)notFound();return <main id="main" className="container product-detail"><ProductImage product={product} priority/><div className="product-detail-copy"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Store</Link><ChevronRight size={12}/><Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link><ChevronRight size={12}/><span aria-current="page">{product.name}</span></nav><Badge gold={product.available}>{product.available?'Available':'Currently unavailable'}</Badge><h1>{product.name}</h1><strong className="product-price">{formatMoney(product.price,product.currency)}</strong><p>{product.description}</p><AddToCart product={product}/><Notice>Review your order in the cart. Any applicable tax is calculated during secure hosted checkout.</Notice><div className="button-row" style={{marginTop:22}}><Link href="/cart" className="text-link">View your cart <ChevronRight size={14}/></Link></div></div></main>;}
