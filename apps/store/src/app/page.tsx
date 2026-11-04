import { ArrowUpRight, LockKeyhole, Package, UserRound } from 'lucide-react';
import { site } from '@void/shared/config';
import { Badge, ButtonLink, SectionHeading } from '@void/ui/components';
import { VoidScene } from '@void/ui/scene';
import { ProductGrid } from '@void/store/components/products';
import { getCatalog } from '@void/store/lib/data';

export const metadata = {
  title: { absolute: 'The official store — Void Client' },
  alternates: { canonical: site.urls.store },
};

export default async function StoreHome() {
  const catalog = await getCatalog();
  return (
    <main id="main">
      <section className="store-hero">
        <div className="container store-hero-layout">
          <div className="store-hero-copy">
            <p className="eyebrow"><span />The official Void store</p>
            <h1>A little more Void.<br />A little more you.</h1>
            <p>A new space for your collection. Discover what’s next as the first official products take shape.</p>
            <div className="button-row">
              <ButtonLink href="#collection" icon="chevron">Explore the collection</ButtonLink>
              <Badge gold>{catalog.products.length ? 'Official collection' : 'Coming soon'}</Badge>
            </div>
          </div>
          <div className="store-art" aria-hidden="true"><VoidScene /></div>
        </div>
      </section>
      <div className="container store-strip">
        <span><Package />Official products, when released</span>
        <span><LockKeyhole />Checkout hosted by Stripe</span>
        <span><UserRound />Connected to your Void account</span>
      </div>
      <section id="collection" className="container content-body store-collection">
        <SectionHeading title="The next part of your story." description="Find your favorites. Every product here comes with clear details and honest availability.">
          <a className="text-link" href={`${site.urls.account}/purchases`}>Your purchases <ArrowUpRight size={14} /></a>
        </SectionHeading>
        <ProductGrid {...catalog} />
      </section>
    </main>
  );
}
