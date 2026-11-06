import Link from 'next/link';
import { ArrowUpRight, LockKeyhole, Package, UserRound } from 'lucide-react';
import { site } from '@void/shared/config';
import { Badge, ButtonLink, SectionHeading } from '@void/ui/components';
import { VoidMark } from '@void/ui/brand';
import { ProductGrid, ProductImage } from '@void/store/components/products';
import { storeUrl } from '@void/shared/config';
import { getCatalog } from '@void/store/lib/data';

export const metadata = {
  title: { absolute: 'The official store — Void Client' },
  alternates: { canonical: site.urls.store },
};

export default async function StoreHome() {
  const catalog = await getCatalog();
  const featured = catalog.products[0];
  return (
    <main id="main">
      <section className="store-hero">
        <div className="container store-hero-layout">
          <div className="store-hero-copy">
            <p className="eyebrow"><span />The official Void store</p>
            <h1>Carry a little<br />Void with you.</h1>
            <p>The official collection. A personal touch for your world, with every detail in its place.</p>
            <div className="button-row">
              <ButtonLink href="#collection" icon="chevron">Explore the collection</ButtonLink>
              <Badge gold>{catalog.products.length ? 'Official collection' : 'Coming soon'}</Badge>
            </div>
          </div>
          <div className="store-art">
            {featured ? <Link href={storeUrl(`/products/${featured.slug}`)} aria-label={`View ${featured.name}`}><ProductImage product={featured} priority /><span className="store-featured-name">{featured.name}<ArrowUpRight size={17} /></span></Link> : <div className="collection-signature"><VoidMark decorative /><strong>The Void collection</strong><span>First collection coming soon</span></div>}
          </div>
        </div>
      </section>
      <div className="container store-strip">
        <span><Package />Official products, when released</span>
        <span><LockKeyhole />Checkout hosted by Stripe</span>
        <span><UserRound />Connected to your Void account</span>
      </div>
      <section id="collection" className="container content-body store-collection">
        <SectionHeading title="Make it your own." description="Explore the collection, with pricing and availability on every product.">
          <a className="text-link" href={`${site.urls.account}/purchases`}>Your purchases <ArrowUpRight size={14} /></a>
        </SectionHeading>
        <ProductGrid {...catalog} />
      </section>
    </main>
  );
}
