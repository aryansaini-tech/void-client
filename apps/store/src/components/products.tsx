'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowUpRight,ShoppingBag } from 'lucide-react';
import { site } from '@void/shared/config';
import { formatMoney,type PublicProduct } from '@void/shared/commerce';
import { VoidMark } from '@void/ui/brand';
import { Badge,ButtonLink,EmptyState } from '@void/ui/components';
import { FilterBar,SearchField } from '@void/ui/interactive';
import { useCart } from './cart-provider';
export function ProductImage({product,priority=false}:{product:PublicProduct;priority?:boolean}){return <div className="product-image">{product.images[0]?<Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 767px) 90vw, 40vw" priority={priority}/>:<><VoidMark/><span className="image-label">Product artwork pending</span></>}</div>;}
export function AddToCart({product}:{product:PublicProduct}){const cart=useCart();return <button className="button button-primary" disabled={!product.available||!cart.ready} onClick={()=>cart.add(product.id)}><ShoppingBag size={15}/>{product.available?'Add to cart':'Unavailable'}</button>;}
export function ProductGrid({products,status,initialSearch='',initialCategory='All'}:{products:PublicProduct[];status:'ready'|'unconfigured'|'unavailable';initialSearch?:string;initialCategory?:string}){
 const [search,setSearch]=useState(initialSearch),[category,setCategory]=useState(initialCategory),[availability,setAvailability]=useState('All availability');
 const categories=['All',...new Set(products.map(product=>product.category.name))];
 const filtered=products.filter(product=>(category==='All'||category===product.category.name)&&(availability==='All availability'||product.available)&&`${product.name} ${product.description} ${product.category.name}`.toLowerCase().includes(search.trim().toLowerCase()));
 return <><div className="library-toolbar"><SearchField label="Search products" placeholder="Find something for your world…" value={search} onChange={setSearch}/><FilterBar options={categories} value={category} onChange={setCategory} label="Product categories"/></div>{products.length>0&&<div className="library-toolbar"><p className="results-count" role="status">{filtered.length} {filtered.length===1?'product':'products'}</p><FilterBar options={['All availability','Available now']} value={availability} onChange={setAvailability} label="Product availability"/></div>}
 {filtered.length?<div className="product-grid">{filtered.map(product=><article className="product-card" key={product.id}><Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}><ProductImage product={product}/></Link><div className="product-body"><span className="product-category">{product.category.name}</span><Link href={`/products/${product.slug}`}><h2>{product.name}</h2></Link><p>{product.description.length>135?`${product.description.slice(0,135)}…`:product.description}</p><div className="product-bottom"><strong>{formatMoney(product.price,product.currency)}</strong><AddToCart product={product}/></div></div></article>)}</div>:products.length||search?<EmptyState title="Nothing matches just yet." description="Try another search or clear your filters."><button className="button button-secondary" onClick={()=>{setSearch('');setCategory('All');setAvailability('All availability');}}>Clear filters</button></EmptyState>:<><div className="store-empty-art" aria-hidden="true"><VoidMark/><Badge>Collection coming soon</Badge></div><EmptyState title={status==='unavailable'?'The collection is temporarily unavailable.':'Good things take shape.'} description={status==='unavailable'?'We couldn’t load the store right now. Please try again later.':'The first collection is still under wraps. Genuine products, clear pricing, and availability will appear here when they’re ready.'} icon={<ShoppingBag size={29} strokeWidth={1.2}/>}><ButtonLink href={`${site.urls.website}/discord`} variant="secondary">Follow the community</ButtonLink><Link href={`${site.urls.website}/about`} className="button button-ghost">Discover Void <ArrowUpRight size={15}/></Link></EmptyState></>}
 </>;
}
